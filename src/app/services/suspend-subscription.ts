import ISubscriptionRepository from "#app/repositories/ISubscriptionRepository.js"
import Adlogs from "#core/adlogs/index.js"

class SuspendSubscription {
    constructor(private adlogs: Adlogs, private repository: ISubscriptionRepository){}

    public execute = async (id: string): Promise<{ pass: boolean }> => {
        let err = ''
        const dependantSubscription = (await this.repository.getChildSubscription(id))

        if(dependantSubscription instanceof Error) err = dependantSubscription.message
        else{
            let pass = true
            for (const subscription of dependantSubscription) {
                // -> Update child subscription item to start now !!!
                const updateResult = await this.repository.updateSubscriptionStartingDate(String(subscription.id), Date.now())
                if(updateResult instanceof Error){
                    err = updateResult.message
                    pass = false
                    break
                }
            }

            if(pass){
                // -> Suspended concern subscription now !!! 
                const result = await this.repository.suspendSubscription(id)
                if(result.err) err = result.err
                else return { pass: true }
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

       return { pass: false }
    }
}

export default SuspendSubscription