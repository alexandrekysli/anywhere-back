import Adlogs from "#core/adlogs/index.js"
import Archange from "#core/archange/index.js"
import Utils from "#utils/index.js"
import { ExpressFractalRequest, HeavenExpressRouter } from "#core/heaven/routers.js"

import GetCustomerList from "#app/services/get-customer-list.js"
import MongoUserRepository from "#app/repositories/mongo/MongoUserRepository.js"
import MongoSubscriptionRepository from "#app/repositories/mongo/MongoSubscriptionRepository.js"

import { MongoClient } from "mongodb"
import GetCustomer from "#app/services/get-customer.js"
import SetUserState from "#app/services/set-user-state.js"
import DeleteUser from "#app/services/delete-user.js"
import GetAvailableManager from "#app/services/get-available-manager.js"
import SetCustomerManager from "#app/services/set-customer-manager.js"
import MongoVehicleRepository from "#app/repositories/mongo/MongoVehicleRepository.js"
import GetAvailableCustomer from "#app/services/get-available-customer.js"

/** TS */
interface GetAvailableManagerRequest extends ExpressFractalRequest {
    body: { id: string }
}
interface SetStateRequest extends ExpressFractalRequest {
    body: { id: string, state: boolean }
}
interface SetManagerRequest extends ExpressFractalRequest {
    body: { id: string, to: string }
}
interface DeleteRequest extends ExpressFractalRequest {
    body: { id: string, pass_hash: string }
}


export default (adlogs: Adlogs, archange: Archange, mongoClient: MongoClient) => {
    const { router } = new HeavenExpressRouter(adlogs, archange, mongoClient)

    /** ### Load Repositories ### */
    const userRepository = new MongoUserRepository(mongoClient, 'anywhere')
    const vehicleRepository = new MongoVehicleRepository(mongoClient, 'anywhere')
    const subscriptionRepository = new MongoSubscriptionRepository(mongoClient, 'anywhere')

    /** ### Load Services ### */
    const setUserState = new SetUserState(adlogs, userRepository)
    const setCustomerManager = new SetCustomerManager(adlogs, userRepository)
    const deleteUser = new DeleteUser(adlogs, archange, userRepository)
    const getCustomerList = new GetCustomerList(adlogs, userRepository, subscriptionRepository, vehicleRepository)
    const getCustomer = new GetCustomer(adlogs, userRepository, new MongoSubscriptionRepository(mongoClient, 'anywhere'))
    const getAvailableManager = new GetAvailableManager(adlogs, userRepository)
    const getAvailableCustomer = new GetAvailableCustomer(adlogs, userRepository)

    /** ### Router dispatching ### */

    router.get('/get-all', async(req, res) => {
        const customerList = await getCustomerList.execute(undefined, req.session.archange_hash)
        res.json(Utils.makeHeavenResponse(res, {
            list: customerList || []
        } ))
    })

    router.post('/get-available-managers', async(req: GetAvailableManagerRequest, res) => {
        const managerList = await getAvailableManager.execute(req.body.id)
        res.json(Utils.makeHeavenResponse(res, managerList ))
    })

    router.post('/get-available-customers', async(req: GetAvailableManagerRequest, res) => {
        const customerList = await getAvailableCustomer.execute(req.body.id)
        res.json(Utils.makeHeavenResponse(res, customerList ))
    })

    router.post('/get-by-manager', async(req: GetAvailableManagerRequest, res) => {
        const customerList = await getCustomerList.execute(req.body.id)
        res.json(Utils.makeHeavenResponse(res, customerList ))
    })

    router.post('/get-one', async(req, res) => {
        const customerData = await getCustomer.execute(req.body.id)
        res.json(Utils.makeHeavenResponse(res, customerData))
    })

    router.post('/set-state', async(req: SetStateRequest, res) => {
        const setStateResult = await setUserState.execute(req.body.id, req.body.state)
        res.json(Utils.makeHeavenResponse(res, setStateResult))
    })

    router.post('/set-manager', async(req: SetManagerRequest, res) => {
        const setManagerResult = await setCustomerManager.execute(req.body.id, req.body.to)
        res.json(Utils.makeHeavenResponse(res, setManagerResult))
    })

    router.post('/delete', async(req: DeleteRequest, res) => {
        const setStateResult = await deleteUser.execute(req.body.id, req.body.pass_hash)
        res.json(Utils.makeHeavenResponse(res, setStateResult))
    })

    return router
}