import net from "node:net"

import Adlogs from "#core/adlogs/index.js"
import ITrackerDevice from "../ITrackerDevice"

/** TS */
type StartekTrackerEvent = {
    no: string,
    len: number,
    imei: string,
    cmd_code: number,
    alm_code: number,
    alm_data: string,
    date: string,
    gps: {
        state: boolean,
        data: {
            coordinates: { lat: number, lng: number },
            sat_qte: number,
            hdop: number,
            speed: number,
            orientation: number,
            altitude: number,
            odometer: number
        }
    },
    network: { mcc: string, mnc: string },
    status: {
        gsm: number,
        gprs1: boolean,
        gprs2: boolean,
        gps: { positionning: boolean, antenna: boolean },
        powered: boolean,
        stop: boolean,
        armed: boolean,
        rfid: boolean
    },
    input: [boolean, boolean],
    output: [boolean, boolean],
    voltage: { external: number, battery: number }
    checksum: string
}
type StartekTrackerResponse = {
    no: string,
    len: number,
    imei: string,
    cmd_code: number,
    cmd_data: string[]
}

class iStartekTrackerDevice implements ITrackerDevice {
    public port = 9091
    private eventCode = {
        0: 'state',
        1: 'sos',
        3: 'acc_on',
        4: 'acc_off',
        32: 'power_on',
        33: 'power_off',
        22: 'speeding',
        111: 'suspicious_activity',
        42: 'impact'
    }
    private commandStack: {imei: string, code: number, cmd: string}[] = []

    constructor(public adlogs: Adlogs, public onNewEvent: (data: TrackerMessage) => any){
        this.makeServer()
    }

    public decodeMessage(data: string): StartekTrackerEvent | StartekTrackerResponse | null {
        if(data.slice(0, 2) == '&&'){
            const dataPart = data.replace(/&&/, '').replace(/&&|\r\n/g, '').split(',')

            if(dataPart.length >= 20){
                const networkPart = dataPart[15].split('|')
                const devicePart = parseInt(dataPart[17], 16).toString(2).padStart(8, '0')
                const inputPart = parseInt(dataPart[18], 16).toString(2).padStart(4, '0')
                const outputPart = parseInt(dataPart[19], 16).toString(2).padStart(4, '0')
                const voltagePart = dataPart[20].split('|')

                const startekEvent: StartekTrackerEvent = {
                    no: dataPart[0].slice(0,1),
                    len: Number(dataPart[0].slice(1)),
                    imei: dataPart[1],
                    cmd_code: Number(dataPart[2]),
                    alm_code: Number(dataPart[3]),
                    alm_data: dataPart[4],
                    date: dataPart[5],
                    gps: {
                        state: dataPart[6] === 'A',
                        data: {
                            coordinates: { lat: parseFloat(dataPart[7]), lng: parseFloat(dataPart[8]) },
                            sat_qte: parseInt(dataPart[9], 10),
                            hdop: parseFloat(dataPart[10]),
                            speed: parseInt(dataPart[11], 10),
                            orientation: parseInt(dataPart[12], 10),
                            altitude: parseInt(dataPart[13], 10),
                            odometer: parseInt(dataPart[14], 10)
                        }
                    },
                    network: { mcc: networkPart[0], mnc: networkPart[1] },
                    status: {
                        gsm: (parseFloat(dataPart[16]) / 31) * 100,
                        gprs1: devicePart[7] === '1',
                        gprs2: devicePart[6] === '1',
                        gps: { positionning: devicePart[5] === '1', antenna: devicePart[3] === '1' },
                        powered: devicePart[4] === '1',
                        stop: devicePart[2] === '1',
                        armed: devicePart[1] === '1',
                        rfid: devicePart[0] === '1'
                    },
                    input: [inputPart[3] === '1', inputPart[2] === '1'],
                    output: [outputPart[3] === '1', outputPart[2] === '1'],
                    voltage: {
                        external: Number(parseInt(voltagePart[0], 16).toString(10)) / 100,
                        battery: Number(parseInt(voltagePart[1], 16).toString(10)) / 100,
                    },
                    checksum: dataPart[dataPart.length - 1]
                }
                return startekEvent
            }else{
                return {
                    no: dataPart[0].slice(0,1),
                    len: Number(dataPart[0].slice(1)),
                    imei: dataPart[1],
                    cmd_code: Number(dataPart[2]),
                    cmd_data: dataPart.filter((x, i) => i > 2 && i < dataPart.length).map(x => x)
                }
            }
        }
        return null
    }

    public encodeMessage(imei: string, packet: string, code: number, data?: string): string {
        let msg = ',' + imei + ',' + code + (data ? `,${data}` : '')
        msg = '$$' + packet + msg.length + msg
        return msg + this.checksum(msg) + '\r\n'
    }

    public checkMessage(message: StartekTrackerEvent | StartekTrackerResponse): TrackerMessage | null {
        if('cmd_data' in message){
            // -> Tracker command response
            const indexs = this.commandStack.map((x, i) => (x.imei === message.imei && x.code === message.cmd_code) ? i : -1).filter(x => x >= 0)
            if(indexs.length){
                indexs.forEach(x => this.commandStack.splice(x, 1))
                if(message.cmd_code === 801) {
                    this.onNewEvent({ 
                        brand: 'istartek',
                        imei: message.imei,
                        event: 'command_response',
                        response: {
                            name: 'device_info',
                            data: {
                                sn: message.cmd_data[0],
                                model: message.cmd_data[2].replace(/_V(([0-9]|[a-z])+)/gi, '').replace(/_/gi, ' ')
                            }
                        }
                    })
                }
            }
        }else{
            // -> Tracker event response
            const eventName = (this.eventCode[message.alm_code as keyof typeof this.eventCode] || 'state') as TrackerMessage['event']

            this.onNewEvent({
                brand: 'istartek',
                imei: message.imei,
                event: eventName,
                state: {
                    move: message.status.stop === false,
                    gps: message.gps.state && {
                        coordinates: message.gps.data.coordinates,
                        altitude: message.gps.data.altitude,
                        odometer: message.gps.data.odometer,
                        orientation: message.gps.data.orientation,
                        speed: message.gps.data.speed
                    } || undefined,
                    device: {
                        battery: {
                            low: message.alm_code === 20,
                            powered: message.status.powered
                        },
                        network: { signal: message.status.gsm }
                    },
                    io: {
                        acc: message.input[1],
                        relay: message.output[0]
                    }
                }
            })

        }
        return null
    }

    public makeServer(): void {
        const server = net.createServer()
        server.on('connection', socket => {
            this.adlogs.writeRuntimeEvent({
                category: 'app',
                type: 'info',
                message: 'istartek device connect with ip ' + socket.remoteAddress
            })
            
            socket.on('data', (data) => {
                const eventData = this.decodeMessage(data.toString())
                if(eventData){
                    this.checkMessage(eventData)
                    const index = this.commandStack.findIndex(x => x.imei === eventData.imei)
                    if(index !== -1) socket.write(this.encodeMessage(eventData.imei, eventData.no, this.commandStack[index].code, this.commandStack[index].cmd))
                }
            })
        })

        server.on('error', err => {
            this.adlogs.writeRuntimeEvent({
                category: 'app',
                type: 'stop',
                message: `iStartekTrackerDevice net server catch error < ${err.message} >`
            })
        })

        server.listen(this.port, () => {
            this.adlogs.writeRuntimeEvent({
                category: 'app',
                type: 'info',
                message: `istartek tracking server has correctly start at < :${this.port} >`
            })
        })
    }

    async exeCommand(imei: string, name: "device-info" | "cut-output" | "start-output"){
        if(name === 'device-info') this.commandStack.push({ imei: imei, code: 801, cmd: '' })
    }

    // -> Inbuilt method
    private checksum = (value: string) => {
        let checksum = 0
        for (let i = 0; i < value.length; i++) checksum += value.charCodeAt(i)
        return checksum.toString(16).toUpperCase().slice(-2)
    }
}
export default iStartekTrackerDevice