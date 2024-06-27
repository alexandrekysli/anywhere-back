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
import { MongoBase } from "./core/rock"
import AdlogsMongoRepository from "./core/adlogs/repositories/AdlogsMongoRepository"


/* ### -> App initialisation ### */
const adlogs = new Adlogs()
const heaven = new Heaven(adlogs, engineConfig)
const mongoBase = new MongoBase(adlogs, engineConfig.infrastructure.database.mongo)

adlogs.writeRuntimeEvent({ category: 'global', type: 'info', message: 'k-engine is starting' })
adlogs.setRepo(new AdlogsMongoRepository(mongoBase.client))

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
        heaven.init('express', mongoBase)
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

