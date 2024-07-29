import Adlogs from "#core/adlogs/index.js"
import Archange from "#core/archange/index.js"
import LoginUser from "#app/services/login-user.js"
import GetUser from "#app/services/get-users.js"

import MongoUserRepository from "#app/repositories/mongo/MongoUserRepository.js"
import { ExpressFractalRequest, HeavenExpressRouter } from "#core/heaven/routers.js"

import { MongoClient } from "mongodb"
import Utils from "#utils/index.js"
import AddNewUserAccount from "#app/services/add-new-user.js"
import UpdateUserAuth from "#app/services/update-user-auth.js"

/** TS */
interface LoginRequest extends ExpressFractalRequest {
    body: {
        type?: string,
        data?: { pass_hash: string }
    }
}
interface AddNewAccountRequest extends ExpressFractalRequest {
    body: {
        type: string,
        data: {
            account_type: 'global_manager' | 'manager' | 'corporate' | 'particular',
            name: string,
            surname: string,
            email: string,
            phone: string
        }
    }
}
interface EditAccountAuthRequest extends ExpressFractalRequest {
    body: {
        pass_hash: string,
        data: {
            type: string,
            list: { '2fa': boolean, email: string, phone: string, password: string }
        }
    }
}

export default (adlogs: Adlogs, archange: Archange, mongoClient: MongoClient) => {
    const { router } = new HeavenExpressRouter(adlogs, archange, mongoClient)
    const loginUser = new LoginUser(adlogs, archange, new MongoUserRepository(mongoClient, 'anywhere'))
    const dataUser = new GetUser(adlogs, archange, new MongoUserRepository(mongoClient, 'anywhere'))
    const addNewUserAccount = new AddNewUserAccount(adlogs, archange, new MongoUserRepository(mongoClient, 'anywhere'))
    const updateUserAuth = new UpdateUserAuth(adlogs, new MongoUserRepository(mongoClient, 'anywhere'))

    /** ### Router dispatching ### */

    // -> User login
    router.post('/login', async(req: LoginRequest, res) => {
        // -> Retrieve login data in body
        if(req.body.type === 'login'){
            setTimeout(async () => {
                const callerPassHash = req.body.data?.pass_hash
                const loginResult = await loginUser.execute(callerPassHash || '')

                if(loginResult.pass){
                    req.session.archange_hash = loginResult.linkHash
                    
                    adlogs.writeRuntimeEvent({
                        category: 'app',
                        type: "info",
                        message: `login attempt complete for caller < ${req.session.archange_hash} >`,
                        save: true
                    })
                }else{
                    adlogs.writeRuntimeEvent({
                        category: 'app',
                        type: "warning",
                        message: `login attempt failed for caller < ${req.session.heaven_kf} >`,
                        save: true
                    })
                }
                res.json(Utils.makeHeavenResponse(res, { pass: loginResult.pass, username: loginResult.username || '' }))
            }, 2000)
        }
    })

    // -> Data of connected user
    router.get('/user-data', async(req, res) => {
        // -> Retrieve logged user data
        const user = await dataUser.execute(req.session.archange_hash || '')

        if(user === null) req.session.archange_hash = undefined

        res.json(Utils.makeHeavenResponse(res, user))
    })

    // -> User logout
    router.get('/logout', async(req, res) => {
        adlogs.writeRuntimeEvent({
            category: 'app',
            type: "info",
            message: `logout complete for caller < ${req.session.archange_hash} >`,
            save: true
        })
        req.session.archange_hash = undefined
        res.json(Utils.makeHeavenResponse(res, {} ))
    })

    // -> New user account saving
    router.post('/new-account', async(req: AddNewAccountRequest, res) => {
        if(['add-customer-account', 'add-manager-account'].includes(req.body.type)){
            // -> Check if user account exist [duplicate email or phone]
            const result = await addNewUserAccount.execute(req.body.data, req.session.archange_hash || '')
            res.json(Utils.makeHeavenResponse(res, result))
        }
        
    })

    // -> New user account saving
    router.post('/edit-auth', async(req: EditAccountAuthRequest, res) => {
        const updatedAuth = await updateUserAuth.execute(req.body.pass_hash, req.body.data.type, req.body.data.list)
        res.json(Utils.makeHeavenResponse(res, updatedAuth))
    })

    return router
}