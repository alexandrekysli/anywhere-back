import Adlogs from "#core/adlogs/index.js"
import Archange from "#core/archange/index.js"
import Utils from "#utils/index.js"
import { HeavenExpressRouter } from "#core/heaven/routers.js"

import MongoUserRepository from "#app/repositories/mongo/MongoUserRepository.js"

import { MongoClient } from "mongodb"
import SetUserState from "#app/services/set-user-state.js"
import DeleteUser from "#app/services/delete-user.js"
import GetManagerList from "#app/services/get-manager-list.js"
import GetManager from "#app/services/get-manager.js"


export default (adlogs: Adlogs, archange: Archange, mongoClient: MongoClient) => {
    const { router } = new HeavenExpressRouter(adlogs, archange, mongoClient)

    /** ### Load Repositories ### */
    const userRepository = new MongoUserRepository(mongoClient, 'anywhere')
    const setUserState = new SetUserState(adlogs, archange, userRepository)
    const deleteUser = new DeleteUser(adlogs, archange, userRepository)

    /** ### Load Services ### */
    const getManagerList = new GetManagerList(adlogs, userRepository)
    const getManager = new GetManager(adlogs, userRepository)

    /** ### Router dispatching ### */
    router.get('/get-all', async(req, res) => {
        const managerList = await getManagerList.execute()
        res.json(Utils.makeHeavenResponse(res, { list: managerList } ))
    })

    router.post('/get-one', async(req, res) => {
        const managerData = await getManager.execute(req.body.id)
        res.json(Utils.makeHeavenResponse(res, managerData))
    })

    router.post('/set-state', async(req, res) => {
        const setStateResult = await setUserState.execute(req.body.id, req.body.state)
        res.json(Utils.makeHeavenResponse(res, setStateResult))
    })

    router.post('/delete', async(req, res) => {
        const caller = archange.getArchangeCallerByIdentifier(String(req.session.archange_hash || req.session.heaven_kf || ''))
        if(caller){
            const setStateResult = await deleteUser.execute(req.body.id, req.body.pass_hash)
            if(setStateResult.pass) caller.remainDereckAccess = 5
            else caller.remainDereckAccess--
            
            res.json(Utils.makeHeavenResponse(res, setStateResult))
        }
    })

    return router
}