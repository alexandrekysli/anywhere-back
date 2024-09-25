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
import MongoUserRepository from "#app/repositories/mongo/MongoUserRepository.js"
import SetPairingIORelayState from "#app/services/set-pairing-io-relay-state.js"
import MongoFenceAreaRepository from "#app/repositories/mongo/MongoFenceAreaRepository.js"
import SetFenceArea from "#app/services/set-fence-area.js"
import GetFenceAreas from "#app/services/get-fence-areas.js"

/** TS */
interface AddNewPairingRequest extends ExpressFractalRequest {
    body: { id: string, to: string }
}
interface SetPairingFenceAreaRequest extends ExpressFractalRequest {
    body: { id: string, fenceAreaID: string }
}
interface PairingEventRequest extends ExpressFractalRequest { body: { id: string } }
interface PairingIOStateChangeRequest extends ExpressFractalRequest { body: { id: string, state: boolean, pass_hash: string } }


export default (adlogs: Adlogs, archange: Archange, mongoClient: MongoClient) => {
    const { router } = new HeavenExpressRouter(adlogs, archange, mongoClient)
    /** ### Load Repositories ### */
    const pairingRepository = new MongoPairingRepository(mongoClient, 'anywhere')
    const pairingEventRepository = new MongoPairingEventRepository(mongoClient, 'anywhere')
    const pairingTripRepository = new MongoPairingTripRepository(mongoClient, 'anywhere')
    const trackerRepository = new MongoTrackerRepository(mongoClient, 'anywhere')
    const vehicleRepository = new MongoVehicleRepository(mongoClient, 'anywhere')
    const userRepository = new MongoUserRepository(mongoClient, 'anywhere')
    const fenceAreaRepository = new MongoFenceAreaRepository(mongoClient, 'anywhere')

    /** ### Load Services ### */
    const addNewPairing = new AddNewPairing(adlogs, pairingRepository, vehicleRepository, trackerRepository)
    const getLocationName = new GetLocationName(adlogs, pairingEventRepository)
    const makeAllAlertRead = new MakeAllAlertRead(adlogs, pairingEventRepository)
    const getPairingTrips = new GetPairingTrips(adlogs, pairingTripRepository)
    const setPairingIORelayState = new SetPairingIORelayState(adlogs, pairingRepository, userRepository)
    const getFenceAreas = new GetFenceAreas(adlogs, pairingRepository, fenceAreaRepository)
    const setFenceArea = new SetFenceArea(adlogs, pairingRepository)

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

    router.post('/set-pairing-io-relay-state', async(req: PairingIOStateChangeRequest, res) => {
        const caller = archange.getArchangeCallerByIdentifier(String(req.session.archange_hash || req.session.heaven_kf || ''))
        if(caller){
            const exeResult = await setPairingIORelayState.execute(req.body.id, req.body.state, req.body.pass_hash)
            if(exeResult.pass) caller.remainDereckAccess = 5
            else caller.remainDereckAccess--
            
            res.json(Utils.makeHeavenResponse(res, exeResult))
        }
    })

    router.post('/get-trips', async(req: PairingEventRequest, res) => {
        const tripList = await getPairingTrips.execute(req.body.id)
        res.json(Utils.makeHeavenResponse(res, tripList))
    })

    router.post('/get-fence-area', async(req: PairingEventRequest, res) => {
        const areaList = await getFenceAreas.execute(req.body.id)
        res.json(Utils.makeHeavenResponse(res, areaList))
    })

    router.post('/set-fence-area', async(req: SetPairingFenceAreaRequest, res) => {
        const exeResult = await setFenceArea.execute(req.body.id, req.body.fenceAreaID)
        res.json(Utils.makeHeavenResponse(res, exeResult))
    })

    return router
}