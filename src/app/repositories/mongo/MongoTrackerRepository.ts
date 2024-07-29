import { MongoClient, MongoError, ObjectId } from "mongodb"
import Utils from "#utils/index.js"
import ITrackerRepository from "../ITrackerRepository"
import TrackerEntity from "#app/entities/tracker.js"

class MongoTrackerRepository implements ITrackerRepository {
    private collection
    constructor(mongoClient: MongoClient, dbName: string){
        const db = mongoClient.db(dbName)
        this.collection = db.collection<TrackerEntity>('tracker')
        db.listCollections().toArray().then(async info => {
            const collIndex = info.findIndex(x => x.name === 'tracker')
            if(collIndex === -1) await db.createCollection('tracker')
            db.command({
                "collMod": "tracker", 
                "validator": Utils.makeMongoSchemaValidation([
                    { name: 'brand', type: 'string', required: true },
                    { name: 'model', type: 'string', required: true },
                    { name: 'imei', type: 'string', required: true },
                    { name: 'sn', type: 'string', required: true },
                    { name: 'sim', type: 'string', required: true },
                    { name: 'adding_date', type: 'number', required: true },
                    { name: 'state', type: 'string', required: true },
                ])
            })
        })
    }

    async getTracker(id: string): Promise<{ data?: TrackerEntity | null; err?: string }> {
        try {
            const result = await this.collection.findOne({ _id: new ObjectId(id) })
            if(result){
                return { data: new TrackerEntity(
                    result.brand,
                    result.model,
                    result.imei,
                    result.sn,
                    result.sim,
                    result.adding_date,
                    result.state,
                    result._id.toString()
                ) }
            }

            return { data: null }
        } catch (error) {
            return { err: error instanceof MongoError && error.message || '' }
        }
    }

    async getTrackers(): Promise<{ data?: TrackerEntity[]; err?: string }> {
        try {
            const result = (await this.collection.find().toArray()).map(x => new TrackerEntity(
                x.brand,
                x.model,
                x.imei,
                x.sn,
                x.sim,
                x.adding_date,
                x.state,
                x._id.toString()
            ))
            return { data: result }
        } catch (error) {
            return { err: error instanceof MongoError && error.message || '' }
        }
    }

    async getTrackerByIMEI(imei: string): Promise<{ data?: TrackerEntity | null; err?: string }> {
        try {
            const result = await this.collection.findOne({ imei: imei })
            if(result){
                return { data: new TrackerEntity(
                    result.brand,
                    result.model,
                    result.imei,
                    result.sn,
                    result.sim,
                    result.adding_date,
                    result.state,
                    result._id.toString()
                ) }
            }

            return { data: null }
        } catch (error) {
            return { err: error instanceof MongoError && error.message || '' }
        }
    }

    async getAvailableTracker(): Promise<{ data?: TrackerEntity[]; err?: string }> {
        try {
            const result = (await this.collection.find({ state: { $in: ['inventory', 'unpaired'] } }).toArray()).map(x => new TrackerEntity(
                x.brand,
                x.model,
                x.imei,
                x.sn,
                x.sim,
                x.adding_date,
                x.state,
                x._id.toString()
            ))
            return { data: result }
        } catch (error) {
            return { err: error instanceof MongoError && error.message || '' }
        }
    }

    async addTracker(tracker: TrackerEntity): Promise<{ data?: TrackerEntity | null; err?: string }> {
        try {
            delete tracker.id
            const result = await this.collection.insertOne({ ...tracker })
            if(result.insertedId) tracker.id = result.insertedId.toString()
            return {
                data: result.insertedId && tracker || null,
                err: ''
            }
        } catch (error) {
            return {
                data: null,
                err: error instanceof MongoError && error.message || ''
            }
        }
    }

    async setTrackerStatut(id: string, statut: TrackerEntity["state"]): Promise<{ data?: boolean; err?: string }> {
        try {
            const result = await this.collection.updateOne({ _id: new ObjectId(id) }, { $set: { state: statut } }, { upsert: false }) 
            return { data: Boolean(result.modifiedCount), err: '' }
        } catch (error) {
            return { data: false, err: error instanceof MongoError && error.message || '' }
        }
    }

    async removeTracker(id: string): Promise<{ data?: boolean; err?: string }> {
        try {
            const result = await this.collection.deleteOne({ _id: new ObjectId(id) }) 
            return { data: Boolean(result.deletedCount), err: '' }
        } catch (error) {
            return { data: false, err: error instanceof MongoError && error.message || '' }
        }
    }
}

export default MongoTrackerRepository