import Adlogs from "#core/adlogs/index.js"
import ExpressApp, { Request } from "express"
import Archange from "../archange"
import { MongoClient } from "mongodb"

/** TS */
interface ExpressFractalRequest extends Request {}

/**
 * # Heaven Express Router
 * Heaven
 * ---
 * k-engine 
 */

class HeavenExpressRouter{
    public router = ExpressApp.Router()
    constructor( public adlogs: Adlogs, public archange: Archange, public mongoClient: MongoClient ){}
}

export { HeavenExpressRouter, ExpressFractalRequest }