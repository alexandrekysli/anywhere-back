import Repository from "./repositories/IAdlogsRepository"
import { EventEmitter } from "node:events"

/** Types */
type RuntimeEvent = {
    type: 'ready' | 'stop' | 'warning' | 'info',
    date?: number,
    category: 'global' | 'rock' | 'archange' | 'heaven' | 'app',
    message: string,
    save?: boolean
}
type EventMessageListenner = {
    message: string,
    callback: (data: RuntimeEvent) => void | undefined,
    oneCall: boolean
}

/**
 * # Adlogs
 * Advanced Logging System
 * ---
 * k-engine
 */

export default class {
    public hub = new EventEmitter()
    private runtimeEventMessageListennerList: Array<EventMessageListenner> = []
    private pendingLogItems: RuntimeEvent[] = []
    private repo: Repository | undefined

    constructor() {        
        // -> Set listener
        this.hub.on('app-runtime', async (data: RuntimeEvent) => {
            if(data.date){
                const emoji = { ready: '🚀', info: '✅', warning: '⚠️ ', stop: '💥' }
                console.log(`${emoji[data.type]} ${data.date} [ ${data.category} ]`, data.message)

                if (data.type === "stop" && !data.save) {
                    console.log('💥 k-engine has been closed !')
                    if(!data.save) process.exit(1)
                }

                // -> Search on listennerList
                this.runtimeEventMessageListennerList.forEach((listenner, i) => {
                    if (listenner.message === data.message) {
                        listenner.callback(data)
                        if (listenner.oneCall) this.runtimeEventMessageListennerList.splice(i, 1)
                    }
                })
                // -> Save
                if(data.save && this.repo){
                    delete data.save
                    await this.repo.save(data)
                    if(data.type === 'stop'){
                        console.log('💥 k-engine has been closed !')
                        process.exit(1)
                    }
                }else if(data.save) this.pendingLogItems.push(data)
            }
        })
    }

    /**
     * ###
     * PUBLIC METHOD
     * ###
     */

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

    public setRepo = async (repo: Repository) => {
        this.repo = repo
        // -> Saving pending log item 
        for (const item of this.pendingLogItems){
            delete item.save
            await this.repo.save(item)
        }
    }
}