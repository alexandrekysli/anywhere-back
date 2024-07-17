import { MongoClient, MongoError, ObjectId } from "mongodb"
import Utils from "#utils/index.js"
import IPairingTripRepository from "../IPairingTripRepository"
import PairingTripEntity from "#app/entities/pairing-trip.js"

class MongoPairingTripRepository implements IPairingTripRepository {
    private collection
    constructor(mongoClient: MongoClient, dbName: string){
        const db = mongoClient.db(dbName)
        this.collection = db.collection<PairingTripEntity>('pairing-trip')
        db.listCollections().toArray().then(async info => {
            const collIndex = info.findIndex(x => x.name === 'pairing-trip')
            if(collIndex === -1) await db.createCollection('pairing-trip')
            
            db.command({
                "collMod": "pairing-trip", 
                "validator": Utils.makeMongoSchemaValidation([
                    { name: 'date', type: 'number', required: true },
                    { name: 'points', type: 'complexe', required: true, data: {
                        bsonType: ['array'],
                        items: {
                            bsonType: 'object',
                            required: ['lat', 'lng'],
                            additionalProperties: false,
                            properties: {
                                lat: {
                                    bsonType: 'number',
                                    description: 'lat is required and must be a number'
                                },
                                lng: {
                                    bsonType: 'number',
                                    description: 'lng is required and must be a number'
                                }
                            }
                        }
                    }}
                ])
            })
        })
    }

    async addTrip(trip: PairingTripEntity): Promise<{ data?: PairingTripEntity | null; err?: string }> {
        try {
            delete trip.id
            const result = await this.collection.insertOne({ ...trip })
            if(result.insertedId) trip.id = result.insertedId.toString()
            return {
                data: result.insertedId && trip || null,
                err: ''
            }
        } catch (error) {
            return {
                data: null,
                err: error instanceof MongoError && error.message || ''
            }
        }
    }

    async getPairingTrip(pairing: string): Promise<{ data?: PairingTripEntity[]; err?: string }> {
        try {
            const result = (await this.collection.find({ pairing: pairing }).toArray()).map(x => new PairingTripEntity(
                x.date,
                x.points,
                x._id.toString()
            ))
            return { data: result }
        } catch (error) {
            return { err: error instanceof MongoError && error.message || '' }
        }
    }

    async addTripPoints(id: string, positions: PairingTripEntity["points"]): Promise<{ data?: boolean; err?: string }> {
        try {
            let count = 0
            for (const position of positions) {
                const result = await this.collection.updateOne({ _id: new ObjectId(id) }, { $push: { points : position } }, { upsert: false })
                count += result.modifiedCount
            }
            return { data: Boolean(count === positions.length), err: '' }
        } catch (error) {
            return { data: false, err: error instanceof MongoError && error.message || '' }
        }
    }

    async updateTripPointLocation(id: string, index: number, name: string): Promise<{ data?: boolean; err?: string }> {
        try {
            const value = `points.${index}.name`
            const result = await this.collection.updateOne({ _id: new ObjectId(id) }, { $set: { value: name } }, { upsert: false })
            return { data: Boolean(result.modifiedCount), err: '' }
        } catch (error) {
            return { data: false, err: error instanceof MongoError && error.message || '' }
        }
    }
}

export default MongoPairingTripRepository 