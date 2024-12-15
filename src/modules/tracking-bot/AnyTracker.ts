import Config from "../../config"
import Utils from "#utils/index.js"

import Adlogs from "#core/adlogs/index.js"
import Email from "#utils/external/email/index.js"
import SMS from "#utils/external/sms/index.js"

import { Server as ServerIO } from "socket.io"


import SubscriptionEntity from "#app/entities/subscription.js"
import VehicleEntity from "#app/entities/vehicle.js"
import UserEntity from "#app/entities/user.js"
import PairingEntity from "#app/entities/pairing.js"
import TrackerEntity from "#app/entities/tracker.js"
import PackageEntity from "#app/entities/package.js"

import ITrackerDevice from "./ITrackerDevice"

import IPairingRepository from "#app/repositories/IPairingRepository.js"
import ITrackerRepository from "#app/repositories/ITrackerRepository.js"
import IPairingEventRepository from "#app/repositories/IPairingEventRepository.js"
import ISubscriptionRepository from "#app/repositories/ISubscriptionRepository.js"
import IVehicleRepository from "#app/repositories/IVehicleRepository.js"
import IFenceAreaRepository from "#app/repositories/IFenceAreaRepository.js"
import IUserRepository from "#app/repositories/IUserRepository.js"

import AddNewPairingEvent from "#app/services/add-new-pairing-event.js"
import GetLocationName from "#app/services/get-location-name.js"
import GetActiveSubscriptionVehicle from "#app/services/get-subscription-by-pairing-vehicle.js"
import GetVehicle from "#app/services/get-vehicle.js"
import GetFenceArea from "#app/services/get-fence-area.js"
import GetFenceValue from "#app/services/get-fence-value.js"
import GetLastPairingFenceValue from "#app/services/get-last-pairing-fence.js"
import GetLastTrackData from "#app/services/get-last-track-data.js"
import TripMaker from "./trip-maker"


const lockTrackerEffect = {
    'sos': 'SOS',
    'relay-on': 'Relais',
    'relay-off': 'Relais',
    'buzzer-on': 'Buzzer',
    'buzzer-off': 'Buzzer',
    'speeding': 'Survitesse',
    'suspicious-activity': 'Surveillance',
    'impact': 'Collision',
    'fence-in': 'Geofence',
    'fence-out': 'Geofence',
    'relay-lock': 'Relais',
    'relay-unlock': 'Relais',
    'buzzer-play': 'Buzzer',
    'buzzer-stop': 'Buzzer',
    'armed': 'Surveillance',
    'disarmed': 'Surveillance'
}
const alertToNotify = ['sos', 'relay-on', 'speeding', 'suspicious-activity', 'impact', 'fence-in', 'fence-out']
const softAlert = ['low-battery', 'power-on', 'power-off', 'relay-off', 'buzzer-off', 'fence-in', 'powered', 'unpowered', 'gps-lost', 'gps-found']

class AnyTracker {
    private config = Config.infrastructure.tracking_bot.anytracker
    private services
    private pairing?: PairingEntity
    private vehicle?: VehicleData
    private customer?: UserEntity
    private subscription?: SubscriptionEntity
    
    private actualAlertList: string[] = []
    private lastExchangeDate = { device: 0, server: 0 }
    private stateTimeout: { ghost?: NodeJS.Timeout, off?: NodeJS.Timeout } = {}
    
    public pairingID = ''
    public lastTrack?: TrackData
    public state?: PairingState
    public device = { id: '', brand: '', model: '', imei: '', sn: '' }
    public registering = -1
    public fenceArea: TrackData['fence']

    constructor(
        adlogs: Adlogs,
        private io: ServerIO,
        private email: Email,
        private sms: SMS,
        private pairingRepository: IPairingRepository,
        private trackerRepository: ITrackerRepository,
        public trackerDevice: ITrackerDevice,
        private userRepository: IUserRepository,
        pairingEventRepository: IPairingEventRepository,
        subscriptionrepository: ISubscriptionRepository,
        vehicleRepository: IVehicleRepository,
        fenceAreaRepository: IFenceAreaRepository,
        private tripMaker: TripMaker
    ){
        this.services = {
            addNewPairingEvent: new AddNewPairingEvent(adlogs, pairingEventRepository),
            getLocation: new GetLocationName(adlogs, pairingEventRepository),
            getActiveSubscriptionVehicle: new GetActiveSubscriptionVehicle(adlogs, subscriptionrepository),
            getVehicle: new GetVehicle(adlogs, vehicleRepository, subscriptionrepository),
            getFenceArea: new GetFenceArea(adlogs, pairingRepository, fenceAreaRepository),
            getFenceValue: new GetFenceValue(adlogs, pairingRepository, fenceAreaRepository),
            getLastPairingFenceValue: new GetLastPairingFenceValue(pairingEventRepository),
            getLastTrackData: new GetLastTrackData(adlogs, pairingRepository, pairingEventRepository)
        }
    }
    /*
     * ###
     * PRIVATE METHODS
     * ###
     */

    private setStateTimeout = (state: 'ghost' | 'off') => {
        //console.log(`new [ ${state} ] timeout for vehicle < ${this.vehicle?.numberplate} >`);
        clearTimeout(this.stateTimeout[state])
        this.stateTimeout[state] = setTimeout(() => {
            if(this.updatePairingState()) this.io.emit('track-event', { id: this.pairingID, data: this.makeEventTrack() })
        }, this.config.timeout[state] * 1000)
    }
    
    private getTrackerLink = async () => {
        if(!this.pairing){
            // -> Retrieve pairing by tracker
            this.pairing = (await this.pairingRepository.getHeathlyPairingbyTracker(this.device.id)).data || undefined
            if(this.pairing) this.pairingID = String(this.pairing.id)
        }

        if(this.pairing){
            const vehicleID = this.pairing.vehicle instanceof VehicleEntity ? String(this.pairing.vehicle.id) : String(this.pairing.vehicle)
            this.vehicle = await this.services.getVehicle.execute(vehicleID) || undefined
            this.subscription = await this.services.getActiveSubscriptionVehicle.execute(vehicleID) || undefined
            this.lastTrack = await this.services.getLastTrackData.execute(this.pairingID, false) || undefined
            
            if(this.lastTrack){
                //console.log(this.vehicle?.numberplate, new Date(this.lastTrack.date).toLocaleString())
                this.lastExchangeDate.server = this.lastTrack.date
                this.updatePairingState()

                const defaultGhostState = [undefined, 'unwatched', 'ghost']

                if(!defaultGhostState.includes(this.state)) this.setStateTimeout('ghost')
                if(this.state === 'move') this.setStateTimeout('off')
            }
            
            this.fenceArea = await this.services.getFenceArea.execute(this.pairingID)
            this.pushNewAlerts(this.lastTrack ? this.lastTrack.alert : [])

            if(this.vehicle){
                this.customer = (await this.userRepository.getUserByID(this.vehicle.customer_id)).data || undefined
            }
        }
    }

    private updatePairingState = () : boolean => {
        
        if(this.lastTrack && this.pairing){
            const oldState = this.state
            let newState: PairingState

            if(this.pairing.state === 'end' || !this.subscription){
                newState = 'unwatched'
            }else if(Utils.timestampDiff(Date.now(), this.lastExchangeDate.server, 'second') > this.config.timeout.ghost){
                // -> Min idle ghost mode reach -> switch to GHOST STATE
                newState = 'ghost'
            }else{
                if(this.actualAlertList.length){
                    newState = 'alert'
                }else if(this.lastTrack.speed && Utils.timestampDiff(Date.now(), this.lastTrack.date, 'second') <= this.config.timeout.off){
                    newState = 'move'
                }else{
                    newState = 'off'
                    this.lastTrack.speed = 0
                }
            }

            if(newState && newState !== oldState){
                console.log(`new state [ ${newState} ] detected for vehicle < ${this.vehicle?.numberplate} >`)
                this.state = newState
                return true
            }
        }
        return false
    }

    private pushNewAlerts = (alerts: string[]) => {
        const softAlertList: string[] = []
        alerts.forEach(alert => {
            if(softAlert.includes(alert)) softAlertList.push(alert)
            else if(!this.actualAlertList.includes(alert)) this.actualAlertList.push(alert)
        })

        if(softAlertList.length) this.io.emit('soft-alert', { id: this.pairingID || '', alerts: softAlertList })
    }

    private makeEventTrack = (): TrackData | undefined => {
        this.updatePairingState()
        if(this.lastTrack && this.state){
            this.lastTrack.date = this.lastExchangeDate.server
            this.lastTrack.state = this.state
            this.lastTrack.alert = this.actualAlertList
            return this.lastTrack
        }
        return undefined
    }

    private dynamicAlertCheck = async (state: TrackerMessage['state']): Promise<{ event?: TrackerMessage['event'], fence: TrackData['fence_value'] } | undefined> => {
        if(
            this.pairing
            && this.vehicle
            && this.subscription
            && this.subscription._package instanceof PackageEntity
            && state
            && state.gps
        ){
            let event: TrackerMessage['event']| undefined

            // -> Speeding detection
            if( this.subscription._package.allowed_option.includes('Survitesse') && state.gps.speed > this.vehicle.max_speed) event =  'speeding'
            
            // -> Geofence state detection
            let fenceValue: TrackData['fence_value'] = ''
            if(
                this.subscription._package.allowed_option.includes('Geofence') &&
                this.pairing.geofence !== ''
            ){
                const actualPosition = state.gps.coordinates
                const lastEventFenceValue = (await this.services.getLastPairingFenceValue.execute(this.pairingID || '')).value
                
                if(lastEventFenceValue){
                    fenceValue = (await this.services.getFenceValue.execute(this.pairingID || '', actualPosition)).value                              
                    if(fenceValue && fenceValue !== lastEventFenceValue) event = fenceValue === 'in' ? 'fence-in' : 'fence-out'
                }
            }

            return { event: event, fence: fenceValue }
        }
        return undefined
    }

    /*
     * ###
     * PUBLIC METHODS
     * ###
     */

    public initialize = async (imei: string, pairing?: PairingEntity) => {
        if(pairing && pairing.tracker instanceof TrackerEntity){
            // -> Initialisation by Pairing
            this.pairing = pairing
            this.pairingID = String(pairing.id)
            this.device.id = String(pairing.tracker.id)
            this.device.brand = pairing.tracker.brand
            this.device.model = pairing.tracker.model
            this.device.imei = pairing.tracker.imei
            this.device.sn = pairing.tracker.sn
            this.registering = 1

            await this.getTrackerLink()
        }else{
            // -> Initialisation by tracker
            // -> Check tracker existence
            const tracker = (await this.trackerRepository.getTrackerByIMEI(imei)).data
            if(tracker){
                this.device.id = String(tracker.id)
                this.device.brand = tracker.brand
                this.device.model = tracker.model
                this.device.imei = tracker.imei
                this.device.sn = tracker.sn
                this.registering = 1
            }else{
                // -> Not found -> retrieve tracker device info
                this.device.imei = imei
                this.trackerDevice.exeCommand(this.device.imei, 'device-info')
            }
        }
    }

    public pushNewEvent = async (date: TrackerMessage['date'], event: TrackerMessage['event'], state: TrackerMessage['state']) => {
        if(state){
            if(!this.pairing) await this.getTrackerLink()
            if(this.pairing && this.vehicle && this.customer){
                if(this.pairing.state === 'heathly'){
                    if(
                        this.subscription
                        && this.subscription._package instanceof PackageEntity
                        && this.subscription.status
                    ){
                        let live = false
                        if(date > this.lastExchangeDate.device){
                            this.lastExchangeDate.device = date
                            this.lastExchangeDate.server = Date.now()
                            live = true
                        }

                        if(live){
                            this.pairingRepository.setPairingLastStateDate(this.pairingID, this.lastExchangeDate.server)
                            this.setStateTimeout('ghost')
                            this.updatePairingState()
                            this.io.emit('track-ping', {
                                id: this.pairingID || '',
                                state: this.state,
                                date: this.lastExchangeDate.server,
                                powered: state.device.battery.powered,
                                network_signal: state.device.network.signal,
                                gps: state.gps !== undefined,
                                io: { relay: state.io.relay, buzzer: state.io.buzzer}
                            })
                        }

                        //console.log('❤️ ' + this.vehicle.numberplate + ' > ' + new Date(date).toLocaleString());
                        
                        // -> Save event when subscription is only actual
                        if(this.subscription.status() === 'actual'){
                            // -> Check and save PairingEvent
                            let parsedEvent = await this.dynamicAlertCheck(state)

                            const option = lockTrackerEffect[event as keyof typeof lockTrackerEffect]
                            const pass = !(option && !this.subscription._package.allowed_option.includes(option))

                            if(pass){
                                const result = await this.services.addNewPairingEvent.execute(this.pairingID, live ? this.lastExchangeDate.server : this.lastExchangeDate.device, parsedEvent?.event || event, state, parsedEvent?.fence || '')
                                if(result){
                                    this.lastTrack = result
                                    this.pushNewAlerts(this.lastTrack ? this.lastTrack.alert : [])
                                    
                                    this.io.emit('track-event', { id: this.pairingID, data: this.makeEventTrack() })

                                    this.state === 'move' && this.setStateTimeout('off')
                                    this.tripMaker.newPairingEvent(this.pairingID, this.lastTrack, live)                                

                                    if(alertToNotify.includes(event)){
                                        const location = result.location || (await this.services.getLocation.execute(result.id)).name
                                        // -> Alert to notify detect
                                        if(location){
                                            const vehicleFullModel = this.vehicle.brand + ' ' + this.vehicle.model
                                            // -> Mail
                                            if(this.subscription._package.allowed_option.includes('Email')){
                                                if(event === 'sos') this.email.sendVehicleAlertSOS(this.customer.phone, vehicleFullModel, this.vehicle.numberplate, location)
                                                else if(event === 'relay-on') this.email.sendVehicleAlertEngineLock(this.customer.phone, vehicleFullModel, this.vehicle.numberplate, location)
                                                else if(event === 'speeding') this.email.sendVehicleAlertOverspeed(this.customer.phone, vehicleFullModel, this.vehicle.numberplate, result.speed, this.vehicle.max_speed, location)
                                                else if(event === 'suspicious-activity') this.email.sendVehicleAlertAntiTheft(this.customer.phone, vehicleFullModel, this.vehicle.numberplate, location)
                                                else if(event === 'impact') this.email.sendVehicleAlertImpact(this.customer.phone, vehicleFullModel, this.vehicle.numberplate, location)
                                                else if(['fence-in', 'fence-out'].includes(event) && this.fenceArea){
                                                    this.email.sendVehicleAlertFence(this.customer.phone, vehicleFullModel, this.vehicle.numberplate, event === 'fence-in' ? 'entré' : 'sorti', location, this.fenceArea.name)
                                                }
                                            }
                                            // -> SMS
                                            if(this.subscription._package.allowed_option.includes('SMS')){
                                                if(event === 'sos') this.sms.sendVehicleAlertSOS(this.customer.phone, vehicleFullModel, this.vehicle.numberplate, location)
                                                else if(event === 'relay-on') this.sms.sendVehicleAlertEngineLock(this.customer.phone, vehicleFullModel, this.vehicle.numberplate, location)
                                                else if(event === 'speeding') this.sms.sendVehicleAlertOverspeed(this.customer.phone, vehicleFullModel, this.vehicle.numberplate, result.speed, this.vehicle.max_speed, location)
                                                else if(event === 'suspicious-activity') this.sms.sendVehicleAlertAntiTheft(this.customer.phone, vehicleFullModel, this.vehicle.numberplate, location)
                                                else if(event === 'impact') this.sms.sendVehicleAlertImpact(this.customer.phone, vehicleFullModel, this.vehicle.numberplate, location)
                                                else if(['fence-in', 'fence-out'].includes(event) && this.fenceArea){
                                                    this.sms.sendVehicleAlertFence(this.customer.phone, vehicleFullModel, this.vehicle.numberplate, event === 'fence-in' ? 'entré' : 'sorti', location, this.fenceArea.name)
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }  
    }

    public handleCommandResponse = async (name: TrackerResponse['name'], data: TrackerResponse['data']) => {
        if(name === 'device-info'){
            console.log('> new tracker data < ', data);
            
            const trackerInfo = data as { sn: string, model: string, brand: string }
            this.device.brand = trackerInfo.brand.toUpperCase()
            this.device.model = trackerInfo.model
            this.device.sn = trackerInfo.sn
            this.registering = 0
            this.io.emit('new-tracker', [this.device])
        }else{
            console.log('🤖 > ' + name)
            console.log(data);
        }
    }

    public getPairingData = async () => {
        const manager = (await this.userRepository.getUserByID(String(this.customer?.manager.toString()))).data
        if(this.pairing && this.vehicle && this.customer && manager){            
            return {
                about: {
                    pairing: {
                        id: this.pairingID,
                        name: this.pairing.identifier,
                        begin_date: this.pairing.begin_date,
                        end_date: this.pairing.end_date,
                        state: this.pairing.state
                    },
                    vehicle: {
                        id: String(this.vehicle.id),
                        numberplate: this.vehicle.numberplate,
                        type: this.vehicle.type,
                        model: this.vehicle.brand + ' ' + this.vehicle.model,
                        group: this.vehicle.group,
                        driver: this.vehicle.driver,
                        max_speed: this.vehicle.max_speed,
                        fence: this.fenceArea
                    },
                    tracker: {
                        id: this.device.id,
                        imei: this.device.imei,
                        model: this.device.brand + ' ' + this.device.model
                    },
                    subscription: this.subscription ? {
                        package: this.subscription._package instanceof PackageEntity ? this.subscription._package.name : '#',
                        allowed_option: this.subscription._package instanceof PackageEntity ? this.subscription._package.allowed_option : [],
                        state: this.subscription.status ? this.subscription.status() : 'end',
                        end_date: this.subscription.endDate ? this.subscription.endDate() : 0
                    } : undefined,
                    customer: { id: String(this.customer.id), name: this.customer.surname + ' ' + this.customer.name },
                    manager: { id: String(manager.id), name: manager.surname + ' ' + manager.name }
                },
                last_event: this.makeEventTrack()
            }
        }else return null
    }

    public refreshTrackerLink = async () => {
        console.log('refresh ...');
        
        await this.getTrackerLink()
        this.io.emit('pairing-data', { id: this.pairingID, data: await this.getPairingData() })
    }  

    public cleanAllAlert = async () => {
        this.actualAlertList = []
        this.lastTrack = await this.services.getLastTrackData.execute(this.pairingID) || undefined
        this.fenceArea = await this.services.getFenceArea.execute(this.pairingID)
        this.pushNewAlerts(this.lastTrack ? this.lastTrack.alert : [])
        this.io.emit('track-event', { id: this.pairingID, data: this.makeEventTrack() })
    }

    public exeCommand = (name: TrackerCommand) => {
        this.trackerDevice.exeCommand(this.device.imei, name)
    }
}

export default AnyTracker