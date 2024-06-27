import Adlogs from "#core/adlogs/index.js"

import ExpressApp from "express"

/**
 * # Heaven Express Router
 * Heaven
 * ---
 * k-engine
 */

class HeavenExpressRouter{
    public router = ExpressApp.Router()
    constructor( public adlogs: Adlogs ){}
}

export { HeavenExpressRouter }