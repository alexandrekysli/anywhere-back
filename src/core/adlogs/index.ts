import MongoAdlogsRepository from "../../infrastructure/database/adlogs/MongoAdlogsRepository"
import { EventEmitter } from "node:events"

/** Types */
type RuntimeEvent = {
    type: 'stop' | 'warning' | 'info',
    date?: number,
    category: 'global' | 'rock' | 'archange' | 'app',
    message: string,
    save?: boolean
}
type EventMessageListenner = {
    message: string,
    callback: (data: RuntimeEvent) => void | undefined,
    oneCall: boolean
}

/**
 * Adlogs
 * ---
 * Advanced Logging System
 */

export default class {
    private hub = new EventEmitter()
    private runtimeEventMessageListennerList: Array<EventMessageListenner> = []
    private pendingLogItems: RuntimeEvent[] = []
    private repo: MongoAdlogsRepository | undefined

    constructor() {
        // -> Set listener
        this.hub.on('app-runtime', (data: RuntimeEvent) => {
            if(data.date){
                console.log(`${data.type === 'info' ? '🚀' : data.type === 'stop' ? '❌' : '⚠️ '} ${new Date(data.date).toISOString()} [ ${data.category} ]`, data.message)

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
                    this.repo.addNewLogItem(data)
                    .then((d) => {
                        console.log(d)
                        if(data.type === "stop"){
                            console.log('💥 k-engine has been closed !')
                            process.exit(1)
                        }
                    })
                }
            }
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

    public setRepo = (repo: MongoAdlogsRepository) => {
        this.repo = repo
        
        // -> Saving pending log item 
    }
}