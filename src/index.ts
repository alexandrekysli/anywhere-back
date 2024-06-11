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
import { MongoBase } from "./core/rock"
import MongoAdlogsRepository from "./infrastructure/database/adlogs/MongoAdlogsRepository"


/* ### -> App initialisation ### */
const adlogs = new Adlogs()
const mongoBase = new MongoBase(adlogs, engineConfig.infrastructure.database.mongo)
adlogs.setRepo(new MongoAdlogsRepository(mongoBase.client, engineConfig["ke-app-id"]))



adlogs.writeRuntimeEvent({ category: 'global', type: 'info', message: 'k-engine is starting'})

// -> Check config state
if(engineConfig.error) adlogs.writeRuntimeEvent({ category: 'global', type: 'stop', message: `bad configuration - ${engineConfig.error} -`, save: true })
else adlogs.writeRuntimeEvent({ category: 'global', type: 'info', message: 'good configuration data' })

