import { EventEmitter } from "node:events"

/** Types */
type RuntimeEvent = {
    type: 'stop' | 'warning' | 'info',
    date?: number,
    category: string,
    message: string
}

type EventMessageListenner = {
    message: string,
    callback: (data: RuntimeEvent) => void | undefined,
    oneCall: boolean
}

/**
 * # Adlogs
 * Advanced Logging System
 */

export default class {
    private hub = new EventEmitter()
    private runtimeEventMessageListennerList: Array<EventMessageListenner> = []

    constructor() {
        // -> Set listener
        this.hub.on('app-runtime', (data: RuntimeEvent) => {
            console.log(`${data.type === 'info' ? '🚀' : data.type === 'stop' ? '❌' : '⚠️'}`, data.message)

            if (data.type === "stop") {
                console.log('😓 Exit App')
                process.exit(1)
            }

            // -> Search on listennerList
            this.runtimeEventMessageListennerList.forEach((listenner, i) => {
                if (listenner.message === data.message) {
                    listenner.callback(data)
                    if (listenner.oneCall) this.runtimeEventMessageListennerList.splice(i, 1)
                }
            })
        })
    }

    /** Public methods */

    public writeRuntimeEvent = (data: RuntimeEvent) => {
        data.date = Date.now()
        this.hub.emit('app-runtime', data)
    }

    public listenRuntimeEventMessage = (
        message: string,
        callback: (data: RuntimeEvent) => void,
        oneCall: boolean
    ) => {
        this.runtimeEventMessageListennerList.push({
            callback: callback,
            oneCall: oneCall,
            message: message
        })
    }
}