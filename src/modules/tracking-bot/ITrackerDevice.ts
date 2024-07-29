import adlogs from "#core/adlogs/index.js"

interface ITrackerDevice {
    port: number
    adlogs: adlogs
    onNewEvent: (data: TrackerMessage) => any
    makeServer(): void
    decodeMessage(data: string): any
    encodeMessage(...args: any): any
    checkMessage(message: any): TrackerMessage | null
    exeCommand(imei: string, name: 'device-info' | 'cut-output' | 'start-output'): void
}

export default ITrackerDevice