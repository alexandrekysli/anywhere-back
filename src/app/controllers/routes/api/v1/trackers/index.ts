import Adlogs from "#core/adlogs/index.js"
import Archange from "#core/archange/index.js"
import Utils from "#utils/index.js"
import { ExpressFractalRequest, HeavenExpressRouter } from "#core/heaven/routers.js"

import { MongoClient } from "mongodb"
import GetAvailableTracker from "#app/services/get-available-tracker.js"
import MongoTrackerRepository from "#app/repositories/mongo/MongoTrackerRepository.js"
import AddNewTracker from "#app/services/add-new-tracker.js"
import GetTrackerList from "#app/services/get-tracker-list.js"
import GetTrackerPairingList from "#app/services/get-tracker-pairing.js"
import MongoPairingRepository from "#app/repositories/mongo/MongoPairingRepository.js"
import GetTracker from "#app/services/get-tracker.js"
import SetTrackerState from "#app/services/set-tracker-state.js"
import DeleteTracker from "#app/services/delete-tracker.js"

/** TS */
interface TrackerRequest extends ExpressFractalRequest { body: { id: string } }
interface AddNewTrackerRequest extends ExpressFractalRequest {
    body: {
        data: {
            brand: string,
            model: string,
            imei: string,
            sn: string,
            sim: string
        }
    }
}
interface SetTrackerStateRequest extends ExpressFractalRequest {
    body: {
        id: string,
        pairingID: string,
        state: 'inventory' | 'paired' | 'unpaired' | 'lost' | 'broken'
    }
}

export default (adlogs: Adlogs, archange: Archange, mongoClient: MongoClient) => {
    const { router } = new HeavenExpressRouter(adlogs, archange, mongoClient)
    /** ### Load Repositories ### */
    const trackerRepository = new MongoTrackerRepository(mongoClient, 'anywhere')
    const pairingRepository = new MongoPairingRepository(mongoClient, 'anywhere')

    /** ### Load Services ### */
    const getTrackerList = new GetTrackerList(adlogs, trackerRepository)
    const getTracker = new GetTracker(adlogs, trackerRepository)
    const getAvailableTracker = new GetAvailableTracker(adlogs, trackerRepository)
    const getTrackerPairingList = new GetTrackerPairingList(adlogs, pairingRepository)
    const addNewTracker = new AddNewTracker(adlogs, trackerRepository)
    const setTrackerState = new SetTrackerState(adlogs, trackerRepository, pairingRepository)
    const deleteTracker = new DeleteTracker(adlogs, trackerRepository)

    /** ### Router dispatching ### */
    router.get('/get-all', async(req, res) => {
        const list = await getTrackerList.execute()
        res.json(Utils.makeHeavenResponse(res, list))
    })
    router.get('/get-all-available', async(req, res) => {
        const trackerList = await getAvailableTracker.execute()
        res.json(Utils.makeHeavenResponse(res, trackerList))
    })
    router.post('/get-one', async(req: TrackerRequest, res) => {
        const tracker = await getTracker.execute(req.body.id)
        res.json(Utils.makeHeavenResponse(res, tracker))
    })
    router.post('/get-pairing-list', async(req: TrackerRequest, res) => {
        const pairingList = await getTrackerPairingList.execute(req.body.id)
        res.json(Utils.makeHeavenResponse(res, pairingList))
    })
    router.post('/add', async(req: AddNewTrackerRequest, res) => {
        const newTracker = await addNewTracker.execute(req.body.data)
        res.json(Utils.makeHeavenResponse(res, newTracker))
    })
    router.post('/set-state', async(req: SetTrackerStateRequest, res) => {
        const result = await setTrackerState.execute(req.body.id, req.body.pairingID, req.body.state)
        res.json(Utils.makeHeavenResponse(res, result))
    })
    router.post('/delete', async(req: TrackerRequest, res) => {
        const deleteState = await deleteTracker.execute(req.body.id)
        res.json(Utils.makeHeavenResponse(res, deleteState))
    })

    return router
}