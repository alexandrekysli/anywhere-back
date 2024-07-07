import IAdlogsRepository from "./IAdlogsRepository"
import { MongoClient, MongoError } from "mongodb"
import Utils from "#utils/index.js"

/**
 * Adlogs Repository
 * ---
 * MongoDB
 * --
 * k-engine
 */


class Repository extends IAdlogsRepository{
    private adlogsCollection
    constructor(mongoClient: MongoClient, dbName: string){
        super()
        const db = mongoClient.db(dbName)
        this.adlogsCollection = db.collection<AdlogSavedItem>('adlogs')
        db.listCollections().toArray().then(async info => {
            const collIndex = info.findIndex(x => x.name === 'adlogs')
            if(collIndex === -1) await db.createCollection('adlogs')

            db.command({
                "collMod": "adlogs",
                "validator": Utils.makeMongoSchemaValidation([
                    { name: 'type', type: 'string', required: true },
                    { name: 'category', type: 'string', required: true },
                    { name: 'message', type: 'string', required: true },
                    { name: 'date', type: 'number', required: true }
                ])
            })
        })
    }

    save = async (item: AdlogSavedItem): Promise<{ state: boolean; err: string }> => {
        try {
            await this.adlogsCollection.insertOne(item)
            return { state: true, err: '' }
        } catch (error) {
            return { state: false, err: error instanceof MongoError && error.message || '' }
        }
    }

}

export default Repository