import Adlogs from "#core/adlogs/index.js"
import Archange from "#core/archange/index.js"
import Utils from "#utils/index.js"
import { ExpressFractalRequest, HeavenExpressRouter } from "#core/heaven/routers.js"

import MongoUserRepository from "#app/repositories/mongo/MongoUserRepository.js"
import MongoSubscriptionRepository from "#app/repositories/mongo/MongoSubscriptionRepository.js"

import { MongoClient } from "mongodb"
import GetCustomerSubscription from "#app/services/get-customer-subscription.js"

/** TS */


export default (adlogs: Adlogs, archange: Archange, mongoClient: MongoClient) => {
    const { router } = new HeavenExpressRouter(adlogs, archange, mongoClient)
    const getCustomerSubscription = new GetCustomerSubscription(adlogs, new MongoSubscriptionRepository(mongoClient, 'anywhere'))
    /** ### Router dispatching ### */

    router.post('/get-by-customer', async(req, res) => {
        const subscriptionList = await getCustomerSubscription.execute(req.body.id || '')
        res.json(Utils.makeHeavenResponse(res, subscriptionList))
    })

    return router
}