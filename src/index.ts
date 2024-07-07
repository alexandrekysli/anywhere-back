/**
 * Anywhere 1.0
 * ---
 * k-engine backend application
 * ---
 * Write with ❤️ by Alexandre kYsLi\
 * © 2024 BeTech CI
 */

import engineConfig from "./config"
import Adlogs from "./core/adlogs"
import Heaven from "./core/heaven"
import Archange from "./core/archange"
import { MongoBase } from "./core/rock"

// -> Repositories
import MongoAdlogsRepository from "./core/adlogs/repositories/MongoAdlogsRepository"
import MongoHellRepository from "./core/archange/repositories/MongoHellRepository"
import MongoCallerRepository from "./core/archange/repositories/MongoCallerRepository"
import MongoOriginRepository from "./core/archange/repositories/MongoOriginRepository"


/* ### -> App initialisation ### */
const adlogs = new Adlogs()
const heaven = new Heaven(adlogs, engineConfig)
const mongoBase = new MongoBase(adlogs, engineConfig.infrastructure.database.mongo)
const archange = new Archange(
    adlogs,
    engineConfig.infrastructure.archange,
    new MongoCallerRepository(mongoBase.client, 'anywhere'),
    new MongoOriginRepository(mongoBase.client, 'anywhere'),
    new MongoHellRepository(mongoBase.client, 'anywhere')
)

adlogs.writeRuntimeEvent({ category: 'global', type: 'info', message: 'k-engine is starting' })
adlogs.setRepo(new MongoAdlogsRepository(mongoBase.client, 'anywhere'))

// -> Check if good app configuration
if(engineConfig.error){
    adlogs.writeRuntimeEvent({
        category: 'global',
        type: 'stop',
        message: `bad configuration - ${engineConfig.error} -`, save: true 
    })
} else {
    // ### -> App configuration good -> next step ...

    // -> Initialize heaven web server when session store has start
    adlogs.listenRuntimeEventMessage('mongodb server has correctly start', () => {
        heaven.init('express', mongoBase, archange.expressMiddleware)
    }, true)

    // -> Run heaven when is ready
    adlogs.listenRuntimeEventMessage('web server configuration complete', () => {
        const succesRunMessage = heaven.run()
        adlogs.listenRuntimeEventMessage(succesRunMessage, () => {
            adlogs.writeRuntimeEvent({
                category: 'global',
                type: 'ready',
                message: `k-engine has start`,
                save: false
            })
        }, true)
    }, true)
}

