import Adlogs from "#core/adlogs/index.js"
import ISubscriptionRepository from "#app/repositories/ISubscriptionRepository.js"
import SubscriptionEntity from "#app/entities/subscription.js"


/** TS */
type ExeResult = { err?: string, id?: string }

type NewSubscriptionData = {
    customer: string,
    manager: string,
    package: string,
    qte: number
}
class AddNewSubscription {
    constructor(private adlogs: Adlogs, private repository: ISubscriptionRepository){}

    public execute = async (data: NewSubscriptionData): Promise< ExeResult | null > => {
        let err = ''
        const lastSubscription = await this.repository.getLastSubscriptionByCustomer(data.customer)

        if(lastSubscription.err) err = lastSubscription.err
        else{
            const beginDate = lastSubscription.data ? (lastSubscription.data.endDate && lastSubscription.data.endDate() || Date.now()) : Date.now()

            const newSubscription = await this.repository.addSubscription(new SubscriptionEntity(data.customer, data.manager, data.package, data.qte, beginDate, [], true))
            if(newSubscription.data) return { id: newSubscription.data.id  }
            else  err = newSubscription.err || ''
        }

        // -> Write error
        this.adlogs.writeRuntimeEvent({
            category: 'app',
            type: 'stop',
            message: `unable to use db < ${err} >`,
            save: true
        })
        return null
    }
}

export default AddNewSubscription