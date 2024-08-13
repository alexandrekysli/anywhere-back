import { MongoClient, MongoError, ObjectId } from "mongodb"
import Utils from "#utils/index.js"
import IFenceAreaRepository from "../IFenceAreaRepository"
import FenceAreaEntity from "#app/entities/fence-area.js"

class MongoFenceAreaRepository implements IFenceAreaRepository {
    private collection
    constructor(mongoClient: MongoClient, dbName: string){
        const db = mongoClient.db(dbName)
        this.collection = db.collection<FenceAreaEntity>('fence-area')
        db.listCollections().toArray().then(async info => {
            const collIndex = info.findIndex(x => x.name === 'fence-area')
            if(collIndex === -1) await db.createCollection('fence-area')
            
            db.command({
                "collMod": "fence-area", 
                "validator": Utils.makeMongoSchemaValidation([
                    { name: 'name', type: 'string', required: true },
                    { name: 'geometry', type: 'complexe', required: true, data: {
                        bsonType: 'object',
                        required: ['type', 'coordinates'],
                        additionalProperties: false,
                        properties: {
                            type: {
                                bsonType: 'string',
                                description: 'type is required and must be a string'
                            },
                            coordinates: {
                                bsonType: ['array'],
                                items: {
                                    bsonType: ['array'],
                                    items: { 
                                        items: {
                                            bsonType: ['array'],
                                            items: { bsonType: 'number' }
                                        }
                                    }
                                }
                            },
                        }
                    } }
                ])
            })
        })
    }

    async getAreas(): Promise<{ data?: FenceAreaEntity[]; err?: string }> {
        try {
            const result = (await this.collection.find().toArray()).map(x => new FenceAreaEntity(
                x.name,
                x.geometry,
                x._id.toString()
            ))
            return { data: result }
        } catch (error) {
            return { err: error instanceof MongoError && error.message || '' }
        }
    }

    async getArea(id: string): Promise<{ data?: FenceAreaEntity | null; err?: string }> {
        try {
            const result = await this.collection.findOne({ _id: new ObjectId(id) })
            if(result){
                const area = new FenceAreaEntity(
                    result.name,
                    result.geometry,
                    result._id.toString()
                )
                return { data: area }
            }else return { data: null }
        } catch (error) {
            return { err: error instanceof MongoError && error.message || '' }
        }
    }

    async checkPositionInArea(position: Coordinates, areaID: string): Promise<{ data?: "in" | "out"; err?: string }> {
        try {
            const result = await this.collection.findOne({ _id: new ObjectId(areaID), geometry: { $geoIntersects: { $geometry: { 'type': 'Point', 'coordinates': [position.lng, position.lat] } } } })
            return { data: result ? 'in' : 'out' }
        } catch (error) {            
            return { err: error instanceof MongoError && error.message || '' }
        }
    }

}

export default MongoFenceAreaRepository