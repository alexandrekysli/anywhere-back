import PackageEntity from "#app/entities/package.js"
import ISubscriptionRepository from "#app/repositories/ISubscriptionRepository.js"
import Adlogs from "#core/adlogs/index.js"
import Archange from "#core/archange/index.js"
import Utils from "#utils/index.js"
import IUserRepository from "../repositories/IUserRepository"

class LoginUser {
    constructor(private adlogs: Adlogs, private archange: Archange, private repository: IUserRepository, private subscriptionRepository: ISubscriptionRepository){}

    public execute = async (pass_hash: string): Promise<{ pass: boolean, username?: string, email?: string, linkHash?: string, custom_err?: string }> => {
        const fullPassHash = Utils.makeSHA256(`4[${pass_hash}]Gl0410fG0D`)        
        const userOnDB = (await this.repository.getUserByPassHash(fullPassHash))
        if(userOnDB.data !== undefined){
            if(userOnDB.data !== null){
                // -> User found -> login complete
                if(userOnDB.data.state){
                    // -> If user if customer -> check subscription plateform accessibility
                    const customerType = ['particular', 'corporate']
                    if(customerType.includes(userOnDB.data.type)){
                        let customErr: undefined | string
                        const lastCustomerSubscription = (await this.subscriptionRepository.getLastSubscriptionByCustomer(String(userOnDB.data.id))).data
                        if(lastCustomerSubscription && lastCustomerSubscription._package instanceof PackageEntity && lastCustomerSubscription.status){
                            const actualSubscription = lastCustomerSubscription.status() === 'actual'
                            const actualSubscriptionHasApplicationAccess = actualSubscription ? lastCustomerSubscription._package.allowed_option.includes('Application') : false
                            customErr = actualSubscription ? (
                                actualSubscriptionHasApplicationAccess ? undefined : 'SUBSCRIPTION_NO_CONTAIN_APPLICATION_ACCESS'
                            ) : 'NO_AVAILABLE_SUBSCRIPTION' 
                        } else customErr = 'NO_AVAILABLE_SUBSCRIPTION'

                        if(customErr) return { pass: false, custom_err: customErr }
                    }
                    const archangeUser = await this.archange.getArchangeUserByMasterID(userOnDB.data.master_id)
                    if(archangeUser){
                        return { pass: true, username: userOnDB.data.surname + ' ' + userOnDB.data.name, email: userOnDB.data.email, linkHash: archangeUser.link_hash }
                    }else return { pass: false }
                }else return { pass: false, custom_err: 'SUSPEND_ACCOUNT' }
            }else return { pass: false, custom_err: 'LOGIN_FAILED' }
        }else{
            this.adlogs.writeRuntimeEvent({
                category: 'app',
                type: 'stop',
                message: `unable to use db < ${userOnDB.err} >`,
                save: true
            })
            return { pass: false, custom_err: 'LOGIN_FAILED' }
        }
    }
}

export default LoginUser