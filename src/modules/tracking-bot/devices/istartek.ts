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
        3: 'acc-on',
        4: 'acc-off',
        20: 'low-battery',
        32: 'power-on',
        33: 'power-off',
        22: 'speeding',
        111: 'suspicious-activity',
        42: 'impact'
    }
    private commandStack: {imei: string, code: number, cmd: string}[] = []
    private trackerTwoLastState: {imei: string, state: { powered: boolean, relay: boolean, buzzer: boolean }[]}[] = []

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
                        date: 0,
                        brand: 'istartek',
                        imei: message.imei,
                        event: 'command-response',
                        response: {
                            name: 'device-info',
                            data: {
                                sn: message.cmd_data[0],
                                model: message.cmd_data[2].replace(/_V(([0-9]|[a-z])+)/gi, '').replace(/_/gi, ' ')
                            }
                        }
                    })
                }else{
                    console.log(message);
                    
                }
            }
        }else{
            // -> Tracker event response
            let eventName = (this.eventCode[message.alm_code as keyof typeof this.eventCode] || 'state') as TrackerMessage['event']
            
            // -> TwoLastState check
            const trackerTWS = this.trackerTwoLastState.filter(x => x.imei === message.imei)[0]            
            if(trackerTWS){
                if(trackerTWS.state.length === 2) trackerTWS.state.shift()
                trackerTWS.state.push({ powered: message.status.powered, relay: message.output[0], buzzer: message.output[1] })

                if(trackerTWS.state[0].powered !== trackerTWS.state[1].powered){
                    // -> Powered state change
                    eventName = trackerTWS.state[0].powered ? 'unpowered' : 'powered'
                }else if(trackerTWS.state[0].relay !== trackerTWS.state[1].relay){
                    // -> Relay state change
                    eventName = trackerTWS.state[0].relay ? 'relay-off' : 'relay-on'
                }else if(trackerTWS.state[0].buzzer !== trackerTWS.state[1].buzzer){
                    // -> Buzzer state change
                    eventName = trackerTWS.state[0].buzzer ? 'buzzer-off' : 'buzzer-on'
                }
            }else{
                this.trackerTwoLastState.push({ imei: message.imei, state: [{ powered: message.status.powered, relay: message.output[0], buzzer: message.output[1] }] })
            }

            this.onNewEvent({
                date: this.convertDate(message.date),
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
                            powered: message.status.powered
                        },
                        network: { signal: message.status.gsm < 100 ? message.status.gsm : 100 }
                    },
                    io: {
                        acc: message.input[1],
                        relay: message.output[0],
                        buzzer: false
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

    async exeCommand(imei: string, name: "device-info" | "relay-on" | "relay-off"){
        if(name === 'device-info') this.commandStack.push({ imei: imei, code: 801, cmd: '' })
        else if(name === 'relay-on') this.commandStack.push({ imei: imei, code: 900, cmd: '1,1,0,0' })
        else if(name === 'relay-off') this.commandStack.push({ imei: imei, code: 900, cmd: '1,0,0,0' })
    }

    // -> Inbuilt method
    private checksum = (value: string) => {
        let checksum = 0
        for (let i = 0; i < value.length; i++) checksum += value.charCodeAt(i)
        return checksum.toString(16).toUpperCase().slice(-2)
    }

    private convertDate = (value: string) => {
        if(value.length === 12){
            const date = new Date()
            date.setFullYear(
                Number('20' + value.slice(0,2)),
                Number(value.slice(2,4)) - 1,
                Number(value.slice(4,6))
            )
            date.setHours(
                Number(value.slice(6,8)),
                Number(value.slice(8,10)),
                Number(value.slice(10,12))
            )

            return date.getTime()
        }
        return 0
    }
}
export default iStartekTrackerDevice