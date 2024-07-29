import Adlogs from "#core/adlogs/index.js"
import IVehicleRepository from "#app/repositories/IVehicleRepository.js"
import ISubscriptionRepository from "#app/repositories/ISubscriptionRepository.js"


/** TS */
type VehicleData = {
    id: string,
    model: string,
    numberplate: string
}

class GetUnsubscribedCustomerVehicle {
    constructor(private adlogs: Adlogs, private subscriptionRepository: ISubscriptionRepository, private vehicleRepository: IVehicleRepository){}

    public execute = async (id: string): Promise< VehicleData[] > => {
        let err = ''
        let busyVehicle: string[] = []
        const availableVehicle: VehicleData[] = []
        const customerSubscriptionList = await this.subscriptionRepository.getSubscriptionByCustomer(id)
        const customerVehicle = await this.vehicleRepository.getVehicleByCustomer(id)

        if(customerSubscriptionList.err || customerVehicle.err) err = customerSubscriptionList.err || customerVehicle.err || ''
        else{
            if(customerSubscriptionList.data){
                customerSubscriptionList.data.filter(x => {
                    if(x.state && x.status && x.status() !== 'end') return true
                    else return false
                }).forEach(x => { busyVehicle.push(...x.vehicle as string[]) })

                customerVehicle.data && customerVehicle.data.forEach(x => {
                    if(!busyVehicle.includes(String(x.id))) availableVehicle.push({ id: x.id || '', model: x.brand + ' ' + x.model, numberplate: x.numberplate })
                })
            }
            
            return availableVehicle
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
        return []
    }
}

export default GetUnsubscribedCustomerVehicle