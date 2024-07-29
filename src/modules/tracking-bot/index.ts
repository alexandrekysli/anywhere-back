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

    constructor(
        private engineConfig: ConfigType,
        private adlogs: Adlogs,
        appLink: Server,
        private archange: Archange,
        private trackerRepository: ITrackerRepository,
        private pairingRepository: IPairingRepository,
        private pairingEventRepository: IPairingEventRepository,
        private pairingTripRepository: IPairingTripRepository
    ){
        this.makeWS(appLink)

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
        })
    }

    private setListener = () => {
        this.adlogs.hub.addListener('new-tracker-insert', (imei: string) => {
            const index = this.newTrackerList.findIndex(x => x.imei === imei)
            this.newTrackerList.splice(index, 1)
        })
    }

    private newTrackerEvent = async (data: TrackerMessage) => {
        //-> Retrieve tracker in db
        if(data.event !== 'command_response'){
            const tracker = await this.trackerRepository.getTrackerByIMEI(data.imei)
            if(tracker.data){
                // -> Saved tracker
            }else{
                // -> New tracker
                if(this.newTrackerList.findIndex(x => x.imei === data.imei) === -1){
                    this.trackerDeviceType[data.brand].exeCommand(data.imei, 'device-info')
                }
            }
        }else if(data.response){
            if(data.response.name === 'device_info'){
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