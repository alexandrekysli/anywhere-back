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
import MongoHellRepository from "./core/archange/repositories/mongo/MongoHellRepository"
import MongoCallerRepository from "./core/archange/repositories/mongo/MongoCallerRepository"
import MongoOriginRepository from "./core/archange/repositories/mongo/MongoOriginRepository"
import MongoArchangeUserRepository from "./core/archange/repositories/mongo/MongoUserRepository"
import TrackingBot from "./modules/tracking-bot"
import MongoTrackerRepository from "#app/repositories/mongo/MongoTrackerRepository.js"
import MongoPairingRepository from "#app/repositories/mongo/MongoPairingRepository.js"
import MongoPairingEventRepository from "#app/repositories/mongo/MongoPairingEventRepository.js"
import MongoPairingTripRepository from "#app/repositories/mongo/MongoPairingTripRepository.js"
import MongoUserRepository from "#app/repositories/mongo/MongoUserRepository.js"
import MongoVehicleRepository from "#app/repositories/mongo/MongoVehicleRepository.js"
import MongoSubscriptionRepository from "#app/repositories/mongo/MongoSubscriptionRepository.js"
import MongoFenceAreaRepository from "#app/repositories/mongo/MongoFenceAreaRepository.js"


/* ### -> App initialisation ### */

// -> ### Core critical
const adlogs = new Adlogs()
const mongoBase = new MongoBase(adlogs, engineConfig.infrastructure.database.mongo)

// -> ### Repositories
const archangeCallerRepository = new MongoCallerRepository(mongoBase.client, 'anywhere')
const archangeOriginRepository = new MongoOriginRepository(mongoBase.client, 'anywhere')
const archangeHellRepository = new MongoHellRepository(mongoBase.client, 'anywhere')
const archangeUserRepository = new MongoArchangeUserRepository(mongoBase.client, 'anywhere')
const appUserRepository = new MongoUserRepository(mongoBase.client, 'anywhere')
const appVehicleRepository = new MongoVehicleRepository(mongoBase.client, 'anywhere')
const appSubscriptionRepository = new MongoSubscriptionRepository(mongoBase.client, 'anywhere')
const appTrackerRepository = new MongoTrackerRepository(mongoBase.client, 'anywhere')
const appPairingRepository = new MongoPairingRepository(mongoBase.client, 'anywhere')
const appPairingEventRepository = new MongoPairingEventRepository(mongoBase.client, 'anywhere')
const appPairingTripRepository = new MongoPairingTripRepository(mongoBase.client, 'anywhere')
const appFenceAreaRepository = new MongoFenceAreaRepository(mongoBase.client, 'anywhere')

// -> ### Core
const heaven = new Heaven(adlogs, engineConfig)
const archange = new Archange(
    adlogs,
    engineConfig.infrastructure.archange,
    archangeCallerRepository,
    archangeOriginRepository,
    archangeHellRepository,
    archangeUserRepository,
    appUserRepository
)

// -> ### Application
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
            appUserRepository,
            appVehicleRepository,
            appSubscriptionRepository,
            appTrackerRepository,
            appPairingRepository,
            appPairingEventRepository,
            appPairingTripRepository,
            appFenceAreaRepository
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