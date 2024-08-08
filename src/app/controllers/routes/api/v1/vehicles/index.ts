import Adlogs from "#core/adlogs/index.js"
import Archange from "#core/archange/index.js"
import Utils from "#utils/index.js"
import { ExpressFractalRequest, HeavenExpressRouter } from "#core/heaven/routers.js"

import GetCustomerVehicle from "#app/services/get-customer-vehicle.js"
import MongoVehicleRepository from "#app/repositories/mongo/MongoVehicleRepository.js"
import MongoPairingRepository from "#app/repositories/mongo/MongoPairingRepository.js"

import { MongoClient } from "mongodb"
import AddNewVehicle from "#app/services/add-new-vehicle.js"
import DeleteVehicle from "#app/services/delete-vehicle.js"
import GetVehicle from "#app/services/get-vehicle.js"
import GetUnsubscribedCustomerVehicle from "#app/services/get-unsubscribed-customer-vehicle.js"
import MongoSubscriptionRepository from "#app/repositories/mongo/MongoSubscriptionRepository.js"
import EditVehicle from "#app/services/edit-vehicle.js"
import MongoTrackerRepository from "#app/repositories/mongo/MongoTrackerRepository.js"
import GetAvailableVehicle from "#app/services/get-available-vehicle.js"

/** TS */
interface VehicleRequest extends ExpressFractalRequest {
    body: { id: string }
}
interface GetVehicleByCustomerRequest extends ExpressFractalRequest {
    body: { id: string }
}
interface AddNewVehicleRequest extends ExpressFractalRequest {
    body: {
        data: {
            customer: string,
            numberplate: string,
            brand: string,
            model: string,
            type: 'motorcycle' | 'car' | 'truck',
            group: string,
            driver: string,
            tracker: string
        }
    }
}
interface EditVehicleRequest extends ExpressFractalRequest {
    body: {
        data: {
            id: string,
            numberplate: string,
            group: string,
            driver: string,
            max_speed: number
        }
    }
}
interface GetAvailableVehicleRequest extends ExpressFractalRequest {
    body: { id: string }
}

export default (adlogs: Adlogs, archange: Archange, mongoClient: MongoClient) => {
    const { router } = new HeavenExpressRouter(adlogs, archange, mongoClient)
    
    /** ### Load Repositories ### */
    const vehicleRepository = new MongoVehicleRepository(mongoClient, 'anywhere')
    const trackerRepository = new MongoTrackerRepository(mongoClient, 'anywhere')
    const subscriptionRepository = new MongoSubscriptionRepository(mongoClient, 'anywhere')
    const pairingRepository = new MongoPairingRepository(mongoClient, 'anywhere')

    /** ### Load Services ### */
    const getVehicle = new GetVehicle(adlogs, vehicleRepository, subscriptionRepository)
    const deleteVehicle = new DeleteVehicle(adlogs, vehicleRepository)
    const editVehicle = new EditVehicle(adlogs, vehicleRepository)
    const addNewVehicle = new AddNewVehicle(adlogs, vehicleRepository, trackerRepository, pairingRepository)
    const getCustomerVehicle = new GetCustomerVehicle(adlogs, vehicleRepository, pairingRepository)
    const getUnsubscribedCustomerVehicle = new GetUnsubscribedCustomerVehicle(adlogs, subscriptionRepository, vehicleRepository)
    const getAvailableVehicle = new GetAvailableVehicle(adlogs, vehicleRepository, pairingRepository)
    
    /** ### Router dispatching ### */
    router.post('/get-by-customer', async(req: GetVehicleByCustomerRequest, res) => {
        const customerVehicle = await getCustomerVehicle.execute(req.body.id)
        res.json(Utils.makeHeavenResponse(res, customerVehicle))
    })
    router.post('/get-available-vehicle', async(req: GetAvailableVehicleRequest, res) => {
        const list = await getAvailableVehicle.execute(req.body.id)
        res.json(Utils.makeHeavenResponse(res, list))
    })
    router.post('/get-unsubscribed-by-customer', async(req: GetVehicleByCustomerRequest, res) => {
        const vehicle = await getUnsubscribedCustomerVehicle.execute(req.body.id)
        res.json(Utils.makeHeavenResponse(res, vehicle))
    })
    router.post('/get-one', async(req: VehicleRequest, res) => {
        const vehicle = await getVehicle.execute(req.body.id)
        res.json(Utils.makeHeavenResponse(res, vehicle))
    })
    router.post('/add', async(req: AddNewVehicleRequest, res) => {
        const newVehicle = await addNewVehicle.execute(req.body.data)
        res.json(Utils.makeHeavenResponse(res, newVehicle))
    })
    router.post('/edit', async(req: EditVehicleRequest, res) => {
        const result = await editVehicle.execute(req.body.data.id, req.body.data.numberplate, req.body.data.group, req.body.data.driver, Number(req.body.data.max_speed))
        res.json(Utils.makeHeavenResponse(res, result))
    })
    router.post('/delete', async(req: VehicleRequest, res) => {
        const deleteState = await deleteVehicle.execute(req.body.id)
        res.json(Utils.makeHeavenResponse(res, deleteState))
    })

    return router
}