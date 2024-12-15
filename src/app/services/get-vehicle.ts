import Adlogs from "#core/adlogs/index.js"
import IVehicleRepository from "#app/repositories/IVehicleRepository.js"
import UserEntity from "#app/entities/user.js"
import ISubscriptionRepository from "#app/repositories/ISubscriptionRepository.js"

class GetVehicle {
    constructor(private adlogs: Adlogs, private repository: IVehicleRepository, private subscriptionRepository: ISubscriptionRepository){}

    public execute = async (id: string): Promise< VehicleData | null > => {
        const vehicle = await this.repository.getVehicle(id)
        let err = ''
        if(vehicle.data){
            const vehicleSubscription = await this.subscriptionRepository.getSubscriptionByVehicle(id)
            if(vehicleSubscription.err) err= vehicleSubscription.err
            else{
                return {
                    id: vehicle.data.id || '',
                    brand: vehicle.data.brand,
                    model: vehicle.data.model,
                    numberplate: vehicle.data.numberplate,
                    customer_id: vehicle.data.customer instanceof UserEntity ? (vehicle.data.customer.id || '') : '',
                    customer_name: vehicle.data.customer instanceof UserEntity ? (vehicle.data.customer.surname + ' ' + vehicle.data.customer.name) : '',
                    driver: vehicle.data.driver,
                    group: vehicle.data.group,
                    max_speed: vehicle.data.maxspeed,
                    state: vehicle.data.state,
                    type: vehicle.data.type,
                    subscription_count: vehicleSubscription.data ? vehicleSubscription.data.length : 0
                }
            }
        }else err = vehicle.err || ''

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

export default GetVehicle