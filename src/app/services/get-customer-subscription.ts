import Adlogs from "#core/adlogs/index.js"
import ISubscriptionRepository from "#app/repositories/ISubscriptionRepository.js"
import PackageEntity from "#app/entities/package.js"


/** TS */
type SubscriptionListItem = {
    id: string,
    name: string,
    price: number,
    begin_date: number,
    end_date: number,
    state: 'wait' | 'actual' | 'end' | 'suspend'
}

class GetCustomerSubscription {
    constructor(private adlogs: Adlogs, private subscriptionRepository: ISubscriptionRepository){}

    public execute = async (customerID: string): Promise< SubscriptionListItem[] | null > => {
        const returnedList: SubscriptionListItem[] = []
        const subscriptionList = await this.subscriptionRepository.getSubscriptionByCustomer(customerID)
        if(subscriptionList.data){
            for (const subscription of subscriptionList.data) {
                returnedList.push({
                    id: subscription.id || '',
                    name: subscription._package instanceof PackageEntity ? subscription._package.name : '',
                    price: subscription._package instanceof PackageEntity ? subscription._package.amount : 0,
                    state: subscription.state ? (subscription.status && subscription.status() || 'suspend') : 'suspend',
                    begin_date: subscription.starting_date,
                    end_date: subscription.endDate && subscription.endDate() || 0
                })
            }
            return returnedList
        }else {
            this.adlogs.writeRuntimeEvent({
                category: 'app',
                type: 'stop',
                message: `unable to use db < ${subscriptionList.err} >`,
                save: true
            })
            return null
        }
    }
}

export default GetCustomerSubscription