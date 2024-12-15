import ISubscriptionRepository from "#app/repositories/ISubscriptionRepository.js"
import Adlogs from "#core/adlogs/index.js"
import IUserRepository from "../repositories/IUserRepository"

/** TS */
type ManagerData = {
    recap: { name: string, state: string },
    manager: {
        email: string,
        phone: string,
        global: boolean,
        godfather: string,
        adding_date: number,
        subscription_count: number
    }
}

class GetManager {
    constructor(private adlogs: Adlogs, private userRepository: IUserRepository, private subscriptionRepository: ISubscriptionRepository){}

    public execute = async (id: string): Promise< ManagerData | null > => {
        const manager = await this.userRepository.getUserByID(id)
        const managerSubscription = await this.subscriptionRepository.getSubscriptionByManager(id)
        
        let err = ''
        if(manager.data && managerSubscription.data){
            // -> Retrieve manager dep
            const godfather = await this.userRepository.getUserByID(manager.data.godfather.toString())
            
            if(godfather.data && manager.data){
                return {
                    recap: {
                        name: manager.data.surname + ' ' + manager.data.name,
                        state: manager.data.state ? 'active' : 'disable'
                    },
                    manager: {
                        email: manager.data.email,
                        phone: manager.data.phone,
                        adding_date: manager.data.adding_date,
                        godfather: godfather.data.surname + ' ' + godfather.data.name,
                        global: manager.data.type === 'global_manager',
                        subscription_count: managerSubscription.data.length
                    }
                }
            }else err = godfather.err || ''
        }else err = manager.err || ''

        if(err){
            // -> Write error
            this.adlogs.writeRuntimeEvent({
                category: 'app',
                type: 'stop',
                message: `unable to use db < ${err} >`,
                save: true
            })
        }
        return null
    }
}

export default GetManager