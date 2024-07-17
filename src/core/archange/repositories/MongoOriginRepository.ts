import IOriginRepository from "./IOriginRepository"

import { MongoClient, MongoError, ObjectId } from "mongodb"
import OriginEntity from "../entities/origin"

interface OriginCollection {
    ip: string,
    since: number,
    last_activity: number,
    caller: string,
    identifier: string,
    agent: {
        client: { name: string, version: string },
        os: { name: string, version: string }
    }
}

class OriginRepository implements IOriginRepository {
    private collection
    constructor(mongoClient: MongoClient, dbName: string){
        const db = mongoClient.db(dbName)
        this.collection = db.collection<OriginCollection>('archange-origin')
        db.listCollections().toArray().then(async info => {
            const collIndex = info.findIndex(x => x.name === 'archange-origin')
            if(collIndex === -1) await db.createCollection('archange-origin')
            
            db.command({
                "collMod": "archange-origin",
                "validator": {
                    $jsonSchema: {
                        bsonType: 'object',
                        required: [ 'ip', 'since', 'last_activity', 'identifier', 'agent'],
                        additionalProperties: false,
                        properties: {
                            _id: {},
                            ip: {
                                bsonType: 'string',
                                description: 'ip is required and must be a string'
                            },
                            since: {
                                bsonType: 'number',
                                description: 'since is required and must be a number'
                            },
                            last_activity: {
                                bsonType: 'number',
                                description: 'last_activity is required and must be a number'
                            },
                            caller: {
                                bsonType: 'string',
                                description: 'caller is required and must be a string'
                            },
                            identifier: {
                                bsonType: 'string',
                                description: 'identifier is required and must be a string'
                            },
                            agent: {
                                bsonType: 'object',
                                required: ['client', 'os'],
                                additionalProperties: false,
                                properties: {
                                    client: {
                                        bsonType: 'object',
                                        required: ['name', 'version'],
                                        additionalProperties: false,
                                        properties: {
                                            name: {
                                                bsonType: 'string',
                                                description: 'name is required and must be a string'
                                            },
                                            version: {
                                                bsonType: 'string',
                                                description: 'version is required and must be a string'
                                            }
                                        }
                                    },
                                    os: {
                                        bsonType: 'object',
                                        required: ['name', 'version'],
                                        additionalProperties: false,
                                        properties: {
                                            name: {
                                                bsonType: 'string',
                                                description: 'name is required and must be a string'
                                            },
                                            version: {
                                                bsonType: 'string',
                                                description: 'version is required and must be a string'
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            })
        })
    }

    async getOriginByCaller(callerIdentifier: string): Promise<{ data: OriginEntity[]; err: string }> {
        try {
            const callerOriginCollectionList = await this.collection.find({ caller : callerIdentifier }).toArray()
            return {
                data: callerOriginCollectionList.length && callerOriginCollectionList.map(x => new OriginEntity(
                    x._id.toString(),
                    x.ip,
                    x.since,
                    x.last_activity,
                    x.caller,
                    x.identifier,
                    x.agent
                )) || [],
                err: ''
            }
        } catch (error) {
            return { data: [], err: error instanceof MongoError && error.message || '' }
        }
    }

    async addOrigin(origin: OriginEntity): Promise<{ data: OriginEntity | null; err: string }> {
        try {
            const newOriginDocument = await this.collection.insertOne({
                ip: origin.ip,
                since: origin.since,
                last_activity: origin.lastActivity,
                caller: origin.caller,
                identifier: origin.identifier,
                agent: origin.agent
            })
            origin.id = newOriginDocument.insertedId.toString()
            return { data: origin, err: '' }
        } catch (error) {            
            return { data: null, err: error instanceof MongoError && error.message || '' }
        }
    }

    async updateOriginActivity(originID: string, lastActivity: number): Promise<{ data: boolean; err: string }> {
        try {
            const result = await this.collection.updateOne({ _id: new ObjectId(originID) }, { $set: { last_activity: lastActivity } }, { upsert: false }) 
            return { data: Boolean(result.modifiedCount), err: '' }
        } catch (error) {
            return { data: false, err: error instanceof MongoError && error.message || '' }
        }
    }
}

export default OriginRepository