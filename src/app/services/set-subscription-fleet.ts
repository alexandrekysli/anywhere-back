import Adlogs from "#core/adlogs/index.js"
import ISubscriptionRepository from "#app/repositories/ISubscriptionRepository.js"
import PackageEntity from "#app/entities/package.js"
import UserEntity from "#app/entities/user.js"
import VehicleEntity from "#app/entities/vehicle.js"


class SetSubscriptionFleet {
    constructor(private adlogs: Adlogs, private repository: ISubscriptionRepository){}

    public execute = async (id: string, fleet: string[]): Promise<{ pass: boolean }> => {
        const result = await this.repository.setSubscriptionFleet(id, fleet)
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

export default SetSubscriptionFleet