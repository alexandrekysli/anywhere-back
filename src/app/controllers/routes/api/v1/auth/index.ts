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
import CheckUserAccountRecoveryEmail from "#app/services/check-user-account-recovery-email.js"
import RecoveryUserAccount from "#app/services/recovery-user-account.js"

/** TS */
interface LoginRequest extends ExpressFractalRequest {
    body: { pass_hash: string }
}
interface AddNewAccountRequest extends ExpressFractalRequest {
    body: {
        account_type: 'global_manager' | 'manager' | 'corporate' | 'particular',
        name: string,
        surname: string,
        email: string,
        phone: string
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
interface CheckAccountRecoveryRequest extends ExpressFractalRequest {
    body: { email: string }
}
interface MakeAccountRecoveryRequest extends ExpressFractalRequest {
    body: { email: string, pinHash: string }
}

export default (adlogs: Adlogs, archange: Archange, mongoClient: MongoClient) => {
    const { router } = new HeavenExpressRouter(adlogs, archange, mongoClient)
    /** ### Load Repositories ### */
    const userRepository = new MongoUserRepository(mongoClient, 'anywhere')

    /** ### Load Services ### */
    const loginUser = new LoginUser(adlogs, archange, userRepository)
    const dataUser = new GetUser(adlogs, archange, userRepository)
    const addNewUserAccount = new AddNewUserAccount(adlogs, archange, userRepository)
    const updateUserAuth = new UpdateUserAuth(adlogs, userRepository)
    const checkUserAccountRecoveryEmail = new CheckUserAccountRecoveryEmail(adlogs, userRepository)
    const recoveryUserAccount = new RecoveryUserAccount(adlogs, userRepository)

    /** ### Router dispatching ### */

    // -> User login
    router.post('/login', async(req: LoginRequest, res) => {
        setTimeout(async () => {
            const callerPassHash = req.body.pass_hash
            const loginResult = await loginUser.execute(callerPassHash || '')

            if(loginResult.pass){
                req.session.archange_hash = loginResult.linkHash
                
                // -> Login completed -> remove origin from old caller
                archange.removeOriginFromCaller(String(req.session.heaven_kf), String(req.session.archange_caller_origin))
                
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
        // -> Check if user account exist [duplicate email or phone]
        const result = await addNewUserAccount.execute(req.body, req.session.archange_hash || '')
        res.json(Utils.makeHeavenResponse(res, result))
    })

    // -> New user account saving
    router.post('/edit-auth', async(req: EditAccountAuthRequest, res) => {
        const updatedAuth = await updateUserAuth.execute(req.body.pass_hash, req.body.data.type, req.body.data.list)
        res.json(Utils.makeHeavenResponse(res, updatedAuth))
    })

    // -> Account recovery request
    router.post('/check-account-recovery', async(req: CheckAccountRecoveryRequest, res) => {
        const checkResult = await checkUserAccountRecoveryEmail.execute(req.body.email)
        res.json(Utils.makeHeavenResponse(res, checkResult))
    })

    // -> Account recovery process
    router.post('/make-account-recovery', async(req: MakeAccountRecoveryRequest, res) => {
        const actualPinHash = archange.getCallerActualOTPPinHash(req.session.archange_hash || req.session.heaven_kf || '')
        if(actualPinHash === false || actualPinHash === req.body.pinHash){
            const makeResult = await recoveryUserAccount.execute(req.body.email)
            archange.updateCallerActualOTPPinHash((req.session.archange_hash || req.session.heaven_kf || ''), '')
            res.json(Utils.makeHeavenResponse(res, makeResult))
        }else res.json(Utils.makeHeavenResponse(res, { pass: false, err: 'Code PIN OTP incorrect !' }))
    })

    return router
}