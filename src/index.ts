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
import MongoArchangeUserRepository from "./core/archange/repositories/MongoUserRepository"
import TrackingBot from "./modules/tracking-bot"
import MongoTrackerRepository from "#app/repositories/mongo/MongoTrackerRepository.js"
import MongoPairingRepository from "#app/repositories/mongo/MongoPairingRepository.js"
import MongoPairingEventRepository from "#app/repositories/mongo/MongoPairingEventRepository.js"
import MongoPairingTripRepository from "#app/repositories/mongo/MongoPairingTripRepository.js"
import MongoUserRepository from "#app/repositories/mongo/MongoUserRepository.js"
import MongoVehicleRepository from "#app/repositories/mongo/MongoVehicleRepository.js"
import MongoSubscriptionRepository from "#app/repositories/mongo/MongoSubscriptionRepository.js"


/* ### -> App initialisation ### */ 
const adlogs = new Adlogs()
const heaven = new Heaven(adlogs, engineConfig)
const mongoBase = new MongoBase(adlogs, engineConfig.infrastructure.database.mongo)
const archange = new Archange(
    adlogs,
    engineConfig.infrastructure.archange,
    new MongoCallerRepository(mongoBase.client, 'anywhere'),
    new MongoOriginRepository(mongoBase.client, 'anywhere'),
    new MongoHellRepository(mongoBase.client, 'anywhere'),
    new MongoArchangeUserRepository(mongoBase.client, 'anywhere')
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
        heaven.init('express', mongoBase, archange)
    }, true)

    // -> Run heaven & TrackingBot when is ready
    adlogs.listenRuntimeEventMessage('web server configuration complete', () => {
        const succesRunMessage = heaven.run()
        
        heaven.webLink && new TrackingBot(
            engineConfig,
            adlogs,
            heaven.webLink,
            archange,
            new MongoUserRepository(mongoBase.client, 'anywhere'),
            new MongoVehicleRepository(mongoBase.client, 'anywhere'),
            new MongoSubscriptionRepository(mongoBase.client, 'anywhere'),
            new MongoTrackerRepository(mongoBase.client, 'anywhere'),
            new MongoPairingRepository(mongoBase.client, 'anywhere'),
            new MongoPairingEventRepository(mongoBase.client, 'anywhere'),
            new MongoPairingTripRepository(mongoBase.client, 'anywhere')
        )

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