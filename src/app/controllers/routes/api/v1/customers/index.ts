import Adlogs from "#core/adlogs/index.js"
import Archange from "#core/archange/index.js"
import Utils from "#utils/index.js"
import { ExpressFractalRequest, HeavenExpressRouter } from "#core/heaven/routers.js"

import GetCustomerList from "#app/services/get-customer-list.js"
import MongoUserRepository from "#app/repositories/mongo/MongoUserRepository.js"
import MongoSubscriptionRepository from "#app/repositories/mongo/MongoSubscriptionRepository.js"

import { MongoClient } from "mongodb"
import GetCustomer from "#app/services/get-customer.js"

/** TS */


export default (adlogs: Adlogs, archange: Archange, mongoClient: MongoClient) => {
    const { router } = new HeavenExpressRouter(adlogs, archange, mongoClient)
    const getCustomerList = new GetCustomerList(
        adlogs,
        new MongoUserRepository(mongoClient, 'anywhere'),
        new MongoSubscriptionRepository(mongoClient, 'anywhere')
    )
    const getCustomer = new GetCustomer(
        adlogs,
        new MongoUserRepository(mongoClient, 'anywhere'),
        new MongoSubscriptionRepository(mongoClient, 'anywhere')
    )

    /** ### Router dispatching ### */

    // -> Customer list
    router.get('/get-all', async(req, res) => {
        const customerList = await getCustomerList.execute()
        res.json(Utils.makeHeavenResponse(res, {
            list: customerList || []
        } ))
    })

    router.post('/get-one', async(req, res) => {
        const customerData = await getCustomer.execute(req.body.id || '')
        res.json(Utils.makeHeavenResponse(res, customerData))
    })

    return router
}