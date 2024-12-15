import Adlogs from "#core/adlogs/index.js"
import IUserRepository from "../repositories/IUserRepository"
import ISubscriptionRepository from "#app/repositories/ISubscriptionRepository.js"


/** TS */
type CustomerData = {
    recap: { name: string, type: string, state: string },
    customer: {
        email: string,
        phone: string,
        adding_date: number,
        godfather: string,
        manager: string,
        manager_id: string
    }
}

class GetCustomer {
    constructor(private adlogs: Adlogs, private userRepository: IUserRepository, private subscriptionRepository: ISubscriptionRepository){}

    public execute = async (id: string): Promise< CustomerData | null > => {
        const customer = await this.userRepository.getUserByID(id)
        let err = ''
        if(customer.data){
            // -> Retrieve customer dep
            const godfather = await this.userRepository.getUserByID(customer.data.godfather.toString())
            const manager = await this.userRepository.getUserByID(customer.data.manager.toString())
            const activeSubscription = await this.subscriptionRepository.getActiveSubscriptionByCustomer(customer.data.id || '')

            if(godfather.data && manager.data && activeSubscription.data){
                return {
                    recap: {
                        name: customer.data.surname + ' ' + customer.data.name,
                        type: customer.data.type === 'particular' ? 'Client Particulier' : 'Client d\'Entreprise',
                        state: customer.data.state ? activeSubscription.data?.length && 'active' || "inactive" : 'disable'
                    },
                    customer: {
                        email: customer.data.email,
                        phone: customer.data.phone,
                        adding_date: customer.data.adding_date,
                        godfather: godfather.data.surname + ' ' + godfather.data.name,
                        manager: manager.data.surname + ' ' + manager.data.name,
                        manager_id: manager.data.id || ''
                    }
                }
            }else err = godfather.err || manager.err || activeSubscription.err || ''
        }else err = customer.err || ''

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

export default GetCustomer