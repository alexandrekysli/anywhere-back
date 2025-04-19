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
import SMS from "#utils/external/sms/index.js"
import IFenceAreaRepository from "#app/repositories/IFenceAreaRepository.js"
import Email from "#utils/external/email/index.js"
import AnyTracker from "./AnyTracker"
import TrackerEntity from "#app/entities/tracker.js"
import TripMaker from "./trip-maker"

/**
 * # Tracking BOT 🤖
 * Versatile tracking device hub
 * ---
 * © 2024 BeTech CI
*/

class TrackingBot {
    private sms
    private email

    private anyTrackerLoadState = false
    private anyTrackerList: AnyTracker[] = []
    private trackerDeviceType: {[key: string]: ITrackerDevice } = {}
    private io?: ServerIO
    private services
    private tripMaker
    private move = false

    constructor(
        engineConfig: ConfigType,
        private adlogs: Adlogs,
        appLink: Server,
        private userRepository: IUserRepository,
        private vehicleRepository: IVehicleRepository,
        private subscriptionrepository: ISubscriptionRepository,
        private trackerRepository: ITrackerRepository,
        private pairingRepository: IPairingRepository,
        private pairingEventRepository: IPairingEventRepository,
        pairingTripRepository: IPairingTripRepository,
        private fenceAreaRepository: IFenceAreaRepository
    ){
        /** ### Load Services ### */
        this.sms = new SMS(adlogs)
        this.email = new Email(adlogs)
        this.services = {
            getUserPairingList: new GetUserPairingList(adlogs, userRepository, subscriptionrepository, vehicleRepository, pairingRepository)
        }

        // -> Start WS Server
        this.tripMaker = new TripMaker(adlogs, pairingTripRepository)
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

        // -> Load existing AnyTracker with old db pairing
        this.loadAnyTrackers()
        this.setListener()
    }

    private loadAnyTrackers = async () => {
        if(this.io){
            const pairings = (await this.pairingRepository.getAllPairing(true)).data
            if(pairings){
                for (const pairing of pairings) {
                    if(pairing.event_list.length){
                        const tracker = pairing.tracker as TrackerEntity
                        const newAnyTracker = new AnyTracker(
                            this.adlogs,
                            this.io,
                            this.email,
                            this.sms,
                            this.pairingRepository,
                            this.trackerRepository,
                            this.trackerDeviceType[tracker.brand.toLowerCase()],
                            this.userRepository,
                            this.pairingEventRepository,
                            this.subscriptionrepository,
                            this.vehicleRepository,
                            this.fenceAreaRepository,
                            this.tripMaker
                        )
                        this.anyTrackerList.push(newAnyTracker)
                        await newAnyTracker.initialize('', pairing)
                    }
                }
                this.anyTrackerLoadState = true
            }
        }
    }

    private makeWS = (httpServer: Server) => {
        this.io = new ServerIO(httpServer, { cors: { origin: '*'} })
        this.io.on('connection', socket => {
            // -> WS Event wrapper
            socket.on('get-new-tracker', () => {
                socket.emit('new-tracker', this.anyTrackerList.filter(x => x.registering === 0).map(x => {
                    return { brand: x.device.brand, model: x.device.model, sn: x.device.sn, imei: x.device.imei }
                }))
            })
            socket.on('get-pairing-list', async (userID: string) => {
                const pairingList = (await this.services.getUserPairingList.execute(userID)).list
                socket.emit('pairing-list', pairingList)
            })
            socket.on('get-pairing-data', async (id: string) => {
                const anyTracker = this.anyTrackerList.filter(x => x.pairingID === id)[0]
                if(anyTracker){
                    const pairingData = await anyTracker.getPairingData()
                    socket.emit('pairing-data', { id: id, data: pairingData })
                }
            })
        })
    }

    private setListener = () => {
        this.adlogs.hub.addListener('new-tracker-insert', (data: {imei: string, id: string}) => {
            const anyTracker = this.anyTrackerList.filter(x => x.device.imei === data.imei)[0]
            if(anyTracker){
                anyTracker.device.id = data.id
                anyTracker.registering = 1
            }
        })
        this.adlogs.hub.addListener('send-track-event', async (pairingID: string) => {
            const anyTracker = this.anyTrackerList.filter(x => x.pairingID === pairingID)[0]
            if(anyTracker) await anyTracker.cleanAllAlert()
        })
        this.adlogs.hub.addListener('change-tracker-relay-state', async (data: { pairingID: string, state: string }) => {
            const anyTracker = this.anyTrackerList.filter(x => x.pairingID === data.pairingID)[0]
            if(anyTracker) anyTracker.exeCommand(data.state ? 'relay-on': 'relay-off')
        })
    
        this.adlogs.hub.addListener('refresh-pairing', async (id: string) => {
            const anyTracker = this.anyTrackerList.filter(x => x.pairingID === id)[0]
            if(anyTracker) anyTracker.refreshTrackerLink()
        })

        this.adlogs.hub.addListener('tracker-removed', async (id: string) => {
            const anyTrackerIndex = this.anyTrackerList.findIndex(x => x.device.id === id)
            if(anyTrackerIndex !== -1) this.anyTrackerList.splice(anyTrackerIndex, 1)
        })
    }

    private newTrackerEvent = async (data: TrackerMessage) => {
        if(this.io && this.anyTrackerLoadState){
            const anyTracker = this.anyTrackerList.filter(x => x.device.imei === data.imei)[0]
            
            if(data.event !== 'command-response' && data.state){
                /* if(data.imei === '866069061516454' && data.state){
                    console.log((data.imei + ' > '), data.state.gps?.coordinates);
                    if(data.state.gps?.speed){
                        if(!this.move){
                            this.move = true
                            console.log('move !!!');
                        }
                    }else this.move = false
                } */

                if(anyTracker){
                    if(anyTracker.registering === 1){
                        // -> Already existing registered tracker
                        anyTracker.pushNewEvent(data.date, data.event, data.state)
                    }
                }else{
                    // -> New tracker link
                    const newAnyTracker = new AnyTracker(
                        this.adlogs,
                        this.io,
                        this.email,
                        this.sms,
                        this.pairingRepository,
                        this.trackerRepository,
                        this.trackerDeviceType[data.brand],
                        this.userRepository,
                        this.pairingEventRepository,
                        this.subscriptionrepository,
                        this.vehicleRepository,
                        this.fenceAreaRepository,
                        this.tripMaker
                    )
                    this.anyTrackerList.push(newAnyTracker)
                    await newAnyTracker.initialize(data.imei)
                    newAnyTracker.registering === 1 && newAnyTracker.pushNewEvent(data.date, data.event, data.state)
                }
            }else if(data.response && anyTracker){
                anyTracker.handleCommandResponse(data.response.name, data.response.data)
            }
        }
    }
}

export default TrackingBot