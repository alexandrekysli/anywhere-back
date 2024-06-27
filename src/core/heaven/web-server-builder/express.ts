import http from "node:http"

import { ConfigType } from "../../../config"
import { MongoBase } from "../../rock"

import ExpressApp, { Express } from "express"
import ExpressSession from "express-session"
import Helmet from "helmet"
import MongoStore from "connect-mongo"


/**
 * # Express Web Server Buildler
 * Heaven
 * ---
 * k-engine
 */

const expressServer = (webServerConfig: ConfigType['infrastructure']['web'], mongoBase: MongoBase) => {
    const webServer = ExpressApp()
    const webLink = http.createServer(webServer)

    webServer.use(ExpressApp.urlencoded({ extended: true }))
    webServer.use(ExpressApp.json())
    webServer.disable('x-powered-by')
    webServerConfig.secured && webServer.use(Helmet())

    // -> Express Session Configuration
    webServer.use(ExpressSession({
        secret: webServerConfig.session.secret,
        resave: true,
        saveUninitialized: true,
        cookie: {
            secure: webServerConfig.secured,
            maxAge: webServerConfig.session.cookie_max_day
        },
        store: MongoStore.create({
            client: mongoBase.client,
            dbName: 'k-engine-session'
        })
    }))

    return { webServer, webLink }

}

export default expressServer