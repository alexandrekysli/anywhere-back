import { MongoClient, MongoError, ObjectId } from "mongodb"
import Utils from "#utils/index.js"
import IPairingRepository from "../IPairingRepository"
import MongoTrackerRepository from "./MongoTrackerRepository"
import MongoVehicleRepository from "./MongoVehicleRepository"
import PairingEntity from "#app/entities/pairing.js"
import MongoPairingEventRepository from "./MongoPairingEventRepository"
import MongoPairingTripRepository from "./MongoPairingTripRepository"
import PairingEventEntity from "#app/entities/pairing-event.js"
import PairingTripEntity from "#app/entities/pairing-trip.js"

class MongoPairingRepository implements IPairingRepository {
    private collection
    private vehicleRepository
    private trackerRepository
    private pairingEventRepository
    private pairingTripRepository

    constructor(mongoClient: MongoClient, dbName: string){
        this.vehicleRepository = new MongoVehicleRepository(mongoClient, dbName)
        this.trackerRepository = new MongoTrackerRepository(mongoClient, dbName)
        this.pairingEventRepository = new MongoPairingEventRepository(mongoClient, dbName)
        this.pairingTripRepository = new MongoPairingTripRepository(mongoClient, dbName)

        const db = mongoClient.db(dbName)
        this.collection = db.collection<PairingEntity>('pairing')
        db.listCollections().toArray().then(async info => {
            const collIndex = info.findIndex(x => x.name === 'pairing')
            if(collIndex === -1) await db.createCollection('pairing')
            
            db.command({
                "collMod": "pairing", 
                "validator": Utils.makeMongoSchemaValidation([
                    { name: 'identifier', type: 'string', required: true },
                    { name: 'vehicle', type: 'string', required: true },
                    { name: 'tracker', type: 'string', required: true },
                    { name: 'begin_date', type: 'number', required: true },
                    { name: 'end_date', type: 'number', required: true },
                    { name: 'geofence', type: 'string', required: true },
                    { name: 'state', type: 'string', required: true },
                    { name: 'last_state_date', type: 'number', required: true },
                    { name: 'event_list', type: 'complexe', required: true, data: {
                        bsonType: ['array'],
                        items: { bsonType: 'string' }
                    }},
                    { name: 'trip_list', type: 'complexe', required: true, data: {
                        bsonType: ['array'],
                        items: { bsonType: 'string' }
                    }}
                ])
            })
        })
    }
    
    async addPairing(pairing: PairingEntity): Promise<{ data?: PairingEntity | null; err?: string }> {
        try {
            delete pairing.id
            const result = await this.collection.insertOne({ ...pairing })
            if(result.insertedId) pairing.id = result.insertedId.toString()
            return {
                data: result.insertedId && pairing || null,
                err: ''
            }
        } catch (error) {
            return {
                data: null,
                err: error instanceof MongoError && error.message || ''
            }
        }
    }

    async getPairingbyTracker(tracker: string, full: boolean): Promise<{ data?: PairingEntity[]; err?: string }> {
        const pairingList: PairingEntity[] = []
        try {
            const result = await this.collection.find({ tracker: tracker }).toArray()
            for (const pairing of result) {
                // -> Retrieve dependency
                const vehicle = await this.vehicleRepository.getVehicle(pairing.vehicle.toString())
                if(vehicle.data){
                    let pairingEvent: PairingEventEntity[] | undefined
                    let pairingTrip: PairingTripEntity[] | undefined
                    if(full){
                        const pairingEventResult = await this.pairingEventRepository.getPairingEvents(pairing._id.toString())
                        const pairingTripResult = await this.pairingTripRepository.getPairingTrips(pairing._id.toString())
                        if(pairingEventResult.data && pairingTripResult.data){
                            pairingEvent = pairingEventResult.data
                            pairingTrip = pairingTripResult.data
                        }else return { data: [] }
                    }

                    pairingList.push(new PairingEntity(
                        pairing.identifier,
                        vehicle.data,
                        pairing.tracker,
                        pairing.begin_date,
                        pairing.end_date,
                        pairing.geofence,
                        pairing.state,
                        pairing.last_state_date,
                        full && pairingEvent ? pairingEvent : pairing.event_list,
                        full && pairingTrip ? pairingTrip : pairing.trip_list,
                        pairing._id.toString()
                    ))
                }
            }
            return { data: pairingList }
        } catch (error) {
            return { err: error instanceof MongoError && error.message || '' }
        }
    }

    async getHeathlyPairingbyTracker(tracker: string): Promise<{ data?: PairingEntity | null; err?: string }> {
        try {
            const pairing = await this.collection.findOne({ tracker: tracker, state: 'heathly' })
            if(pairing){
                return { data: new PairingEntity(
                    pairing.identifier,
                    pairing.vehicle,
                    pairing.tracker,
                    pairing.begin_date,
                    pairing.end_date,
                    pairing.geofence,
                    pairing.state,
                    pairing.last_state_date,
                    pairing.event_list,
                    pairing.trip_list,
                    pairing._id.toString()
                ) }
            }
            return { data: null }
        } catch (error) {
            return { err: error instanceof MongoError && error.message || '' }
        }
    }

    async getPairingbyVehicle(vehicle: string, full: boolean): Promise<{ data?: PairingEntity[]; err?: string }> {
        const pairingList: PairingEntity[] = []
        try {
            const result = await this.collection.find({ vehicle: vehicle }).toArray()
            for (const pairing of result) {
                // -> Retrieve dependency
                const tracker = await this.trackerRepository.getTracker(pairing.tracker.toString())
                if(tracker.data){
                    let pairingEvent: PairingEventEntity[] | undefined
                    let pairingTrip: PairingTripEntity[] | undefined
                    if(full){
                        const pairingEventResult = await this.pairingEventRepository.getPairingEvents(pairing._id.toString())
                        const pairingTripResult = await this.pairingTripRepository.getPairingTrips(pairing._id.toString())
                        if(pairingEventResult.data && pairingTripResult.data){
                            pairingEvent = pairingEventResult.data
                            pairingTrip = pairingTripResult.data
                        }else return { data: [] }
                    }

                    pairingList.push(new PairingEntity(
                        pairing.identifier,
                        pairing.vehicle,
                        tracker.data,
                        pairing.begin_date,
                        pairing.end_date,
                        pairing.geofence,
                        pairing.state,
                        pairing.last_state_date,
                        full && pairingEvent ? pairingEvent : pairing.event_list,
                        full && pairingTrip ? pairingTrip : pairing.trip_list,
                        pairing._id.toString()
                    ))
                }
            }
            return { data: pairingList }
        } catch (error) {
            return { err: error instanceof MongoError && error.message || '' }
        }
    }

    async getAllPairing(full: boolean): Promise<{ data?: PairingEntity[]; err?: string }> {
        const pairingList: PairingEntity[] = []
        try {
            const result = await this.collection.find().toArray()
            for (const pairing of result) {
                // -> Retrieve dependency
                const vehicle = await this.vehicleRepository.getVehicle(pairing.vehicle.toString())
                const tracker = await this.trackerRepository.getTracker(pairing.tracker.toString())
                if(vehicle.data && tracker.data){
                    let pairingEvent: PairingEventEntity[] | undefined
                    let pairingTrip: PairingTripEntity[] | undefined
                    if(full){
                        const pairingEventResult = await this.pairingEventRepository.getPairingEvents(pairing._id.toString())
                        const pairingTripResult = await this.pairingTripRepository.getPairingTrips(pairing._id.toString())
                        if(pairingEventResult.data && pairingTripResult.data){
                            pairingEvent = pairingEventResult.data
                            pairingTrip = pairingTripResult.data
                        }else return { data: [] }
                    }

                    pairingList.push(new PairingEntity(
                        pairing.identifier,
                        vehicle.data,
                        tracker.data,
                        pairing.begin_date,
                        pairing.end_date,
                        pairing.geofence,
                        pairing.state,
                        pairing.last_state_date,
                        full && pairingEvent ? pairingEvent : pairing.event_list,
                        full && pairingTrip ? pairingTrip : pairing.trip_list,
                        pairing._id.toString()
                    ))
                }
            }
            return { data: pairingList }
        } catch (error) {
            return { err: error instanceof MongoError && error.message || '' }
        }
    }

    async getPairing(id: string): Promise<{ data?: PairingEntity | null; err?: string }> {
        try {
            const pairing = await this.collection.findOne({ _id: new ObjectId(id) })
            if(pairing){
                // -> Retrieve dependency
                const vehicle = await this.vehicleRepository.getVehicle(pairing.vehicle.toString())
                const tracker = await this.trackerRepository.getTracker(pairing.tracker.toString())
                const pairingEvent = await this.pairingEventRepository.getPairingEvents(pairing._id.toString())
                const pairingTrip = await this.pairingTripRepository.getPairingTrips(pairing._id.toString())
                if(vehicle.data && tracker.data && pairingEvent.data && pairingTrip.data){
                    return { data: new PairingEntity(
                        pairing.identifier,
                        vehicle.data,
                        tracker.data,
                        pairing.begin_date,
                        pairing.end_date,
                        pairing.geofence,
                        pairing.state,
                        pairing.last_state_date,
                        [pairingEvent.data[pairingEvent.data.length - 1]],
                        pairingTrip.data,
                        pairing._id.toString()
                    ) }
                }
            }
            return { data: null }
        } catch (error) {
            return { err: error instanceof MongoError && error.message || '' }
        }
    }

    async setPairingState(id: string, state: PairingEntity["state"]): Promise<{ data?: boolean; err?: string }> {
        try {
            const endDate = !['inventory', 'paired'].includes(state) ? Date.now() : undefined
            const result = await this.collection.updateOne({ _id: new ObjectId(id) }, { $set: { state : state, end_date: endDate } }, { upsert: false }) 
            return { data: Boolean(result.modifiedCount), err: '' }
        } catch (error) {
            return { data: false, err: error instanceof MongoError && error.message || '' }
        }
    }

    async setPairingGeofence(id: string, fenceArea: string): Promise<{ data?: boolean; err?: string }> {
        try {
            const result = await this.collection.updateOne({ _id: new ObjectId(id) }, { $set: { geofence : fenceArea } }, { upsert: false }) 
            return { data: Boolean(result.modifiedCount), err: '' }
        } catch (error) {
            return { data: false, err: error instanceof MongoError && error.message || '' }
        }
    }

    async setPairingLastStateDate(id: string, date: number): Promise<{ data?: boolean; err?: string }> {
        try {
            const result = await this.collection.updateOne({ _id: new ObjectId(id) }, { $set: { last_state_date : date } }, { upsert: false }) 
            return { data: Boolean(result.modifiedCount), err: '' }
        } catch (error) {
            return { data: false, err: error instanceof MongoError && error.message || '' }
        }
    }


}

export default MongoPairingRepository