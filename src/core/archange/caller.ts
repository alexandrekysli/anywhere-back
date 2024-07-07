import Adlogs from "../adlogs"
import Utils from "#utils/index.js"
import CallerEntity from "./entities/caller"
import OriginEntity from "./entities/origin"
import HellItemEntity from "./entities/hell"
import HellRepository from "./repositories/IHellRepository"
import CallerRepository from "./repositories/ICallerRepository"
import OriginRepository from "./repositories/IOriginRepository"
import { ConfigType } from "../../config"

/** TS */
type OriginLastActivitySavingTimeout = { identifier: string, timeout: NodeJS.Timeout | undefined }


/**
 * Archange Caller
 * ---
 * k-engine
 */

class ArchangeCaller {
    public caller: CallerEntity | null = null
    public hellItem: HellItemEntity | null = null
    private requestCount = 0
    private tokenBucket = 0
    private timestampBucket = 0
    private dosPerHourBegin = 0
    private dosPerHourCount = 0
    private originLastActivitySavingTimeoutList: OriginLastActivitySavingTimeout[] = []

    constructor(
        private adlogs: Adlogs,
        private archangeConfig: ConfigType['infrastructure']['archange'],
        private callerRepository: CallerRepository,
        private originRepository: OriginRepository,
        private hellRepository: HellRepository,    
    ){}

    /**
     * ###
     * PRIVATE METHODS
     * ###
     */

    /** Archange Caller initialisation */
    init = async (callerType: 'ip' | 'known' | 'user', callerIdentity: string) => {
        // -> Load Caller from
        const inDBCaller = await this.callerRepository.getCallerByIdentifier(callerIdentity)
        if(inDBCaller.data){
            this.caller = inDBCaller.data
            this.tokenBucket = this.archangeConfig.bucket.limit[this.caller.type]
        }else if (inDBCaller.err){
            this.adlogs.writeRuntimeEvent({
                category: 'archange',
                type: 'stop',
                message: `unable to get archange caller in db < ${inDBCaller.err} >`, save: true
            })
        }else{
            this.caller = new CallerEntity(undefined, callerType, callerIdentity)
            const saveResult = await this.callerRepository.addCaller(this.caller)
            if(saveResult.data){
                this.caller = saveResult.data
            }else{
                this.adlogs.writeRuntimeEvent({
                    category: 'archange',
                    type: 'stop',
                    message: `unable to save archange caller in db < ${inDBCaller.err} >`, save: true
                })
            }
        }

        // -> Retrieve caller hell state
        const inDBhellItem = await this.hellRepository.getItem(this.caller?.identifier || '')
        
        if(inDBhellItem.err === '') {
            this.hellItem = inDBhellItem.data
        }else{
            this.adlogs.writeRuntimeEvent({
                category: 'archange',
                type: 'stop',
                message: `unable to retrieve caller hell state in db < ${inDBCaller.err} >`, save: true
            })
        }

        // -> Load Caller Origin
        const callerOrigin = await this.originRepository.getOriginByCaller(this.caller?.identifier || '')
        
        this.caller && (this.caller.originList = callerOrigin.data || [])
    }


    /**
     * ###
     * PUBLIC METHODS
     * ###
     */

    /**
     * @param ip Origin IP address
     * @param agent Origin agent
     * @returns index of created origin in `caller.originList`
     */
    addNewOrigin = async (
        ip: string,
        identifier: string,
        agent: {
            client: { name: string, version: string },
            os: { name: string, version: string }
        }
    ): Promise<number> => {
        if(this.caller){
            const nowDate = Date.now()
            const origin = new OriginEntity(undefined, ip, nowDate, 0, this.caller.identifier, identifier, agent)
            // -> Save  new origin in DB
            const result = await this.originRepository.addOrigin(origin)
            if(result.err){
                this.adlogs.writeRuntimeEvent({
                    category: 'archange',
                    type: 'stop',
                    message: `unable to save archange origin in db < ${result.err} >`, save: true
                })
                return -1
            }else if(result.data){
                this.caller.originList.push(result.data)
                return this.caller.originList.length - 1
            }
        }
        return -1
    }

    checkOriginRequest = async (originIndex: number) => {
        if(this.caller){
            let hellParameters: { mode: HellItemEntity['mode'], time: number, switch?: boolean } | null = null
            const origin = this.caller.originList[originIndex]
            const nowDate = Date.now()
            origin.lastActivity = origin.lastActivity && nowDate || origin.since
            this.requestCount++
            this.tokenBucket--

            /** CHECK CALLER REQUEST FOR RETRIEVE POSSIBLE HELL STATE */
            let resetToken = false
            const remainFrameLifetime = Utils.timestampDiff(nowDate, this.timestampBucket, 'second')
            if(remainFrameLifetime <= this.archangeConfig.bucket.frame_lifetime){
                // -> Remain frame life
                if(this.tokenBucket <= 0){
                    // -> caller token bucket is empty
                    // -> HELL CHECKER
                    if(this.hellItem){
                        // -> caller already in hell with DELAYED mode
                        console.log('caller already in hell 👿', this.hellItem)
                        // -> detect if caller dosPerHour limit reach
                        if(this.dosPerHourBegin === new Date(nowDate).getHours() && this.dosPerHourCount >= this.archangeConfig.hell.max_dos_per_hour){
                            // -> dosPerHour Limit reach -> put in hell with BAN mode
                            hellParameters = { mode: 'ban', time: this.archangeConfig.hell.dos_ban_time, switch: true }
                        }else{
                            hellParameters = { mode: 'delayed', time: this.archangeConfig.hell.delayed_time, switch: true }
                            this.dosPerHourCount++
                            resetToken = true
                        }
                    }else{
                        // -> caller not in hell -> put in hell with DELAYED mode
                        hellParameters = { mode: 'delayed', time: this.archangeConfig.hell.delayed_time }
                    }
                }
            }else resetToken = true

            if(resetToken){
                this.tokenBucket = this.archangeConfig.bucket.limit[this.caller.type]
                this.timestampBucket = nowDate
            }

            // -> Save caller to hell
            if(hellParameters){
                let errorResult = ''
                if(hellParameters.switch && this.hellItem){
                    // -> switch mode
                    const result = await this.hellRepository.updateItemHellMode(this.hellItem, hellParameters.mode, hellParameters.time)
                    errorResult = result.err
                }else{
                    const result = await this.hellRepository.addItem(this.caller.identifier, hellParameters.mode, hellParameters.time)
                    this.hellItem = result.data
                    errorResult = result.err
                }

                // -> Error detect
                if(errorResult){
                    this.adlogs.writeRuntimeEvent({
                        category: 'archange',
                        type: 'stop',
                        message: `unable to save/update archange hellItem in db < ${errorResult} >`, save: true
                    })
                }else if(this.hellItem){
                    this.adlogs.writeRuntimeEvent({
                        category: 'archange',
                        type: 'warning',
                        message: `caller < ${this.caller.identifier} > ${hellParameters.switch && 'switch' || 'go'} to hell with < ${hellParameters.mode} > mode until < ${new Date(this.hellItem.to).toISOString()} >`,
                        save: true
                    })
                }

                // -> Increment dosPerHourCount
                if(this.hellItem && hellParameters.mode === 'delayed'){
                    this.dosPerHourCount++
                    this.dosPerHourBegin = (new Date(this.hellItem.from).getHours())
                }
            }
            
            /** UPDATE ORIGIN LAST ACTIVITY PROPERTY */
            const index = this.originLastActivitySavingTimeoutList.findIndex(x => x.identifier === origin.identifier)
            let originLastActivitySavingTimeout: OriginLastActivitySavingTimeout
            if(index !== -1){
                originLastActivitySavingTimeout = this.originLastActivitySavingTimeoutList[index]
                clearTimeout(originLastActivitySavingTimeout.timeout)
            }else{
                this.originLastActivitySavingTimeoutList.push({ identifier: origin.identifier, timeout: undefined })
                originLastActivitySavingTimeout = this.originLastActivitySavingTimeoutList[this.originLastActivitySavingTimeoutList.length - 1]
            }
            // -> Wait 10s before save origin last_activity
            originLastActivitySavingTimeout.timeout = setTimeout(() => {
                console.log('origin last_activity save !');
                this.originRepository.updateOriginActivity(origin.id || '', origin.lastActivity).then((result) => {
                    if(result.err){
                        this.adlogs.writeRuntimeEvent({
                            category: 'archange',
                            type: 'warning',
                            message: `unable to update archange origin last_activity in db < ${result.err} >`,
                            save: true
                        })
                    }
                })
            }, 10000)
        }
    }

    exitCallerFromHell = async () => {
        if(this.caller && this.hellItem){
            // -> Hell stay finish -> remove item from hell
            const result = await this.hellRepository.removeItemByEndStayTime(this.caller.identifier, Date.now())
            if(result.data){
                // -> Remove Hell data
                this.tokenBucket = 0
                this.timestampBucket = 0
                this.dosPerHourCount = 0
                if(this.hellItem.mode === 'ban'){
                    this.dosPerHourBegin = 0
                }else if(this.hellItem.mode === 'delayed' && this.dosPerHourBegin !== new Date().getHours()){
                    this.dosPerHourBegin = new Date().getHours()
                }
                this.hellItem = null
                this.adlogs.writeRuntimeEvent({
                    category: 'archange',
                    type: 'info',
                    message: `stay in hell over for caller < ${this.caller.identifier} >`,
                    save: true
                })
            }else if(result.err){
                this.adlogs.writeRuntimeEvent({
                    category: 'archange',
                    type: 'warning',
                    message: `unable to remove archange hell item in db < ${result.err} >`,
                    save: true
                })
            }
        }
    }

}

export default ArchangeCaller