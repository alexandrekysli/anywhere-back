import Adlogs from "#core/adlogs/index.js"
import ISubscriptionRepository from "#app/repositories/ISubscriptionRepository.js"
import SubscriptionEntity from "#app/entities/subscription.js"
import VehicleEntity from "#app/entities/vehicle.js"


/** TS */
type ExeResult = { pass: boolean, id?: string }

type NewSubscriptionData = {
    customer: string,
    manager: string,
    package: string,
    qte: number,
    provisioningSubscription: string
}
class AddNewSubscription {
    constructor(private adlogs: Adlogs, private repository: ISubscriptionRepository){}

    public execute = async (data: NewSubscriptionData): Promise< ExeResult | null > => {
        let err = ''

        // -> Detect begin date for provisioning subscription
        const oldSubscription = await this.repository.getSubscription(data.provisioningSubscription)
        if(oldSubscription.err) err = oldSubscription.err
        else{
            const dependencySubscription = oldSubscription.data && oldSubscription.data.endDate ? {
                id: String(oldSubscription.data.id),
                endDate: oldSubscription.data.endDate(),
                fleet: oldSubscription.data.vehicle as VehicleEntity[]
            } : undefined

            const newSubscription = await this.repository.addSubscription(new SubscriptionEntity(
                data.customer,
                data.manager,
                data.package,
                data.qte,
                dependencySubscription ? dependencySubscription.endDate : Date.now(),
                dependencySubscription ? dependencySubscription.fleet.map(vehicle => String(vehicle.id)) : [],
                true,
                dependencySubscription ? dependencySubscription.id : ''
            ))
            if(newSubscription.data) return { pass: true, id: newSubscription.data.id  }
            else err = newSubscription.err || ''
        }

        if(err){
            // -> Write error
            this.adlogs.writeRuntimeEvent({
                category: 'app',
                type: 'stop',
                message: `unable to use db < ${err} >`,
                save: true
            })
        }
        return { pass: false }
    }
}

export default AddNewSubscription