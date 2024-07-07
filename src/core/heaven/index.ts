import http from "node:http"
import path from "node:path"

import Adlogs from "../adlogs"
import { ConfigType } from "../../config"
import { MongoBase } from "../rock"
import Utils from "#utils/index.js"
import ExpressServerBuildler from "./web-server-builder/express"

import { Express } from "express"

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
    private serverType: 'express' | undefined

    constructor(
        private adlogs: Adlogs,
        private engineConfig: ConfigType
    ){}

    /**
     * ###
     * PRIVATE METHODS
     * ###
     */

    /**
     * Builds a node web server for Heaven instance 
     */
    private buildWebServer = async (mongoBase: MongoBase, archangeRequestMiddleware: Function) => {
        if(this.serverType === 'express'){
            // -> build express web server
            const expressServer = ExpressServerBuildler(
                this.adlogs,
                this.engineConfig,
                mongoBase,
                archangeRequestMiddleware
            )
            this.webServer = expressServer.webServer
            this.webLink = expressServer.webLink

            // -> link archange middleware

            // -> start dynamic routing
            const routeFolderStructure: dynamicRouteFolderItem[] = []
            this.getRouteFolderStructure(
                path.join(this.engineConfig.root,
                    this.engineConfig.infrastructure.web.routes_directory
                ), '', routeFolderStructure
            )
            if(routeFolderStructure.length){
                for (const route of routeFolderStructure) {
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
                }
            }else{
                // -> No available route
                this.adlogs.writeRuntimeEvent({
                    category: 'heaven',
                    type: 'warning',
                    message: `no route available in specified < ${this.engineConfig.infrastructure.web.routes_directory} > heaven route controller directory`
                })
            }

            // -> 404 Route catching
            this.webServer.use((req, res) => {
                res.status(404)
                res.send(`The desired path < ${req.originalUrl} > not existed on this server !`)

                this.adlogs.writeRuntimeEvent({
                    category: 'heaven',
                    type: 'info',
                    message: `caller attempt to access unavailable route < ${req.originalUrl} >`
                })
            })

            // -> Express configuration finish -> heaven is ready
            this.adlogs.writeRuntimeEvent({
                category: 'heaven',
                type: 'info',
                message: 'web server configuration complete'
            })
        }
    }

    /**
     * Retrieve web server route structure by scanning specified `routeFolder`
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
     * Initialize Heaven with specified web server
     * @param serverType heaven server type 
     * @param mongoBase store for session
     */
    public init = (serverType: 'express', mongoBase: MongoBase, archangeRequestMiddleware: Function ) => {
        // -> Build web server
        this.serverType = serverType
        this.buildWebServer(mongoBase, archangeRequestMiddleware)
    }

    public run = () => {
        const interfaceAddress = this.engineConfig.infrastructure.web.interface && this.engineConfig.infrastructure.web.interface.address || undefined
        const succesRunMessage = `heaven web server has correctly start at < ${interfaceAddress || ''}:${this.engineConfig.infrastructure.web.port} >`
        const httpServer = this.webLink?.listen(
            this.engineConfig.infrastructure.web.port,
            interfaceAddress,
            undefined,
            () => {
                this.adlogs.writeRuntimeEvent({
                    category: 'heaven',
                    type: 'info',
                    message: succesRunMessage
                })
            }
        )

        httpServer?.on('error', (err) => {
            this.adlogs.writeRuntimeEvent({
                category: 'heaven',
                type: 'stop',
                message: `enabled to run heaven web server because < ${err.message} >`,
                save: true
            })
        })

        return succesRunMessage
    }
}

export default Heaven