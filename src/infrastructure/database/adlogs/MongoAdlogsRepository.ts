import IAdlogsRepository from "#interfaces/repositories/core/adlogs/IAdlogsRepository.js"
import { Db, MongoClient } from "mongodb"

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
    constructor(mongoClient: MongoClient, private keAppKey: string){
        super()
        this.db = mongoClient.db('adlogs')
        this.adlogsCollection = this.db.collection<AdlogSavedItem>('logs')
        this.init()
    }

    init = async () => {
        await this.db.command({
            "collMod": "logs",
            "validator": {
                $jsonSchema: {
                    bsonType: "object",
                    required: ["ke-app-id", "type", "category", "message", "date"],
                    additionalProperties: false,
                    properties: {
                        _id: {},
                        "ke-app-id": { bsonType: "string" },
                        type: { bsonType: "string" },
                        category: { bsonType: "string" },
                        message: { bsonType: "string" },
                        date: { bsonType: "number" }
                    }
                }
            }
        })
    }

    addNewLogItem = async (item: AdlogSavedItem): Promise<{ state: boolean; err: string }> => {
        const pItem: AdlogSavedItem = {...item, "ke-app-id": this.keAppKey}
        const r = (await this.adlogsCollection.insertOne(pItem)).insertedId
        return { state: true, err: '' }
    }

}

export default Repository