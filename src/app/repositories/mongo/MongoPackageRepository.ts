import { MongoClient, MongoError, ObjectId } from "mongodb"
import Utils from "#utils/index.js"
import IPackageRepository from "../IPackageRepository"
import PackageEntity from "#app/entities/package.js"

class MongoSubscriptionRepository implements IPackageRepository {
    private collection
    constructor(mongoClient: MongoClient, dbName: string){
        const db = mongoClient.db(dbName)
        this.collection = db.collection<PackageEntity>('package')
        db.listCollections().toArray().then(async info => {
            const collIndex = info.findIndex(x => x.name === 'package')
            if(collIndex === -1) await db.createCollection('package')
            
            db.command({
                "collMod": "package", 
                "validator": Utils.makeMongoSchemaValidation([
                    { name: 'name', type: 'string', required: true },
                    { name: 'day_validity', type: 'number', required: true },
                    { name: 'fleet_count', type: 'number', required: true },
                    { name: 'amount', type: 'number', required: true },
                    { name: 'accessibility', type: 'string', required: true },
                    { name: 'adding_date', type: 'number', required: true },
                    { name: 'allowed_option', type: 'complexe', required: true, data: {
                        bsonType: ['array'],
                        items: { bsonType: 'string' }
                    } },
                ])
            })
        })
    }
    
    async addPackage(_package: PackageEntity): Promise<{ data?: PackageEntity | null; err?: string }> {
        try {
            delete _package.id
            const result = await this.collection.insertOne({ ..._package })
            if(result.insertedId) _package.id = result.insertedId.toString()
            return {
                data: result.insertedId && _package || null,
                err: ''
            }
        } catch (error) {
            return {
                data: null,
                err: error instanceof MongoError && error.message || ''
            }
        }
    }

    async getPackages(): Promise<{ data?: PackageEntity[]; err?: string }> {
        try {
            const result = (await this.collection.find().toArray()).map(x => new PackageEntity(
                x.name,
                x.day_validity,
                x.fleet_count,
                x.amount,
                x.accessibility,
                x.allowed_option,
                x.adding_date,
                x._id.toString()
            ))
            return { data: result }
        } catch (error) {
            return { err: error instanceof MongoError && error.message || '' }
        }
    }

    async getPackageByID(id: string): Promise<{ data?: PackageEntity | null; err?: string }> {
        try {
            const result = await this.collection.findOne({ _id: new ObjectId })
            if(result){
                const _package = new PackageEntity(
                    result.name,
                    result.day_validity,
                    result.fleet_count,
                    result.amount,
                    result.accessibility,
                    result.allowed_option,
                    result.adding_date,
                    result._id.toString()
                )
                return { data: _package }
            }else return { data: null }
        } catch (error) {
            return { err: error instanceof MongoError && error.message || '' }
        }
    }

    
}

export default MongoSubscriptionRepository