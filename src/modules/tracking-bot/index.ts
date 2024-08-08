import path from "path"

import { ConfigType } from "../../config"
import Adlogs from "#core/adlogs/index.js"
import Archange from "#core/archange/index.js"
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
import PairingEventEntity from "#app/entities/pairing-event.js"
import TripMaker from "./trip-maker"


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
    private tripMaker

    constructor(
        engineConfig: ConfigType,
        private adlogs: Adlogs,
        appLink: Server,
        private archange: Archange,
        userRepository: IUserRepository,
        vehicleRepository: IVehicleRepository,
        private subscriptionrepository: ISubscriptionRepository,
        private trackerRepository: ITrackerRepository,
        private pairingRepository: IPairingRepository,
        pairingEventRepository: IPairingEventRepository,
        pairingTripRepository: IPairingTripRepository
    ){
        /** ### Load Services ### */
        this.services = {
            getUserPairingList: new GetUserPairingList(adlogs, userRepository, subscriptionrepository, vehicleRepository, pairingRepository),
            getPairingTrack: new GetPairingTrack(adlogs, pairingRepository, userRepository, subscriptionrepository),
            getLastTrackData: new GetLastTrackData(adlogs, pairingEventRepository),
            addNewPairingEvent: new AddNewPairingEvent(adlogs, pairingEventRepository)
        }
        
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
    }

    private newTrackerEvent = async (data: TrackerMessage) => {
        //-> Retrieve tracker in db
        if(data.event !== 'command-response' && data.state){
            const tracker = await this.trackerRepository.getTrackerByIMEI(data.imei)
            if(tracker.data){
                // -> Saved tracker -> Retrieve pairing
                const pairing = (await this.pairingRepository.getHeathlyPairingbyTracker(tracker.data.id || '')).data
                if(pairing){
                    const result = await this.services.addNewPairingEvent.execute(pairing.id || '', data)
                    if(result){
                        this.io?.emit('track-event', { id: pairing.id, data: result })
                        const tripIndex = this.tripMaker.newPairingEvent(pairing.id || '', result)
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