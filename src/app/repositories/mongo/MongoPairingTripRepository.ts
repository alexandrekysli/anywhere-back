import { MongoClient, MongoError, ObjectId } from "mongodb"
import Utils from "#utils/index.js"
import IPairingTripRepository from "../IPairingTripRepository"
import PairingTripEntity from "#app/entities/pairing-trip.js"
import MongoPairingEventRepository from "./MongoPairingEventRepository"
import PairingEventEntity from "#app/entities/pairing-event.js"

class MongoPairingTripRepository implements IPairingTripRepository {
    private collection
    private pairingEventRepository

    constructor(mongoClient: MongoClient, dbName: string){
        this.pairingEventRepository = new MongoPairingEventRepository(mongoClient, dbName)

        const db = mongoClient.db(dbName)
        this.collection = db.collection<PairingTripEntity>('pairing-trip')
        db.listCollections().toArray().then(async info => {
            const collIndex = info.findIndex(x => x.name === 'pairing-trip')
            if(collIndex === -1) await db.createCollection('pairing-trip')
            
            db.command({
                "collMod": "pairing-trip", 
                "validator": Utils.makeMongoSchemaValidation([
                    { name: 'date', type: 'number', required: true },
                    { name: 'pairing', type: 'string', required: true },
                    { name: 'events', type: 'complexe', required: true, data: {
                        bsonType: ['array'],
                        items: { bsonType: 'string' }
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

    async getPairingTrips(pairing: string): Promise<{ data?: PairingTripEntity[]; err?: string }> {
        const pairingTrip: PairingTripEntity[] = []
        try {
            const result = (await this.collection.find({ pairing: pairing }).toArray())

            for (const trip of result) {
                const eventList: PairingEventEntity[] = []
                for (const event of trip.events) {
                    const eventData = (await this.pairingEventRepository.getPairingEvent(event.toString())).data
                    eventData && eventList.push(eventData)
                }
                trip.events = eventList

                pairingTrip.push(new PairingTripEntity(
                    trip.date,
                    trip.events,
                    trip.pairing,
                    trip._id.toString()
                ))
            }

            return { data: pairingTrip }
        } catch (error) {
            return { err: error instanceof MongoError && error.message || '' }
        }
    }
}

export default MongoPairingTripRepository 