import { MongoClient, MongoError, ObjectId } from "mongodb"
import ISubscriptionRepository from "../ISubscriptionRepository"
import Utils from "#utils/index.js"
import SubscriptionEntity from "#app/entities/subscription.js"
import MongoUserRepository from "./MongoUserRepository"
import MongoPackageRepository from "./MongoPackageRepository"
import MongoVehicleRepository from "./MongoVehicleRepository"
import VehicleEntity from "#app/entities/vehicle.js"

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
                    { name: 'customer', type: 'string', required: true },
                    { name: 'manager', type: 'string', required: true },
                    { name: 'qte', type: 'number', required: true },
                    { name: '_package', type: 'string', required: true },
                    { name: 'starting_date', type: 'number', required: true },
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

    async getSubscription(id: string): Promise<{ data?: SubscriptionEntity | null; err?: string }> {
        try {
            const subscription = await this.collection.findOne({ _id: new ObjectId(id) })
            if(subscription){
                // -> Retrieve dependency
                const customer = await this.userRepository.getUserByID(subscription.customer.toString())
                const manager = await this.userRepository.getUserByID(subscription.manager.toString())
                const _package = await this.packageRepository.getPackageByID(subscription._package.toString())
                const vehicles: VehicleEntity[] = []
                
                for (const vehicle of subscription.vehicle) {
                    const _vehicle = await this.vehicleRepository.getVehicle(vehicle.toString())
                    _vehicle.data && vehicles.push(_vehicle.data)
                }

                //console.log(vehicles)
                
                if(customer.data && manager.data && _package.data ){
                    return { data: new SubscriptionEntity(
                        customer.data,
                        manager.data,
                        _package.data,
                        subscription.qte,
                        subscription.starting_date,
                        vehicles,
                        subscription.state,
                        subscription._id.toString()
                    ) }
                }
            }
            return { data: null } 
        } catch (error) {
            return { err: error instanceof MongoError && error.message || '' }
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

                if(customer.data && manager.data && _package.data){
                    subscriptionList.push(new SubscriptionEntity(
                        customer.data,
                        manager.data,
                        _package.data,
                        subscription.qte,
                        subscription.starting_date,
                        subscription.vehicle,
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

    async getLastSubscriptionByCustomer(customer: string): Promise<{ data?: SubscriptionEntity | null; err?: string }> {
        try {
            const result = (await this.collection.find({ customer: customer, state: true }).toArray())

            let lastSubscription: SubscriptionEntity | null = null
            let lastSubscriptionEndDate = 0
            for (const _subscription of result) {
                const subscription = new SubscriptionEntity(
                    _subscription.customer,
                    _subscription.manager,
                    _subscription._package,
                    _subscription.qte,
                    _subscription.starting_date,
                    _subscription.vehicle,
                    _subscription.state,
                    _subscription._id.toString()
                )

                const _package = await this.packageRepository.getPackageByID(subscription._package.toString())
                subscription._package = _package.data || ''
                
                if(subscription.endDate && subscription.endDate() > lastSubscriptionEndDate){
                    lastSubscription = subscription
                    lastSubscriptionEndDate = subscription.endDate()
                }
            }
            return { data: lastSubscription }
        } catch (error) {
            return { err: error instanceof MongoError && error.message || '' }
        }
    }

    async getActiveSubscriptionByCustomer(customer: string): Promise<{ data?: SubscriptionEntity[]; err?: string }> {
        const activeSubscriptionList: SubscriptionEntity[] = []
        try {
            const result = (await this.collection.find({ customer: customer }).toArray())            
            for (const _subscription of result) {
                const subscription = new SubscriptionEntity(
                    _subscription.customer,
                    _subscription.manager,
                    _subscription._package,
                    _subscription.qte,
                    _subscription.starting_date,
                    _subscription.vehicle,
                    _subscription.state,
                    _subscription._id.toString()
                )

                // -> Retrieve dependency
                const _package = await this.packageRepository.getPackageByID(subscription._package.toString())
                subscription._package = _package.data || ''
                
                if(subscription.status && subscription.status() === 'actual'){
                    activeSubscriptionList.push(subscription)
                }
            }
            return { data: activeSubscriptionList }
        } catch (error) {
            return { err: error instanceof MongoError && error.message || '' }
        }
    }

    async getSubscriptionByPackage(_package: string): Promise<{ data?: SubscriptionEntity[]; err?: string }> {
        const subscriptionList = []
        try {
            const result = (await this.collection.find({ _package: _package }).toArray())
            for (const subscription of result) {
                // -> Retrieve dependency
                const customer = await this.userRepository.getUserByID(subscription.customer.toString())
                const manager = await this.userRepository.getUserByID(subscription.manager.toString())
                const _package = await this.packageRepository.getPackageByID(subscription._package.toString())

                if(customer.data && manager.data && _package.data){
                    subscriptionList.push(new SubscriptionEntity(
                        customer.data,
                        manager.data,
                        _package.data,
                        subscription.qte,
                        subscription.starting_date,
                        subscription.vehicle,
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

    async getSubscriptionByVehicle(vehicle: string): Promise<{ data?: SubscriptionEntity[]; err?: string }> {
        const subscriptionList = []
        try {
            const result = (await this.collection.find({ vehicle: vehicle }).toArray())
            
            for (const subscription of result) {
                // -> Retrieve dependency
                const customer = await this.userRepository.getUserByID(subscription.customer.toString())
                const manager = await this.userRepository.getUserByID(subscription.manager.toString())
                const _package = await this.packageRepository.getPackageByID(subscription._package.toString())

                if(customer.data && manager.data && _package.data){
                    subscriptionList.push(new SubscriptionEntity(
                        customer.data,
                        manager.data,
                        _package.data,
                        subscription.qte,
                        subscription.starting_date,
                        subscription.vehicle,
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

    async setSubscriptionFleet(id: string, vehicle: string[]): Promise<{ data?: boolean; err?: string }> {
        try {
            const result = await this.collection.updateOne({ _id: new ObjectId(id) }, { $set: { vehicle : vehicle } }, { upsert: false }) 
            return { data: Boolean(result.modifiedCount), err: '' }
        } catch (error) {
            return { data: false, err: error instanceof MongoError && error.message || '' }
        }
    }

    async suspendSubscription(id: string): Promise<{ data?: boolean; err?: string }> {
        try {
            const result = await this.collection.updateOne({ _id: new ObjectId(id) }, { $set: { state : false } }, { upsert: false }) 
            return { data: Boolean(result.modifiedCount), err: '' }
        } catch (error) {
            return { data: false, err: error instanceof MongoError && error.message || '' }
        }
    }
    
}

export default MongoSubscriptionRepository