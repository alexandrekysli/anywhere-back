import Utils from "#utils/index.js"

import IRepository from "../interfaces/IHellRepository"
import HellItemEntity from "../../entities/hell"

import { MongoClient, MongoError, ObjectId } from "mongodb"

interface HellItem {
    id?: string,
    identity: string,
    mode: 'delayed' | 'ban',
    from: number,
    to: number
}

class HellRepository implements IRepository {
    private collection
    constructor(mongoClient: MongoClient, dbName: string){
        const db = mongoClient.db(dbName)
        this.collection = db.collection<HellItem>('archange-hell')
        db.listCollections().toArray().then(async info => {
            const collIndex = info.findIndex(x => x.name === 'archange-hell')
            if(collIndex === -1) await db.createCollection('archange-hell')

            db.command({
                "collMod": "archange-hell",
                "validator": Utils.makeMongoSchemaValidation([
                    { name: 'identity', type: 'string', required: true },
                    { name: 'mode', type: 'string', required: true },
                    { name: 'from', type: 'number', required: true },
                    { name: 'to', type: 'number', required: true }
                ])
            })
        })
    }

    async getItem(identity: string): Promise<{ data: HellItemEntity | null; err: string }> {
        try {
            const result = await this.collection.findOne({ identity: identity })
            return {
                data: result && new HellItemEntity(result._id.toString(), result.identity, result.mode, result.from, result.to) || null,
                err: ''
            }
        } catch (error){
            return {
                data: null,
                err: error instanceof MongoError && error.message || ''
            }
        }
    }

    async addItem(identity: string, mode: "delayed" | "ban", time: number): Promise<{ data: HellItemEntity | null; err: string }> {
        try {
            const nowDate = Date.now()
            const result = await this.collection.insertOne({
                identity: identity,
                mode: mode,
                from: nowDate,
                to: nowDate + time
            })
            return {
                data: result.insertedId && new HellItemEntity(result.insertedId.toString(), identity, mode, nowDate, nowDate + time) || null,
                err: ''
            }
        } catch (error) {
            return {
                data: null,
                err: error instanceof MongoError && error.message || ''
            }
        }
    }

    async removeItemByEndStayTime(identity: string, to: number): Promise<{ data: number | null; err: string }> {
        try {
            return {
                data: (await this.collection.deleteMany({ identity: identity, to: { $lt: to }})).deletedCount,
                err: ''
            }
        } catch (error) {
            return {
                data: null,
                err: error instanceof MongoError && error.message || ''
            }
        }
    }

    async updateItemHellMode(item: HellItemEntity, mode: HellItemEntity["mode"], time: number): Promise<{ data: boolean; err: string }> {
        const nowDate = Date.now()
        item.mode = mode
        item.from = nowDate
        item.to = nowDate + time
        try {
            const result = await this.collection.updateOne({ _id: new ObjectId(item.id) }, { $set: { mode: mode, from: nowDate, to: nowDate + time } }, { upsert: false }) 
            return { data: Boolean(result.modifiedCount), err: '' }
        } catch (error) {
            return { data: false, err: error instanceof MongoError && error.message || '' }
        }
    }
}

export default HellRepository