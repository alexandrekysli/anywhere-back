import Adlogs from "#core/adlogs/index.js"
import IUserRepository from "../repositories/IUserRepository"
import ISubscriptionRepository from "#app/repositories/ISubscriptionRepository.js"


/** TS */
type CustomerListItem = {
    id: string,
    name: string,
    type: string,
    state: 'active' | 'inactive' | 'disable'
}

class GetCustomerList {
    constructor(private adlogs: Adlogs, private userRepository: IUserRepository, private subscriptionRepository: ISubscriptionRepository){}

    public execute = async (): Promise< CustomerListItem[] | null > => {
        const returnedList: CustomerListItem[] = []
        const customerUserList = await this.userRepository.getUserByType('customer')
        if(customerUserList.data){
            for (const customer of customerUserList.data) {
                const activeSubscription = await this.subscriptionRepository.getActiveSubscriptionByCustomer(customer.id || '')
                returnedList.push({
                    id: customer.id || '',
                    name: customer.name + ' ' + customer.surname,
                    state: customer.state ? activeSubscription.data?.length && 'active' || "inactive" : 'disable',
                    type: customer.type
                })
            }
            return returnedList
        }else{
            this.adlogs.writeRuntimeEvent({
                category: 'app',
                type: 'stop',
                message: `unable to use db < ${customerUserList.err} >`,
                save: true
            })
            return null
        }
    }
}

export default GetCustomerList