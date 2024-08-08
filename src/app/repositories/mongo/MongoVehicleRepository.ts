import { MongoClient, MongoError, ObjectId } from "mongodb"
import Utils from "#utils/index.js"
import IVehicleRepository from "../IVehicleRepository"
import VehicleEntity from "#app/entities/vehicle.js"
import MongoUserRepository from "./MongoUserRepository"

class MongoVehicleRepository implements IVehicleRepository {
    private collection
    private userRepository
    constructor(mongoClient: MongoClient, dbName: string){
        this.userRepository = new MongoUserRepository(mongoClient, dbName)

        const db = mongoClient.db(dbName)
        this.collection = db.collection<VehicleEntity>('vehicle')
        db.listCollections().toArray().then(async info => {
            const collIndex = info.findIndex(x => x.name === 'vehicle')
            if(collIndex === -1) await db.createCollection('vehicle')
            
            db.command({
                "collMod": "vehicle", 
                "validator": Utils.makeMongoSchemaValidation([
                    { name: 'brand', type: 'string', required: true },
                    { name: 'model', type: 'string', required: true },
                    { name: 'numberplate', type: 'string', required: true },
                    { name: 'type', type: 'string', required: true },
                    { name: 'group', type: 'string', required: true },
                    { name: 'driver', type: 'string', required: true },
                    { name: 'customer', type: 'string', required: true },
                    { name: 'maxspeed', type: 'number', required: true },
                    { name: 'state', type: 'string', required: true },
                    { name: 'adding_date', type: 'number', required: true }
                ])
            })
        })
    }
    
    async addVehicle(vehicle: VehicleEntity): Promise<{ data?: VehicleEntity | null; err?: string }> {
        try {
            delete vehicle.id
            const result = await this.collection.insertOne({ ...vehicle })
            if(result.insertedId) vehicle.id = result.insertedId.toString()
            return {
                data: result.insertedId && vehicle || null,
                err: ''
            }
        } catch (error) {
            return {
                data: null,
                err: error instanceof MongoError && error.message || ''
            }
        }
    }

    async getVehicle(id: string): Promise<{ data?: VehicleEntity | null; err?: string }> {
        try {
            const result = await this.collection.findOne({ _id: new ObjectId(id) })
            if(result){
                const customer = await this.userRepository.getUserByID(result.customer.toString())
                if(customer.data){
                    return { data: new VehicleEntity(
                        result.brand,
                        result.model,
                        result.numberplate,
                        result.type,
                        result.group,
                        result.driver,
                        customer.data,
                        result.maxspeed,
                        result.state,
                        result.adding_date,
                        result._id.toString()
                    ) }
                }else return { data: null }
            }

            return { data: null }
        } catch (error) {
            return { err: error instanceof MongoError && error.message || '' }
        }
    }

    async getVehicles(): Promise<{ data?: VehicleEntity[]; err?: string }> {
        try {
            const result = (await this.collection.find().toArray()).map(x => new VehicleEntity(
                x.brand,
                x.model,
                x.numberplate,
                x.type,
                x.group,
                x.driver,
                x.customer,
                x.maxspeed,
                x.state,
                x.adding_date,
                x._id.toString()
            ))
            return { data: result }
        } catch (error) {
            return { err: error instanceof MongoError && error.message || '' }
        }
    }
    async getVehicleByCustomer(customer: string): Promise<{ data?: VehicleEntity[] | null; err?: string }> {
        try {
            const result = (await this.collection.find({ customer: customer }).toArray()).map(x => new VehicleEntity(
                x.brand,
                x.model,
                x.numberplate,
                x.type,
                x.group,
                x.driver,
                x.customer,
                x.maxspeed,
                x.state,
                x.adding_date,
                x._id.toString()
            ))
            return { data: result }
        } catch (error) {
            return { err: error instanceof MongoError && error.message || '' }
        }
    }

    async editVehicle(id: string, numberplate: string, group: string, driver: string, speed: number): Promise<{ data?: boolean; err?: string }> {
        try {
            const result = await this.collection.updateOne({ _id: new ObjectId(id) }, { $set: {
                numberplate: numberplate,
                group: group,
                driver: driver,
                maxspeed: speed
            } }, { upsert: false })            
            return { data: Boolean(result.modifiedCount), err: '' }
        } catch (error) {
            console.log(JSON.stringify(error));
            
            return { data: false, err: error instanceof MongoError && error.message || '' }
        }
    }

    async setVehicleStatut(id: string, statut: VehicleEntity["state"]): Promise<{ data?: boolean; err?: string }> {
        try {
            const result = await this.collection.updateOne({ _id: new ObjectId(id) }, { $set: { state: statut } }, { upsert: false })            
            return { data: Boolean(result.modifiedCount), err: '' }
        } catch (error) {
            console.log(JSON.stringify(error));
            
            return { data: false, err: error instanceof MongoError && error.message || '' }
        }
    }

    async removeVehicle(id: string): Promise<{ data?: boolean; err?: string }> {
        try {
            const result = await this.collection.deleteOne({ _id: new ObjectId(id) }) 
            return { data: Boolean(result.deletedCount), err: '' }
        } catch (error) {
            return { data: false, err: error instanceof MongoError && error.message || '' }
        }
    }
}

export default MongoVehicleRepository