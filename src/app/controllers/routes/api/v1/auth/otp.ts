import Adlogs from "#core/adlogs/index.js"
import Archange from "#core/archange/index.js"

import { HeavenExpressRouter } from "#core/heaven/routers.js"
import { MongoClient } from "mongodb"

/** TS */
type OTPRequestItem = {
    caller: string,
    remaining: number,
    actualValue: string
}

/**
 * # Heaven route
 * Express
 * ---
 * k-engine
 */

export default (adlogs: Adlogs, archange: Archange, mongoClient: MongoClient) => {
    const { router } = new HeavenExpressRouter(adlogs, archange, mongoClient)
    const otpRequestList: OTPRequestItem[] = []

    /** ### Router dispatching ### */
    router.get('/make', async(req, res) => {
        setTimeout(() => {
            res.json({
                archange: { pass: true, token_bucket: res.locals.caller.remain_token },
                data: {
                    permitted: true,
                    length: 5,
                    remaining_attempt: 3,
                    resend_in: 10,
                    phone: '+225 070* *** *750'
                }
            })
        }, 1000)
    })

    router.get('/check', async(req, res) => {
        const pass = req.query.code === 'KOFFI'
        res.json({
            archange: { pass: true, token_bucket: res.locals.caller.remain_token },
            data: {
                pass: pass
            }
        })
    })

    return router
}