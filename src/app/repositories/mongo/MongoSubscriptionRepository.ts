import { MongoClient, MongoError } from "mongodb"
import ISubscriptionRepository from "../ISubscriptionRepository"
import Utils from "#utils/index.js"
import SubscriptionEntity from "#app/entities/subscription.js"
import MongoUserRepository from "./MongoUserRepository"
import MongoPackageRepository from "./MongoPackageRepository"
import MongoVehicleRepository from "./MongoVehicleRepository"

class MongoSubscriptionRepository implements ISubscriptionRepository {
    private collection
    private userRepository
    private packageRepository
    private vehicleRepository
    constructor(mongoClient: MongoClient, dbName: string){
        this.userRepository = new MongoUserRepository(mongoClient, dbName)
        this.packageRepository = new MongoPackageRepository (mongoClient, dbName)
        this.vehicleRepository = new MongoVehicleRepository (mongoClient, dbName)

        const db = mongoClient.db(dbName)
        this.collection = db.collection<SubscriptionEntity>('subscription')
        db.listCollections().toArray().then(async info => {
            const collIndex = info.findIndex(x => x.name === 'subscription')
            if(collIndex === -1) await db.createCollection('subscription')
            
            db.command({
                "collMod": "subscription", 
                "validator": Utils.makeMongoSchemaValidation([
                    { name: 'string', type: 'string', required: true },
                    { name: 'manager', type: 'string', required: true },
                    { name: '_package', type: 'string', required: true },
                    { name: 'adding_date', type: 'number', required: true },
                    { name: 'starting_date', type: 'number', required: true },
                    { name: 'package_quantity', type: 'number', required: true },
                    { name: 'state', type: 'bool', required: true },
                    { name: 'vehicle', type: 'complexe', required: true, data: {
                        bsonType: ['array'],
                        items: { bsonType: 'string' }
                    }},
                ])
            })
        })
    }
    
    async addSubscription(subscription: SubscriptionEntity): Promise<{ data?: SubscriptionEntity | null; err?: string }> {
        try {
            delete subscription.id
            const result = await this.collection.insertOne({ ...subscription })
            if(result.insertedId) subscription.id = result.insertedId.toString()
            return {
                data: result.insertedId && subscription || null,
                err: ''
            }
        } catch (error) {
            return {
                data: null,
                err: error instanceof MongoError && error.message || ''
            }
        }
    }

    async getSubscriptionByCustomer(customer: string): Promise<{ data?: SubscriptionEntity[]; err?: string }> {
        const subscriptionList = []
        try {
            const result = (await this.collection.find({ customer: customer }).toArray())
            for (const subscription of result) {
                // -> Retrieve dependency
                const customer = await this.userRepository.getUserByID(subscription.customer.toString())
                const manager = await this.userRepository.getUserByID(subscription.manager.toString())
                const _package = await this.packageRepository.getPackageByID(subscription._package.toString())
                const vehicle = await this.vehicleRepository.getVehicleByCustomer(subscription.customer.toString())

                if(customer.data && manager.data && _package.data && vehicle.data){
                    subscriptionList.push(new SubscriptionEntity(
                        customer.data,
                        manager.data,
                        _package.data,
                        subscription.adding_date,
                        subscription.starting_date,
                        subscription.package_quantity,
                        vehicle.data,
                        subscription.state,
                        subscription._id.toString()
                    ))
                }
            }
            return { data: subscriptionList }
        } catch (error) {
            return { err: error instanceof MongoError && error.message || '' }
        }
    }

    async getActiveSubscriptionByCustomer(customer: string): Promise<{ data?: SubscriptionEntity[]; err?: string }> {
        const activeSubscriptionList: SubscriptionEntity[] = []
        try {
            const result = (await this.collection.find({ customer: customer }).toArray())
            for (const subscription of result) {
                // -> Retrieve dependency
                const _package = await this.packageRepository.getPackageByID(subscription._package.toString())
                const vehicle = await this.vehicleRepository.getVehicleByCustomer(subscription.customer.toString())

                subscription._package = _package.data || ''
                if(vehicle.data && subscription.status && subscription.status() === 'actual'){
                    activeSubscriptionList.push(new SubscriptionEntity(
                        subscription.customer,
                        subscription.manager,
                        subscription._package,
                        subscription.adding_date,
                        subscription.starting_date,
                        subscription.package_quantity,
                        vehicle.data,
                        subscription.state,
                        subscription._id.toString()
                    ))
                }
            }
            return { data: activeSubscriptionList }
        } catch (error) {
            return { err: error instanceof MongoError && error.message || '' }
        }
    }
    
}

export default MongoSubscriptionRepository