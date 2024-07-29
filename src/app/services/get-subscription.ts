import Adlogs from "#core/adlogs/index.js"
import ISubscriptionRepository from "#app/repositories/ISubscriptionRepository.js"
import PackageEntity from "#app/entities/package.js"
import UserEntity from "#app/entities/user.js"
import VehicleEntity from "#app/entities/vehicle.js"


/** TS */
type SubscriptionData = {
    main : {
        validity: number,
        price: number,
        fleet_count: number,
        customer_id: string,
        customer: string,
        manager: string,
        begin_date: number,
        end_date: number,
        state: string,
    },
    package: {
        name: string,
        package_fleet: number,
        options: string[],
    },
    fleet: {
        _id: string,
        numberplate: string,
        model: string,
        group: string,
        driver: string,
    }[]
}

class GetSubscription {
    constructor(private adlogs: Adlogs, private repository: ISubscriptionRepository){}

    public execute = async (id: string): Promise< SubscriptionData | null > => {
        let err = ''

        const subscription = await this.repository.getSubscription(id)
        if(
            subscription.data &&
            subscription.data._package instanceof PackageEntity &&
            subscription.data.customer instanceof UserEntity &&
            subscription.data.manager instanceof UserEntity
        ){
            const vehicles: SubscriptionData['fleet'] = []
            subscription.data.vehicle.forEach(x => {
                if(x instanceof VehicleEntity) vehicles.push({ _id: x.id || '', numberplate: x.numberplate, model: `${x.brand} ${x.model}`, group: x.group, driver: x.driver })
            })
        
            return {
                main: {
                    validity: subscription.data._package.day_validity * subscription.data.qte,
                    price: subscription.data._package.amount,
                    fleet_count: subscription.data.vehicle.length,
                    customer_id: subscription.data.customer.id || '',
                    customer: `${subscription.data.customer.surname} ${subscription.data.customer.name}`,
                    manager: `${subscription.data.manager.surname} ${subscription.data.manager.name}`,
                    state: subscription.data.state ? (subscription.data.status && subscription.data.status() || 'suspend') : 'suspend',
                    begin_date: subscription.data.starting_date,
                    end_date: subscription.data.endDate && subscription.data.endDate() || 0
                },
                package: {
                    name: subscription.data._package.name,
                    package_fleet: subscription.data._package.fleet_count,
                    options: subscription.data._package.allowed_option
                },
                fleet: vehicles
            }
        }else err = subscription.err || ''

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

export default GetSubscription