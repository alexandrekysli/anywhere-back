import path from "path"

import { ConfigType } from "../../config"
import Adlogs from "#core/adlogs/index.js"
import IPairingEventRepository from "#app/repositories/IPairingEventRepository.js"
import IPairingRepository from "#app/repositories/IPairingRepository.js"
import IPairingTripRepository from "#app/repositories/IPairingTripRepository.js"
import ITrackerRepository from "#app/repositories/ITrackerRepository.js"
import Utils from "#utils/index.js"
import ITrackerDevice from "./ITrackerDevice"
import { Server } from "http"

import { Server as ServerIO } from "socket.io"
import IUserRepository from "#app/repositories/IUserRepository.js"
import GetUserPairingList from "#app/services/get-user-pairing-list.js"
import ISubscriptionRepository from "#app/repositories/ISubscriptionRepository.js"
import IVehicleRepository from "#app/repositories/IVehicleRepository.js"
import GetPairingTrack from "#app/services/get-pairing-track.js"
import GetLastTrackData from "#app/services/get-last-track-data.js"
import AddNewPairingEvent from "#app/services/add-new-pairing-event.js"
import TripMaker from "./trip-maker"
import GetActiveSubscriptionVehicle from "#app/services/get-subscription-by-pairing-vehicle.js"
import PackageEntity from "#app/entities/package.js"
import UserEntity from "#app/entities/user.js"
import SMS from "#utils/external/sms/index.js"
import GetVehicle from "#app/services/get-vehicle.js"
import GetLocationName from "#app/services/get-location-name.js"
import IFenceAreaRepository from "#app/repositories/IFenceAreaRepository.js"
import GetFenceValue from "#app/services/get-fence-value.js"
import GetFenceArea from "#app/services/get-fence-area.js"
import GetLastPairingFenceValue from "#app/services/get-last-pairing-fence.js"


/** TS */
type NewTracker = { brand: string, model: string, sn: string, imei: string }

/**
 * # Tracking BOT 🤖
 * Versatile tracking device hub
 * ---
 * © 2024 BeTech CI
*/

class TrackingBot {
    private newTrackerList: NewTracker[] = []
    private trackerDeviceType: {[key: string]: ITrackerDevice } = {}
    private io?: ServerIO
    private services
    private sms
    private tripMaker
    private lockTrackerEffect = {
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
    private alertToNotify = ['sos', 'relay-on', 'speeding', 'suspicious-activity', 'impact', 'fence-in', 'fence-out']

    constructor(
        engineConfig: ConfigType,
        private adlogs: Adlogs,
        appLink: Server,
        userRepository: IUserRepository,
        vehicleRepository: IVehicleRepository,
        subscriptionrepository: ISubscriptionRepository,
        private trackerRepository: ITrackerRepository,
        private pairingRepository: IPairingRepository,
        pairingEventRepository: IPairingEventRepository,
        pairingTripRepository: IPairingTripRepository,
        fenceAreaRepository: IFenceAreaRepository
    ){
        /** ### Load Services ### */
        this.services = {
            getUserPairingList: new GetUserPairingList(adlogs, userRepository, subscriptionrepository, vehicleRepository, pairingRepository),
            getPairingTrack: new GetPairingTrack(adlogs, pairingRepository, userRepository, subscriptionrepository),
            getLastTrackData: new GetLastTrackData(adlogs, pairingRepository, pairingEventRepository, fenceAreaRepository),
            addNewPairingEvent: new AddNewPairingEvent(adlogs, pairingEventRepository),
            getLocation: new GetLocationName(adlogs, pairingEventRepository),
            getActiveSubscriptionVehicle: new GetActiveSubscriptionVehicle(adlogs, subscriptionrepository),
            getVehicle: new GetVehicle(adlogs, vehicleRepository, subscriptionrepository),
            getFenceArea: new GetFenceArea(adlogs, pairingRepository, fenceAreaRepository),
            getFenceValue: new GetFenceValue(adlogs, pairingRepository, fenceAreaRepository),
            getLastPairingFenceValue: new GetLastPairingFenceValue(pairingEventRepository)
        }
        this.sms = new SMS(adlogs)

        // -> Start WS Server
        this.tripMaker = new TripMaker(engineConfig.infrastructure.tracking_bot.trip_limit, adlogs, pairingTripRepository)
        this.makeWS(appLink)

        // -> Start Tracker Device Server
        const fullDevicesDirectoryPath = path.join(engineConfig.root, engineConfig.infrastructure.tracking_bot.devices_directory)
        const trackerDevicesList = Utils.getFolderContentSync(fullDevicesDirectoryPath, 1, true, true)
        Array.isArray(trackerDevicesList) && trackerDevicesList.forEach(async device => {
            const devicePath = path.join(fullDevicesDirectoryPath, device.name)
            try {
                const deviceClass = (await import(devicePath)).default.default
                const newDeviceType = new deviceClass(adlogs, this.newTrackerEvent) as ITrackerDevice
                this.trackerDeviceType[path.parse(device.name).name] = newDeviceType
            } catch (error) {
                // -> Bad tracking_bot device file repository
                this.adlogs.writeRuntimeEvent({
                    category: 'app',
                    type: 'stop',
                    message: `bad tracking bot device file at < ${devicePath} >`,
                    save: true
                })
            }
        })

        this.setListener()
    }

    private makeWS = (httpServer: Server) => {
        this.io = new ServerIO(httpServer, { cors: { origin: '*'} })
        this.io.on('connection', socket => {
            // -> WS Event wrapper
            socket.on('get-new-tracker', () => {
                socket.emit('new-tracker', this.newTrackerList)
            })
            socket.on('get-pairing-list', async (userID: string) => {
                const pairingList = (await this.services.getUserPairingList.execute(userID)).list
                socket.emit('pairing-list', pairingList)
            })
            socket.on('get-pairing-data', async (id: string) => {
                const pairingTrack = await this.services.getPairingTrack.execute(id)
                socket.emit('pairing-data', { id: id, data: pairingTrack })
            })
            socket.on('get-last-track-event', async (id: string) => {
                const lastTrackEvent = await this.services.getLastTrackData.execute(id)
                socket.emit('track-event', { id: id, data: lastTrackEvent })
            })
            socket.on('get-new-pairing-fence', async (id: string) => {
                const fenceArea = await this.services.getFenceArea.execute(id)
                this.io?.emit('new-pairing-fence', { id: id, data: fenceArea })
            })
        })
    }

    private setListener = () => {
        this.adlogs.hub.addListener('new-tracker-insert', (imei: string) => {
            const index = this.newTrackerList.findIndex(x => x.imei === imei)
            this.newTrackerList.splice(index, 1)
        })
        this.adlogs.hub.addListener('send-track-event', async (pairingID: string) => {
            const lastTrackEvent = await this.services.getLastTrackData.execute(pairingID)
            this.io?.emit('track-event', { id: pairingID, data: lastTrackEvent })
        })
        this.adlogs.hub.addListener('change-tracker-relay-state', async (data: { brand: string, imei: string, state: string }) => {
            if(data.state) this.trackerDeviceType[data.brand.toLowerCase()].exeCommand(data.imei, 'relay-on')
            else this.trackerDeviceType[data.brand.toLowerCase()].exeCommand(data.imei, 'relay-off')
        })
    }

    private newTrackerEvent = async (data: TrackerMessage) => {
        //-> Retrieve tracker in db
        if(data.event !== 'command-response' && data.state){
            const tracker = await this.trackerRepository.getTrackerByIMEI(data.imei)
            if(tracker.data && this.io){
                // -> Saved tracker -> Retrieve pairing
                const pairing = (await this.pairingRepository.getHeathlyPairingbyTracker(tracker.data.id || '')).data
                if(pairing){
                    // -> Retrieve pairing vehicle active subscription
                    const subscription = await this.services.getActiveSubscriptionVehicle.execute(pairing.vehicle.toString())
                    const vehicle = await this.services.getVehicle.execute(pairing.vehicle.toString())
                    if(
                        subscription &&
                        subscription._package instanceof PackageEntity && 
                        subscription.customer instanceof UserEntity &&
                        vehicle
                    ){
                        // -> Save Pairing last state
                        const nowTime = Date.now()
                        this.pairingRepository.setPairingLastStateDate(pairing.id || '', nowTime)
                        this.io.emit('track-ping', {
                            id: pairing.id || '',
                            date: nowTime,
                            powered: data.state.device.battery.powered,
                            network_signal: data.state.device.network.signal,
                            gps: data.state.gps !== undefined,
                            io: { relay: data.state.io.relay, buzzer: data.state.io.buzzer}
                        })

                        // -> Dynamic alert check
                        // -> Speeding
                        if(
                            subscription._package.allowed_option.includes('Survitesse') &&
                            data.state.gps && 
                            data.state.gps.speed > vehicle.max_speed
                        ) data.event === 'speeding'
                        
                        // -> GeoFence
                        let fenceValue: TrackData['fence_value'] = ''
                        if(
                            subscription._package.allowed_option.includes('Geofence') &&
                            pairing.geofence !== '' &&
                            data.state.gps
                        ){
                            const actualPosition = data.state.gps.coordinates
                            const lastEventFenceValue = (await this.services.getLastPairingFenceValue.execute(pairing.id || '')).value
                            
                            if(lastEventFenceValue){
                                fenceValue = (await this.services.getFenceValue.execute(pairing.id || '', actualPosition)).value                              
                                if(fenceValue && fenceValue !== lastEventFenceValue) data.event = fenceValue === 'in' ? 'fence-in' : 'fence-out'
                            }
                        }
                        
                        // -> Check and save PairingEvent
                        const option = this.lockTrackerEffect[data.event as keyof typeof this.lockTrackerEffect]
                        const pass = !(option && !subscription._package.allowed_option.includes(option))

                        if(pass){
                            const result = await this.services.addNewPairingEvent.execute(pairing.id || '', data, fenceValue)
                            
                            if(result){
                                this.io.emit('track-event', { id: pairing.id, data: result })
                                this.tripMaker.newPairingEvent(pairing.id || '', result)

                                if(this.alertToNotify.includes(data.event)){
                                    const location = result.location || (await this.services.getLocation.execute(result.id)).name
                                    
                                    // -> Alert to notify detect
                                    if(location){
                                        // -> Mail
                                        if(subscription._package.allowed_option.includes('Email')){
                                        }
                                        // -> SMS
                                        if(subscription._package.allowed_option.includes('SMS')){
                                            /* if(data.event === 'sos') this.sms.sendTrackAlertSOS(subscription.customer.phone, vehicle.brand + ' ' + vehicle.model, vehicle.numberplate, location)
                                            else if(data.event === 'relay-on') this.sms.sendTrackAlertRelay(subscription.customer.phone, vehicle.brand + ' ' + vehicle.model, vehicle.numberplate)
                                            else if(data.event === 'speeding') this.sms.sendTrackAlertSpeeding(subscription.customer.phone, vehicle.brand + ' ' + vehicle.model, vehicle.numberplate, result.speed, vehicle.max_speed)
                                            else if(data.event === 'suspicious-activity') this.sms.sendTrackAlertSuspiciousActivity(subscription.customer.phone, vehicle.brand + ' ' + vehicle.model, vehicle.numberplate)
                                            else if(data.event === 'impact') this.sms.sendTrackAlertImpact(subscription.customer.phone, vehicle.brand + ' ' + vehicle.model, vehicle.numberplate, location)
                                            else if(data.event === 'fence-in') this.sms.sendTrackAlertFenceIn(subscription.customer.phone, vehicle.brand + ' ' + vehicle.model, vehicle.numberplate, location)
                                            else if(data.event === 'fence-out') this.sms.sendTrackAlertFenceOut(subscription.customer.phone, vehicle.brand + ' ' + vehicle.model, vehicle.numberplate, location) */
                                        }
                                    }
                                }
                            }
                        }else{
                            this.adlogs.writeRuntimeEvent({
                                category: 'app',
                                type: 'warning',
                                message: `cannot save event < ${data.event} > because is unavailable on pairing < ${pairing.id} > actual subscription package`
                            })
                        }
                    }
                }
            }else{
                // -> New tracker
                if(this.newTrackerList.findIndex(x => x.imei === data.imei) === -1){
                    this.trackerDeviceType[data.brand].exeCommand(data.imei, 'device-info')
                }
            }
        }else if(data.response){
            if(data.response.name === 'device-info'){
                if(this.newTrackerList.findIndex(x => x.imei === data.imei) === -1){
                    const trackerInfo = data.response.data as { sn: string, model: string }
                    const tracker = {
                        brand: data.brand.toUpperCase(),
                        model: trackerInfo.model,
                        imei: data.imei,
                        sn: trackerInfo.sn
                    }
                    this.newTrackerList.push(tracker)
                    this.io && this.io.emit('new-tracker', [tracker])
                }
            }
        }
    }
}

export default TrackingBot