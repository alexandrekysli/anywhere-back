import { randomUUID } from "crypto"

import { ConfigType } from "../../config"
import Adlogs from "../adlogs"
import Utils from "../../utils"
import ArchangeCaller from "./caller"
import routeAccessRules from "../../config/app-route-access-config"

import { Request, Response, NextFunction } from "express"
import uap from "ua-parser-js"
import HellRepository from "./repositories/interfaces/IHellRepository"
import CallerRepository from "./repositories/interfaces/ICallerRepository"
import OriginRepository from "./repositories/interfaces/IOriginRepository"
import IArchangeUserRepository from "./repositories/interfaces/IUserRepository"
import IUserRepository from "#app/repositories/IUserRepository.js"

/** TS */
type RequestOrigin = {
    type: 'ip' | 'known' | 'user',
    caller: string,
    ip: string,
    agent: {
        client: { name: string, version: string },
        os: { name: string, version: string }
    },
    archange_hash: string,
    hash: string
}
type ArchangeRequestType = { method: string, path: string, body: {[key: string]: string} }

/**
 * # Archange Shield
 * KE Security Module
 * ---
 * k-engine
 */

class Archange {
    public activeCallerList: ArchangeCaller[] = []
    private archangeCheckErrorCode = {
        HELL_DELAYED: 429,
        HELL_BAN: 404,
        DERECK_UNKNOWN_CALLER: 429,
        DERECK_EMPTY_ACCESS_ATTEMPT: 429,
        DERECK_SUSPENDED_CALLER_ACCOUNT: 403,
        DERECK_BAD_CALLER_TYPE_ACCESS: 403,
        DERECK_BAD_CALLER_ACCOUNT_ACCESS: 403,
        DERECK_BAD_BODY_STRUCTURE: 400,
        DERECK_UNSAFE_ROUTE_ACCESS_UNALLOWED: 404,
    }
    constructor(
        private adlogs: Adlogs,
        private config: ConfigType['infrastructure']['archange'],
        private callerRepository: CallerRepository,
        private originRepository: OriginRepository,
        private hellRepository: HellRepository,
        private userRepository: IArchangeUserRepository,
        private appUserRepository: IUserRepository
    ){}

    /**
     * ###
     * PRIVATE METHODS
     * ###
     */
    
    /**
     * @param req express request param
     * @returns `RequestOrigin`
     */
    private getExpressRequestOrigin = (req: Request) : RequestOrigin => {
        const ip = (req.headers['x-forwarded-for'] && req.headers['x-forwarded-for'][0] || req.socket.remoteAddress || 'socket-lost').replace(/([a-z]|:)+/, '')
        const heavenKnowFootprint = req.session.heaven_kf
        const archangeUserHash = req.session.archange_hash
        const ua = uap(req.headers['user-agent'])
        const callerValue = archangeUserHash || heavenKnowFootprint || Utils.makeMD5(ip)
        
        return {
            type:
                archangeUserHash && 'user' ||
                heavenKnowFootprint && 'known' ||
                'ip',
            ip: ip,
            caller: callerValue,
            agent: {
                client: { name: ua.browser.name || 'NA', version: ua.browser.version || 'NA' },
                os: { name: ua.os.name || 'NA', version: ua.os.version || 'NA' }
            },
            archange_hash: archangeUserHash || '',
            hash: Utils.makeMD5(req.headers["user-agent"] + ':' + req.headers['accept-language'] + req.headers['accept-encoding'] + '@' + ip )
        }
    }

    /**
     * @param value request origin value
     * @returns active caller of specified origin value
     */
    private getActiveCaller = async (callerType: RequestOrigin['type'], callerValue: string, archangeHash: string): Promise<ArchangeCaller> => {
        const activeCallerFilterList = this.activeCallerList.filter(x => x.caller?.identifier === callerValue)
        if(activeCallerFilterList.length === 0){
            // -> New caller
            const caller = new ArchangeCaller(this.adlogs, this.config, this.callerRepository, this.originRepository, this.hellRepository, this.appUserRepository)
            await caller.init(callerType, callerValue, archangeHash)
            this.activeCallerList.push(caller)
            this.adlogs.writeRuntimeEvent({
                category: 'archange',
                type: 'info',
                message: `new access to heaven by caller < ${caller.caller?.identifier} >`
            })
            return caller
        }

        return activeCallerFilterList[0]
    }

    /**
     * # Deep Request Check
     * Authorization check by request
     * @param caller
     * @param request
     * @returns
     */
    private dereck = (caller: ArchangeCaller, request: ArchangeRequestType): { pass: boolean, err_code?: ArchangeErrorCode } => {
        const SAFECHECK = true
        const customerTypes = ['corporate', 'particular']

        if(caller.remainDereckAccess > 0){
            if(caller.caller){                
                if(caller.appAccount && !caller.appAccount.state) return { pass: false, err_code: 'DERECK_SUSPENDED_CALLER_ACCOUNT' }
                else{
                    let rule: typeof routeAccessRules[0]['rules'][0] | undefined
                    routeAccessRules.forEach(group => {
                        const _rule = group.rules.filter(rule => group.main_path + '/' + rule.path === request.path)[0]
                        if(_rule) rule = _rule
                    })
                    if(rule){
                        let err: ArchangeErrorCode | undefined
                        const appAccountType = caller.appAccount ? caller.appAccount.type : ''
                        const parsedAccountType = customerTypes.includes(appAccountType) ? 'customer' : appAccountType
        
                        /* console.log(request.path);
                        console.log('account type > ' + parsedAccountType, rule.app_user_type); */
        
                        if (!rule.type.includes(caller.caller.type)) {
                            err = 'DERECK_BAD_CALLER_TYPE_ACCESS'
                        } else if (
                            rule.type.length === 1 &&
                            rule.type[0] === 'user' &&
                            rule.app_user_type &&
                            caller.appAccount &&
                            !rule.app_user_type.includes(parsedAccountType as 'global_manager' | 'manager' | 'customer' | 'admin')
                        ) {
                            err = 'DERECK_BAD_CALLER_ACCOUNT_ACCESS'
                        } else if (!rule.body.safeParse(request.body).success) {
                            err = 'DERECK_BAD_BODY_STRUCTURE'
                        }
        
                        return { pass: err === undefined, err_code: err }
                    }else return { pass: !SAFECHECK, err_code: SAFECHECK ? 'DERECK_UNSAFE_ROUTE_ACCESS_UNALLOWED' : undefined }
                }
            }else return { pass: false, err_code: 'DERECK_UNKNOWN_CALLER' }
        }else return { pass: false, err_code: 'DERECK_EMPTY_ACCESS_ATTEMPT' }
    }

    private archangeRequestAnalyser = async (origin: RequestOrigin, request: ArchangeRequestType): Promise<ArchangeRequestCheckResult> => {
        // -> Detect active caller
        const activeCaller = await this.getActiveCaller(origin.type, origin.caller, origin.archange_hash)
        if(activeCaller.caller){
            if(activeCaller.hellItem){
                // -> caller already in hell
                const remainHellStayTime = Utils.timestampDiff(activeCaller.hellItem.to, Date.now(), 'second')
                if(remainHellStayTime <= 0){
                    // -> Stay in hell over
                    await activeCaller.exitCallerFromHell()
                }
            }

            if(!activeCaller.hellItem || activeCaller.hellItem.mode === 'delayed'){
                // -> Retrieve caller origin
                let originIndex = activeCaller.caller.originList.findIndex(x => x.identifier === origin.hash)
                if(originIndex === -1){
                    // -> Add new origin for caller
                    originIndex = await activeCaller.addNewOrigin(origin.ip, origin.hash, origin.agent)
                    this.adlogs.writeRuntimeEvent({
                        category: 'archange',
                        type: 'info',
                        message: `new origin < ${origin.hash} > for caller < ${activeCaller.caller.identifier} >`
                    })
                }

                // -> Check request on caller
                await activeCaller.checkOriginRequest(originIndex)
            }

            if(activeCaller.hellItem){
                // -> Caller in hell
                const hellCode = activeCaller.hellItem.mode === 'ban' ? 'HELL_BAN' : 'HELL_DELAYED'
                return { pass: false, err_code: hellCode, hell_exit_date: activeCaller.hellItem.to }
            }

            // -> Caller not in hell -> Start Deep Request checking
            let hellExitDate: number | undefined = undefined
            const dereckState = this.dereck(activeCaller, request)
            
            if(dereckState.err_code){
                activeCaller.remainDereckAccess--
                if(activeCaller.remainDereckAccess <= 0){
                    // -> Too many bad dereck -> ban for 24H
                    const DAY = 86400000
                    hellExitDate = await activeCaller.postCallerToHell('ban', DAY)
                }

                this.adlogs.writeRuntimeEvent({
                    category: 'archange',
                    type: 'warning',
                    message: `dereck error < ${dereckState.err_code} > for caller < ${activeCaller.caller.identifier} >`,
                    save: true
                })
            }

            return { ...dereckState, hell_exit_date: hellExitDate }
        }

        return { pass: false, err_code: 'DERECK_UNKNOWN_CALLER' }
    }

    /**
     * ###
     * PUBLIC METHODS
     * ###
     */

    /** Archange Middleware for catch request from express server */
    public expressMiddleware = async ( req: Request, res: Response, next: NextFunction ) => {      
        // -> Retrieve request origin
        const origin = this.getExpressRequestOrigin(req)
        if(origin.type === 'ip') req.session.heaven_kf = randomUUID()
        
        // -> Save origin identifier on session
        req.session.archange_caller_origin && (req.session.archange_caller_origin = origin.hash)
        
        const archangeCheckData = await this.archangeRequestAnalyser(origin, { method: req.method, body: req.body, path: req.path }) 
        res.locals.archange_check = archangeCheckData

        if(archangeCheckData.err_code){
            res.status(this.archangeCheckErrorCode[archangeCheckData.err_code])
            if(archangeCheckData.err_code === 'HELL_DELAYED'){
                setTimeout(() => {
                    next()
                }, Utils.getRandomNumber(3000, 10000))
            }else res.json(Utils.makeHeavenResponse(res, {}))
        }else next()
    }

    public getArchangeUserByMasterID = async (master_id: string) => {
        const user = await this.userRepository.getUserByLinkHash(Utils.makeSHA256(`4C#${master_id}@`))        
        if(user.data !== undefined){
            return user.data || null
        }else{
            this.adlogs.writeRuntimeEvent({
                category: 'archange',
                type: 'stop',
                message: `critical db error < ${user.err} >`, save: true
            })
            return null
        }
    }

    public setActiveCallerWithAppAccountState = (accountID: string, state: boolean) => {
        const activeCaller = this.activeCallerList.filter(caller => caller.appAccount?.id === accountID)[0]
        if(activeCaller && activeCaller.appAccount){
            activeCaller.appAccount.state = state

            return true
        }
        return false
    }


    public getArchangeCallerByIdentifier = (identifier: string): ArchangeCaller | false => {
        const caller = this.activeCallerList.filter(caller => caller.caller?.identifier === identifier)[0]
        return caller || false
    }

    public checkCallerOTPAvailability = (identifier: string): true | Error => {
        const caller = this.activeCallerList.filter(x => x.caller?.identifier === identifier)[0]
        if(caller){
            if(caller.usedPerDayOTP < caller.otpPerDayLimit){
                caller.usedPerDayOTP++
                if(caller.usedPerDayOTP === caller.otpPerDayLimit) caller.nextOTPRefullDate = Date.now() + 86400000

                return true
            }else{
                if(Date.now() > caller.nextOTPRefullDate){
                    caller.nextOTPRefullDate = 0
                    caller.usedPerDayOTP = 1

                    return true
                }else return new Error('empty')
            }            
        }
        return new Error('no_found')
    }

    public getCallerActualOTPPinHash = (identifier: string) => {
        const caller = this.activeCallerList.filter(x => x.caller?.identifier === identifier)[0]
        return caller ? caller.OTPActualPinHash : false
    }

    public updateCallerActualOTPPinHash = (identifier: string, hash: string | false) => {
        const caller = this.activeCallerList.filter(x => x.caller?.identifier === identifier)[0]
        if(caller) caller.OTPActualPinHash = hash
    }

    public addArchangeUser = async (master_id: string) => {
        const user = await this.userRepository.addUser(Utils.makeSHA256(`4C#${master_id}@`))
        if(user.data !== undefined){
            return user.data || null
        }else{
            this.adlogs.writeRuntimeEvent({
                category: 'archange',
                type: 'stop',
                message: `critical db error < ${user.err} >`, save: true
            })
            return null
        }
    }

    public removeOriginFromCaller = async (callerID: string, originID: string) => {
        const caller = this.activeCallerList.filter(x => x.caller?.identifier === callerID)[0]
        if(caller && caller.caller){
            const callerOriginIndex = caller.caller.originList.findIndex(x => x.identifier === originID)
            if(callerOriginIndex !== -1){
                const result = await this.originRepository.removeCallerOriginByIdentifier(callerID, originID)
                if(!(result instanceof Error)){
                    caller.caller.originList.splice(callerOriginIndex, 1)
                }
            }
        }        
    }

    public removeArchangeUserByMasterID = async (master_id: string) => {
        const removeState = await this.userRepository.removeUser(Utils.makeSHA256(`4C#${master_id}@`))        
        if(removeState.err){
            this.adlogs.writeRuntimeEvent({
                category: 'archange',
                type: 'stop',
                message: `critical db error < ${removeState.err} >`,
                save: true
            })
            return false
        }else return true
    }
}

export default Archange