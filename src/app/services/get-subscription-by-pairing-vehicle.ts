import SubscriptionEntity from "#app/entities/subscription.js"
import ISubscriptionRepository from "#app/repositories/ISubscriptionRepository.js"
import Adlogs from "#core/adlogs/index.js"


class GetActiveSubscriptionVehicle {
    constructor(
        private adlogs: Adlogs,
        private subscriptionRepository: ISubscriptionRepository
    ){}

    public execute = async (vehicleID: string): Promise<SubscriptionEntity | null> => {
        let err = ''
        const subscription = await this.subscriptionRepository.getSubscriptionByVehicle(vehicleID)

        if(subscription.data){
            const activeSubscription = subscription.data.filter(x => {
                if(x.status && x.status() === 'actual') return true
                else return false
            })[0]

            if(activeSubscription) return activeSubscription
        }else if (subscription.err) err = subscription.err || ''
        
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

export default GetActiveSubscriptionVehicle