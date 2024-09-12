import MongoUserRepository from "#app/repositories/mongo/MongoUserRepository.js"
import MakeOTPRequest from "#app/services/make-otp-request.js"
import Adlogs from "#core/adlogs/index.js"
import Archange from "#core/archange/index.js"

import { ExpressFractalRequest, HeavenExpressRouter } from "#core/heaven/routers.js"
import Utils from "#utils/index.js"
import { MongoClient } from "mongodb"

/** TS */
interface OTPMakeRequest extends ExpressFractalRequest { body: { email: string } }
interface OTPCheckRequest extends ExpressFractalRequest { body: { pin: string } }

/**
 * # Heaven route
 * Express
 * ---
 * k-engine
 */

export default (adlogs: Adlogs, archange: Archange, mongoClient: MongoClient) => {
    const { router } = new HeavenExpressRouter(adlogs, archange, mongoClient)
    
    /** ### Load Repositories ### */
    const userRepository = new MongoUserRepository(mongoClient, 'anywhere')
    /** ### Load Services ### */
    const makeOTPRequest = new MakeOTPRequest(adlogs, userRepository)

    /** ### Router specific ### */
    const otpList: { email: string, pin: string, hash: string }[] = []

    /** ### Router dispatching ### */
    router.post('/make', async(req: OTPMakeRequest, res) => {
        const availability = archange.checkCallerOTPAvailability(req.session.archange_hash || req.session.heaven_kf || '')
        if(availability instanceof Error){
            res.json(Utils.makeHeavenResponse(res, { pass: false, err: availability.message }))
        }else{
            const result = await makeOTPRequest.execute(req.body.email, otpList.map(x => x.pin))
            if(!result) res.json(Utils.makeHeavenResponse(res, { pass: true, err: 'unavailable' })) 
            else{
                const pinHash = Utils.genString(10)
                const otp = otpList.filter(x => x.email === req.body.email)[0]
                if(otp) otp.pin = result.pin
                else otpList.push({ email: req.body.email, pin: result.pin, hash: pinHash})

                res.json(Utils.makeHeavenResponse(res, { pass: true, otp: {
                    length: result.pin.length, phone: result.phone 
                }, err: '' }))
            }
        }
    })

    router.post('/check', async(req: OTPCheckRequest, res) => {
        const pinIndex = otpList.findIndex(x => x.pin === req.body.pin)
        if(pinIndex === -1) res.json(Utils.makeHeavenResponse(res, { pass: false, pinHash: '' }))
        else{
            const pinHash = otpList[pinIndex].hash
            otpList.splice(pinIndex, 1)
            archange.updateCallerActualOTPPinHash((req.session.archange_hash || req.session.heaven_kf || ''), pinHash)
            res.json(Utils.makeHeavenResponse(res, { pass: true, pinHash: pinHash }))
        }
    })

    return router
}