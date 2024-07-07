import Adlogs from "#core/adlogs/index.js"

import { HeavenExpressRouter } from "#core/heaven/routers.js"

/**
 * # Heaven route
 * Express
 * ---
 * k-engine
 */

export default (adlogs: Adlogs) => {
    const { router } = new HeavenExpressRouter(adlogs)
    
    /** ### Router dispatching ### */
    router.get('/', async(req, res) => {
        res.json({
            ip: (req.socket.remoteAddress || '').replace(/([a-z]|:)+/, '')
        })
    })

    return router
}