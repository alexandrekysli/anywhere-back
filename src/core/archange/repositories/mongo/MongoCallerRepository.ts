import Utils from "#utils/index.js"

import { MongoClient, MongoError } from "mongodb"
import ICallerRepository from "../interfaces/ICallerRepository"
import CallerEntity from "#core/archange/entities/caller.js"

interface CallerCollection { identifier: string, type: 'ip' | 'known' | 'user' }

class CallerRepository implements ICallerRepository {
    private collection
    constructor(mongoClient: MongoClient, dbName: string){
        const db = mongoClient.db(dbName)
        this.collection = db.collection<CallerCollection>('archange-caller')
        db.listCollections().toArray().then(async info => {
            const collIndex = info.findIndex(x => x.name === 'archange-caller')
            if(collIndex === -1) await db.createCollection('archange-caller')

            db.command({
                "collMod": "archange-caller", 
                "validator": Utils.makeMongoSchemaValidation([
                    { name: 'identifier', type: 'string', required: true },
                    { name: 'type', type: 'string', required: true }
                ])
            })
        })
    }

    async getCallerByIdentifier(identifier: string): Promise<{ data: CallerEntity | null; err: string }> {
        try {
            const caller = await this.collection?.findOne({ identifier: identifier })
            return {
                data: caller && new CallerEntity(caller._id.toString(), caller.type, caller.identifier) || null,
                err: ''
            }
        } catch (error) {
            return {
                data: null,
                err: error instanceof MongoError && error.message || ''
            }
        }
    }

    async addCaller(caller: CallerEntity): Promise<{ data: CallerEntity | null; err: string }> {
        try {
            const result = await this.collection?.insertOne({ type: caller.type, identifier: caller.identifier })
            return {
                data: result.insertedId && new CallerEntity(result.insertedId.toString(), caller.type, caller.identifier) || null,
                err: ''
            }
        } catch (error) {
            return {
                data: null,
                err: error instanceof MongoError && error.message || ''
            }
        }
    }
}

export default CallerRepository