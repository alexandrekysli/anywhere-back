/**
 * # Rock
 * Versatile Manager for Database and System file \
 * k-engine
 */

/* ### Load Node modules ### */
import Adlogs from "../adlogs"
import config from "../../config";
import { MongoClient } from "mongodb"


/**
 * Rock MongoDB wrapper
 */
export class MongoBase {
    private adlogs: Adlogs
    public client: MongoClient

    constructor(adlogs: Adlogs, mongoConfig: typeof config.infrastructure.database.mongo) {
        this.adlogs = adlogs

        // -> Make MongoDB connexion d
        this.client = new MongoClient(
            'mongodb://'
            + mongoConfig.user
            + ':'
            + mongoConfig.password
            + '@'
            + mongoConfig.host
            + '/?authSource=admin'
        )

        this.makeConnection()
    }

    private makeConnection = async () => {
        try {
            await this.client.connect()
            await this.client.db('admin').command({ ping: 1 })
            this.adlogs.writeRuntimeEvent({
                type: 'info',
                category: 'rock',
                message: 'mongodb server has correctly start'
            })
        } catch (err) {
            this.client.close()
            this.adlogs.writeRuntimeEvent({
                type: 'stop',
                category: 'rock',
                message: `mongodb server starting error : ${err}`,
                save: true
            })
        }
    }
}