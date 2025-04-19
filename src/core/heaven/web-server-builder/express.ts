import http from "node:http"

import Adlogs from "#core/adlogs/index.js"
import Config, { ConfigType } from "../../../config"
import { MongoBase } from "../../rock"

import ExpressApp from "express"
import ExpressSession from "express-session"
import Cors from "cors"
import Helmet from "helmet"
import MongoStore from "connect-mongo"


/** TS */
// -> express-session mistake resolved
declare module 'express-session' {
    interface SessionData {
        heaven_kf: string,
        archange_hash: string,
        archange_caller_origin: string,
    }
}

/**
 * # Express Web Server Buildler
 * Heaven
 * ---
 * k-engine
 */

const expressServer = (adlogs: Adlogs, engineConfig: ConfigType, mongoBase: MongoBase, archangeRequestMiddleware: any) => {
    const webServer = ExpressApp()
    const webLink = http.createServer(webServer)

    webServer.use(ExpressApp.urlencoded({ extended: true }))
    webServer.use(ExpressApp.json())
    webServer.disable('x-powered-by')
    engineConfig.infrastructure.web.secured && webServer.use(Helmet())
    webServer.use(Cors({ credentials: true, origin: Config.infrastructure.web.cors_origins}))
    
    // -> Express Session Configuration
    webServer.use(ExpressSession({
        secret: engineConfig.infrastructure.web.session.secret,
        resave: true,
        saveUninitialized: true,
        cookie: {
            secure: engineConfig.infrastructure.web.secured,
            maxAge: engineConfig.infrastructure.web.session.cookie_max_day
        },
        store: MongoStore.create({
            client: mongoBase.client,
            dbName: 'anywhere'
        })
    }))

    // -> Archange request middleware
    webServer.use(archangeRequestMiddleware)

    return { webServer, webLink }

}

export default expressServer