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
    dependent_subscription: string[]
}

class GetActiveCustomerSubscription {
    constructor(private adlogs: Adlogs, private subscriptionRepository: ISubscriptionRepository){}

    public execute = async (customerID: string): Promise< SubscriptionListItem[] | null > => {
        let err = ''

        const returnedList: SubscriptionListItem[] = []
        const subscriptionList = await this.subscriptionRepository.getActiveSubscriptionByCustomer(customerID)
        if(subscriptionList.err) err = subscriptionList.err
        else{
            if(subscriptionList.data){
                for (const subscription of subscriptionList.data) {
                    const dependentSubscription = await this.subscriptionRepository.getChildSubscription(String(subscription.id))
                    if(dependentSubscription instanceof Error){
                        err = dependentSubscription.message
                        break
                    }else{
                        returnedList.push({
                            id: subscription.id || '',
                            name: subscription._package instanceof PackageEntity ? subscription._package.name : '',
                            price: subscription._package instanceof PackageEntity ? subscription._package.amount : 0,
                            begin_date: subscription.starting_date,
                            end_date: subscription.endDate && subscription.endDate() || 0,
                            dependent_subscription: dependentSubscription.filter(x => {
                                if(x.status) return x.status() === 'wait'
                            }).map(x => String(x.id))
                        })
                    }
                }
                return returnedList
            }
        }

        if(err){
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

export default GetActiveCustomerSubscription