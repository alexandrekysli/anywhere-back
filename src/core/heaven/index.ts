import http from "node:http"
import path from "node:path"

import Adlogs from "../adlogs"
import { ConfigType } from "../../config"
import { MongoBase } from "../rock"
import Utils from "#utils/index.js"
import ExpressServerBuildler from "./web-server-builder/express"

import { Express, Router } from "express"

/** Types */
type dynamicRouteFolderItem = { path: string, router: string }

/**
 * # Heaven
 * Web Server
 * ---
 * k-engine
 */

class Heaven {
    private webServer: Express | undefined
    private webLink: http.Server | undefined

    constructor(
        private adlogs: Adlogs,
        private engineConfig: ConfigType,
        mongoBase: MongoBase,
        private serverType: 'express'
    ){
        // -> Build web server
        this.buildWebServer(mongoBase)
    }

    /**
     * ###
     * PRIVATE METHODS
     * ###
     */

    /**
     * Builds a node web server for Heaven instance 
     */
    private buildWebServer = async (mongoBase: MongoBase) => {
        if(this.serverType === 'express'){
            // -> build express web server
            this.webServer = ExpressServerBuildler(this.engineConfig['infrastructure']['web'], mongoBase).webServer

            // -> link archange middleware

            // -> start dynamic routing
            const routeFolderStructure: dynamicRouteFolderItem[] = []
            this.getRouteFolderStructure(
                path.join(this.engineConfig.root,
                    this.engineConfig.infrastructure.web.routes_directory
                ), '', routeFolderStructure
            )
            if(routeFolderStructure.length){
                routeFolderStructure.forEach(async route => {
                    // -> Check if file as a valid express router
                    const router = (await import(route.router)).default.default
                    if(router instanceof Function){                        
                        try {
                            this.webServer?.use(route.path, router(this.adlogs))
                        } catch (error) {
                            // -> Bad express router file
                            this.adlogs.writeRuntimeEvent({
                                category: 'heaven',
                                type: 'stop',
                                message: `bad heaven express router found at < ${route.router} >`,
                                save: true
                            })
                        }
                    }
                })
            }else{
                // -> No available route
                this.adlogs.writeRuntimeEvent({
                    category: 'heaven',
                    type: 'warning',
                    message: `no route available in specified < ${this.engineConfig.infrastructure.web.routes_directory} > heaven route controller directory`
                })
            }

            // -> 404 Route
            this.webServer.use((req, res) => {
                res.status(404)
                res.send(`The desired path < ${req.originalUrl} > not existed in this server !`)

                this.adlogs.writeRuntimeEvent({
                    category: 'heaven',
                    type: 'info',
                    message: `caller attempt to access unavaialble route < ${req.originalUrl} >`
                })
            })
        }
    }

    /**
     * Retrieve web server route structure by scanning specified `routeFolder`
     * @param routeFolder folder where begin scan
     */
    private getRouteFolderStructure = (routeFolder: string, originPath: string, out: dynamicRouteFolderItem[]) => {
        const raw = Utils.getFolderContentSync(routeFolder, 0, true, true)
        Array.isArray(raw) && raw.forEach(item => {
            if(item.type === 'folder'){
                this.getRouteFolderStructure(path.join(routeFolder, `/${item.name}`), `${originPath}/${item.name}`, out)
            }else{
                if(item.name.includes(' ')){
                    // -> Incorrect router by spaced name found -> skip file
                    this.adlogs.writeRuntimeEvent({
                        category: 'heaven',
                        type: 'warning',
                        message: `file < ${routeFolder}/${item.name} > can't be use as router due to spaced name - skipping file`,
                        save: true
                    })
                }else{
                    out.push({ path: `${originPath}/${item.name === 'index.js' ? '' : path.parse(item.name).name}`, router: `${routeFolder}/${item.name}` })
                }
            }
        })
    }

    /**
     * ###
     * PUBLIC METHODS
     * ###
     */

    /**
     * 
     */
}

export default Heaven