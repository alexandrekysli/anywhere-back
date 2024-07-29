import Adlogs from "#core/adlogs/index.js"
import Archange from "#core/archange/index.js"
import Utils from "#utils/index.js"
import { ExpressFractalRequest, HeavenExpressRouter } from "#core/heaven/routers.js"

import MongoSubscriptionRepository from "#app/repositories/mongo/MongoSubscriptionRepository.js"

import { MongoClient } from "mongodb"
import GetCustomerSubscription from "#app/services/get-customer-subscription.js"
import AddNewSubscription from "#app/services/add-new-subscription.js"
import GetSubscription from "#app/services/get-subscription.js"
import SetSubscriptionFleet from "#app/services/set-subscription-fleet.js"
import SuspendSubscription from "#app/services/suspend-subscription.js"

/** TS */
interface SubscriptionRequest extends ExpressFractalRequest {
    body: { id: string }
}
interface AddNewSubscriptionRequest extends ExpressFractalRequest {
    body: {
        data: {
            customer: string,
            manager: string,
            package: string,
            qte: number
        }
    }
}
interface EditSubscriptionFleetRequest extends ExpressFractalRequest {
    body: { data: { id: string, fleet: string[] }
    }
}

export default (adlogs: Adlogs, archange: Archange, mongoClient: MongoClient) => {
    const { router } = new HeavenExpressRouter(adlogs, archange, mongoClient)

    /** ### Load Repositories ### */
    const mongoSubscriptionRepository = new MongoSubscriptionRepository(mongoClient, 'anywhere')

    /** ### Load Services ### */
    const getCustomerSubscription = new GetCustomerSubscription(adlogs, mongoSubscriptionRepository)
    const addNewSubscriptionRequest = new AddNewSubscription(adlogs, mongoSubscriptionRepository)
    const getSubscription = new GetSubscription(adlogs, mongoSubscriptionRepository)
    const setSubscriptionFleet = new SetSubscriptionFleet(adlogs, mongoSubscriptionRepository)
    const suspendSubscription = new SuspendSubscription(adlogs, mongoSubscriptionRepository)

    /** ### Router dispatching ### */
    router.post('/get-by-customer', async(req, res) => {
        const subscriptionList = await getCustomerSubscription.execute(req.body.id || '')
        res.json(Utils.makeHeavenResponse(res, subscriptionList))
    })
    router.post('/get-one', async(req: SubscriptionRequest, res) => {
        const subscription = await getSubscription.execute(req.body.id)
        res.json(Utils.makeHeavenResponse(res, subscription))
    })
    router.post('/add', async(req: AddNewSubscriptionRequest, res) => {
        const newSubscription = await addNewSubscriptionRequest.execute(req.body.data)
        res.json(Utils.makeHeavenResponse(res, newSubscription))
    })
    router.post('/edit-fleet', async(req: EditSubscriptionFleetRequest, res) => {
        const result = await setSubscriptionFleet.execute(req.body.data.id, req.body.data.fleet)
        res.json(Utils.makeHeavenResponse(res, result))
    })
    router.post('/suspend', async(req: SubscriptionRequest, res) => {
        const result = await suspendSubscription.execute(req.body.id)
        console.log(result);
        
        res.json(Utils.makeHeavenResponse(res, result))
    })


    return router
}