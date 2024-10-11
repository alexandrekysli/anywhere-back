import Email from "#utils/external/email/index.js"
import Repository from "./repositories/IAdlogsRepository"
import { EventEmitter } from "node:events"

/** Types */
type RuntimeEvent = {
    type: 'ready' | 'stop' | 'warning' | 'info',
    date?: number,
    category: 'global' | 'rock' | 'archange' | 'heaven' | 'app',
    message: string,
    save?: boolean,
    critical?: Error
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
    private repo?: Repository
    private email?: Email
    private adminEmail = ''

    constructor() {        
        // -> Set listener
        this.hub.on('app-runtime', async (data: RuntimeEvent) => {
            if(data.date){
                const emoji = { ready: '🚀', info: '✅', warning: '⚠️ ', stop: '💥' }
                const message = `${emoji[data.type]} ${data.date} [ ${data.category} ] ${data.message}`
                if(['ready', 'info'].includes(data.type)) console.log(message)
                else console.error(message)
                
                // -> Refactoring
                // -> Search on listennerList
                this.runtimeEventMessageListennerList.forEach((listenner, i) => {
                    if (listenner.message === data.message) {
                        listenner.callback(data)
                        if (listenner.oneCall) this.runtimeEventMessageListennerList.splice(i, 1)
                    }
                })

                // -> Saving log item to DB
                if(data.save){
                    if(this.repo){
                        delete data.save
                        await this.repo.save(data)
                    }else this.pendingLogItems.push(data)
                }

                // -> Administrator notification
                if(this.email && (data.type === 'stop' || data.critical)){
                    const emailSendResult = await this.email.sendCriticalAdlogsEvent(this.adminEmail, data)
                }

                // -> k-engine closing
                if(data.type === 'stop'){
                    console.log('💥 k-engine has been closed !')
                    process.exit(1)
                }
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

    public init = async (repo: Repository, email: Email, adminEmail: string) => {
        this.repo = repo
        this.email = email
        this.adminEmail = adminEmail
        // -> Saving pending log item 
        for (const item of this.pendingLogItems){
            delete item.save
            await this.repo.save(item)
        }
    }
}