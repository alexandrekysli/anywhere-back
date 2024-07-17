import Adlogs from "#core/adlogs/index.js"
import Archange from "#core/archange/index.js"
import { HeavenExpressRouter } from "#core/heaven/routers.js"
import { MongoClient } from "mongodb"

/**
 * # Heaven route
 * Express
 * ---
 * k-engine
 */

export default (adlogs: Adlogs, archange: Archange, mongoClient: MongoClient) => {
    const { router } = new HeavenExpressRouter(adlogs, archange, mongoClient)
    
    /** ### Router dispatching ### */
    router.get('/', async(req, res) => {
        res.json({
            ip: (req.socket.remoteAddress || '').replace(/([a-z]|:)+/, '')
        })
    })

    return router
}