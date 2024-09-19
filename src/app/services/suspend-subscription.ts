import ISubscriptionRepository from "#app/repositories/ISubscriptionRepository.js"
import Adlogs from "#core/adlogs/index.js"

class SuspendSubscription {
    constructor(private adlogs: Adlogs, private repository: ISubscriptionRepository){}

    public execute = async (id: string): Promise<{ pass: boolean }> => {
        const result = await this.repository.suspendSubscription(id)
        
        if(result.err){
            this.adlogs.writeRuntimeEvent({
                category: 'app',
                type: 'stop',
                message: `unable to use db < ${result.err} >`,
                save: true
            })
            return { pass: false }
        }else{
            return { pass: result.data || false }
        }
    }
}

export default SuspendSubscription