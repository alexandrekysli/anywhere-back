import { MongoClient, MongoError, ObjectId } from "mongodb"
import Utils from "#utils/index.js"
import IPairingEventRepository from "../IPairingEventRepository"
import PairingEventEntity from "#app/entities/pairing-event.js"

class MongoPairingEventRepository implements IPairingEventRepository {
    private collection
    constructor(mongoClient: MongoClient, dbName: string){
        const db = mongoClient.db(dbName)
        this.collection = db.collection<PairingEventEntity>('pairing-event')
        db.listCollections().toArray().then(async info => {
            const collIndex = info.findIndex(x => x.name === 'pairing-event')
            if(collIndex === -1) await db.createCollection('pairing-event')
            
            db.command({
                "collMod": "pairing-event", 
                "validator": Utils.makeMongoSchemaValidation([
                    { name: 'date', type: 'number', required: true },
                    { name: 'type', type: 'string', required: true },
                    { name: 'alert', type: 'string', required: true },
                    { name: 'read', type: 'bool', required: true },
                    { name: 'localisation', type: 'complexe', required: true, data: {
                        bsonType: 'object',
                        required: ['gps', 'location'],
                        additionalProperties: false,
                        properties: {
                            gps: {
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
                            },
                            location: {
                                bsonType: 'string',
                                description: 'location is required and must be a string'
                            }
                        }
                    }},
                    { name: 'orientation', type: 'number', required: true },
                    { name: 'speed', type: 'number', required: true },
                    { name: 'altitude', type: 'number', required: true },
                    { name: 'odometer', type: 'number', required: true },
                    { name: 'battery', type: 'complexe', required: true, data: {
                        bsonType: 'object',
                        required: ['level', 'charging'],
                        additionalProperties: false,
                        properties: {
                            level: {
                                bsonType: 'number',
                                description: 'level is required and must be a number'
                            },
                            charging: {
                                bsonType: 'bool',
                                description: 'charging is required and must be a boolean'
                            }
                        }
                    } },
                    { name: 'network_level', type: 'number', required: true },
                ])
            })
        })
    }

    async addEvent(event: PairingEventEntity): Promise<{ data?: PairingEventEntity | null; err?: string }> {
        try {
            delete event.id
            const result = await this.collection.insertOne({ ...event })
            if(result.insertedId) event.id = result.insertedId.toString()
            return {
                data: result.insertedId && event || null,
                err: ''
            }
        } catch (error) {
            return {
                data: null,
                err: error instanceof MongoError && error.message || ''
            }
        }
    }

    async getPairingEvent(pairing: string): Promise<{ data?: PairingEventEntity[]; err?: string }> {
        try {
            const result = (await this.collection.find({ pairing: pairing }).toArray()).map(x => new PairingEventEntity(
                x.date,
                x.type,
                x.alert,
                x.read,
                x.localisation,
                x.orientation,
                x.speed,
                x.altitude,
                x.odometer,
                x.battery,
                x.network_level,
                x.pairing,
                x._id.toString()
            ))
            return { data: result }
        } catch (error) {
            return { err: error instanceof MongoError && error.message || '' }
        }
    }

    async readEvent(id: string): Promise<{ data?: boolean; err?: string }> {
        try {
            const result = await this.collection.updateOne({ _id: new ObjectId(id) }, { $set: { state: true } }, { upsert: false }) 
            return { data: Boolean(result.modifiedCount), err: '' }
        } catch (error) {
            return { data: false, err: error instanceof MongoError && error.message || '' }
        }
    }

    async updateEventLocation(id: string, name: string): Promise<{ data?: boolean; err?: string }> {
        try {
            const result = await this.collection.updateOne({ _id: new ObjectId(id) }, { $set: { 'localisation.location' : name } }, { upsert: false }) 
            return { data: Boolean(result.modifiedCount), err: '' }
        } catch (error) {
            return { data: false, err: error instanceof MongoError && error.message || '' }
        }
    }
}

export default MongoPairingEventRepository 