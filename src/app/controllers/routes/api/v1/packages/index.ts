import Adlogs from "#core/adlogs/index.js"
import Archange from "#core/archange/index.js"
import Utils from "#utils/index.js"
import { ExpressFractalRequest, HeavenExpressRouter } from "#core/heaven/routers.js"

import { MongoClient } from "mongodb"
import AddNewPackage from "#app/services/add-new-package.js"
import MongoPackageRepository from "#app/repositories/mongo/MongoPackageRepository.js"
import GetPackage from "#app/services/get-package.js"
import MongoSubscriptionRepository from "#app/repositories/mongo/MongoSubscriptionRepository.js"
import GetPackageList from "#app/services/get-package-list.js"
import DeletePackage from "#app/services/delete-package.js"
import GetPackageListFull from "#app/services/get-package-list-full.js"

/** TS */
interface PackageRequest extends ExpressFractalRequest {
    body: { id: string }
}

interface AddNewPackageRequest extends ExpressFractalRequest {
    body: {
        data: {
            name: string,
            day_validity: number,
            fleet: number,
            amount: number,
            accessibility: 'all' | 'particular' | 'corporate',
            allowed_option: string[]
        }
    }
}

export default (adlogs: Adlogs, archange: Archange, mongoClient: MongoClient) => {
    const { router } = new HeavenExpressRouter(adlogs, archange, mongoClient)

    /** ### Load Services ### */
    const getPackage = new GetPackage(adlogs, new MongoPackageRepository(mongoClient, 'anywhere'), new MongoSubscriptionRepository(mongoClient, 'anywhere'))
    const getPackageList = new GetPackageList(adlogs, new MongoPackageRepository(mongoClient, 'anywhere'))
    const getPackageListFull = new GetPackageListFull(adlogs, new MongoPackageRepository(mongoClient, 'anywhere'))
    const addNewPackage = new AddNewPackage(adlogs, new MongoPackageRepository(mongoClient, 'anywhere'))
    const deletePackage = new DeletePackage(adlogs, new MongoPackageRepository(mongoClient, 'anywhere'))

    /** ### Router dispatching ### */
    router.get('/get-all', async(req, res) => {
        const packages = await getPackageList.execute()
        res.json(Utils.makeHeavenResponse(res, packages))
    })
    router.get('/get-all-full', async(req, res) => {
        const packages = await getPackageListFull.execute()
        res.json(Utils.makeHeavenResponse(res, packages))
    })
    router.post('/get-one', async(req: PackageRequest, res) => {
        const _package = await getPackage.execute(req.body.id)
        res.json(Utils.makeHeavenResponse(res, _package))
    })
    router.post('/add', async(req: AddNewPackageRequest, res) => {
        const newPackage = await addNewPackage.execute(req.body.data)
        res.json(Utils.makeHeavenResponse(res, newPackage))
    })
    router.post('/delete', async(req: PackageRequest, res) => {
        const deleteState = await deletePackage.execute(req.body.id)
        res.json(Utils.makeHeavenResponse(res, deleteState))
    })

    return router
}