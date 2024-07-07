import { randomUUID } from "crypto"

import { ConfigType } from "../../config"
import Adlogs from "../adlogs"
import Utils from "../../utils"
import ArchangeCaller from "./caller"

import { Request, Response, NextFunction } from "express"
import uap from "ua-parser-js"
import HellRepository from "./repositories/IHellRepository"
import CallerRepository from "./repositories/ICallerRepository"
import OriginRepository from "./repositories/IOriginRepository"

/** TS */
type RequestOrigin = {
    type: 'ip' | 'known' | 'user',
    caller: string,
    ip: string,
    agent: {
        client: { name: string, version: string },
        os: { name: string, version: string }
    },
    hash: string
}
type ArchangeRequestCheckResult = {
    pass: boolean,
    hell: {
        mode: 'ban' | 'delayed',
        to: number
    } | null
}

/**
 * # Archange Shield
 * KE Security Module
 * ---
 * k-engine
 */

class Archange {
    private activeCallerList: ArchangeCaller[] = []
    constructor(
        private adlogs: Adlogs,
        private config: ConfigType['infrastructure']['archange'],
        private callerRepository: CallerRepository,
        private originRepository: OriginRepository,
        private hellRepository: HellRepository,
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
        const archangeUserHash = req.session.archange_hash?.footprint
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
            hash: Utils.makeMD5(req.headers["user-agent"] + ':' + req.headers['accept-language'] + req.headers['accept-encoding'] + '@' + ip )
        }
    }

    /**
     * @param value request origin value
     * @returns active caller of specified origin value
     */
    private getActiveCaller = async (callerType: RequestOrigin['type'], callerValue: string): Promise<ArchangeCaller> => {
        const activeCallerFilterList = this.activeCallerList.filter(x => x.caller?.identifier === callerValue)
        if(activeCallerFilterList.length === 0){
            // -> New caller
            const caller = new ArchangeCaller(this.adlogs, this.config, this.callerRepository, this.originRepository, this.hellRepository)
            await caller.init(callerType, callerValue)
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

    private archangeRequestAnalyser = async (origin: RequestOrigin): Promise<ArchangeRequestCheckResult> => {
        // -> Detect active caller
        const activeCaller = await this.getActiveCaller(origin.type, origin.caller)
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
                    if(origin.type === 'known' && activeCaller.caller?.originList.length){
                        // -> Spoiler cookie detect with another origin -> 403
                        this.adlogs.writeRuntimeEvent({
                            category: 'archange',
                            type: 'warning',
                            message: `cookie usurpation detect with new origin for caller < ${activeCaller.caller.identifier} >`
                        })
                        return { pass: true, hell: null }
                    }else{
                        // -> New origin for ip and user caller
                        originIndex = await activeCaller.addNewOrigin(origin.ip, origin.hash, origin.agent)
                        this.adlogs.writeRuntimeEvent({
                            category: 'archange',
                            type: 'info',
                            message: `new origin < ${origin.hash} > for caller < ${activeCaller.caller.identifier} >`
                        })
                    }
                }

                // -> Check request on caller
                await activeCaller.checkOriginRequest(originIndex)
            }

            if(activeCaller.hellItem){
                return {
                    pass: false,
                    hell: { mode: activeCaller.hellItem.mode, to: activeCaller.hellItem.to }
                }
            }else return { pass: true, hell: null }
        }
        return { pass: true, hell: null }
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
        
        const result = await this.archangeRequestAnalyser(origin)

        if(result.hell){
            if(result.hell.mode === 'delayed'){
                setTimeout(() => {
                    res.status(429)
                    next()
                }, Utils.getRandomNumber(3000, 10000));
            }else{
                res.status(403)
                res.json({
                    archange: {
                        state: false,
                        err: 'Too many request',
                        hell: { mode: 'BAN', until: result.hell.to, prettyUntil: new Date(result.hell.to).toISOString() }
                    }
                })
            }
        }else next()
    }
}

export default Archange