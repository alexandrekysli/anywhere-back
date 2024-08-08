import Adlogs from "#core/adlogs/index.js"
import Archange from "#core/archange/index.js"
import Utils from "#utils/index.js"
import { ExpressFractalRequest, HeavenExpressRouter } from "#core/heaven/routers.js"

import { MongoClient } from "mongodb"
import MongoTrackerRepository from "#app/repositories/mongo/MongoTrackerRepository.js"
import MongoPairingRepository from "#app/repositories/mongo/MongoPairingRepository.js"
import AddNewPairing from "#app/services/add-new-pairing.js"
import MongoVehicleRepository from "#app/repositories/mongo/MongoVehicleRepository.js"
import GetLocationName from "#app/services/get-location-name.js"
import MongoPairingEventRepository from "#app/repositories/mongo/MongoPairingEventRepository.js"
import MakeAllAlertRead from "#app/services/make-all-alert-read.js"
import GetPairingTrips from "#app/services/get-pairing-trips.js"
import MongoPairingTripRepository from "#app/repositories/mongo/MongoPairingTripRepository.js"

/** TS */
interface AddNewPairingRequest extends ExpressFractalRequest {
    body: { id: string, to: string }
}
interface PairingEventRequest extends ExpressFractalRequest { body: { id: string } }


export default (adlogs: Adlogs, archange: Archange, mongoClient: MongoClient) => {
    const { router } = new HeavenExpressRouter(adlogs, archange, mongoClient)
    /** ### Load Repositories ### */
    const pairingRepository = new MongoPairingRepository(mongoClient, 'anywhere')
    const pairingEventRepository = new MongoPairingEventRepository(mongoClient, 'anywhere')
    const pairingTripRepository = new MongoPairingTripRepository(mongoClient, 'anywhere')
    const trackerRepository = new MongoTrackerRepository(mongoClient, 'anywhere')
    const vehicleRepository = new MongoVehicleRepository(mongoClient, 'anywhere')

    /** ### Load Services ### */
    const addNewPairing = new AddNewPairing(adlogs, pairingRepository, vehicleRepository, trackerRepository)
    const getLocationName = new GetLocationName(adlogs, pairingEventRepository)
    const makeAllAlertRead = new MakeAllAlertRead(adlogs, pairingEventRepository)
    const getPairingTrips = new GetPairingTrips(adlogs, pairingTripRepository)

    /** ### Router dispatching ### */
    router.post('/add', async(req: AddNewPairingRequest, res) => {
        const result = await addNewPairing.execute(req.body.id, req.body.to)
        res.json(Utils.makeHeavenResponse(res, result))
    })

    router.post('/get-location', async(req: PairingEventRequest, res) => {
        const result = await getLocationName.execute(req.body.id)
        res.json(Utils.makeHeavenResponse(res, result))
    })

    router.post('/make-all-alert-read', async(req: PairingEventRequest, res) => {
        const exeResult = await makeAllAlertRead.execute(req.body.id)
        res.json(Utils.makeHeavenResponse(res, exeResult))
    })

    router.post('/get-trips', async(req: PairingEventRequest, res) => {
        const tripList = await getPairingTrips.execute(req.body.id)
        res.json(Utils.makeHeavenResponse(res, tripList))
    })

    

    return router
}