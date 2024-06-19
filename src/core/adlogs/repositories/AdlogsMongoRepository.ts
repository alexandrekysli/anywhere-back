import IAdlogsRepository from "./IAdlogsRepository"
import { MongoClient, MongoServerError } from "mongodb"
import Utils from "#utils/index.js"

/**
 * Adlogs Repository
 * ---
 * MongoDB
 * --
 * Anywhere
 */


class Repository extends IAdlogsRepository{
    private db
    private adlogsCollection
    constructor(mongoClient: MongoClient){
        super()
        this.db = mongoClient.db('adlogs')
        this.adlogsCollection = this.db.collection<AdlogSavedItem>('logs')
        this.db.command({
            "collMod": "logs",
            "validator": Utils.makeMongoSchemaValidation([
                { name: 'type', type: 'string', required: true },
                { name: 'category', type: 'string', required: true },
                { name: 'message', type: 'string', required: true },
                { name: 'date', type: 'number', required: true }
            ])
        })
    }

    addNewLogItem = async (item: AdlogSavedItem): Promise<{ state: boolean; err: string }> => {
        try {
            await this.adlogsCollection.insertOne(item)
            return { state: true, err: '' }
        } catch (error) {
            return { state: false, err: error instanceof MongoServerError && error.message || '' }
        }

    }

}

export default Repository