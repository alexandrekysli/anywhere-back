import Adlogs from "#core/adlogs/index.js"
import IVehicleRepository from "#app/repositories/IVehicleRepository.js"


/** TS */
type VehicleListItem = {
    id: string,
    name: string,
    begin_date: number,
    end_date: number,
    state: 'wait' | 'actual' | 'end' | 'suspend'
}

class GetCustomerVehicle {
    constructor(private adlogs: Adlogs, private vehicleRepository: IVehicleRepository){}

    public execute = async (customerID: string): Promise< VehicleListItem[] | null > => {
        const returnedList: VehicleListItem[] = []
        const vehicleList = await this.vehicleRepository.getVehicleByCustomer(customerID)
        if(vehicleList.data){
            for (const vehicle of vehicleList.data) {
                // -> Get vehicle pairing

                /* returnedList.push({
                    id: subscription.id || '',
                    name: subscription._package instanceof PackageEntity ? subscription._package.name : '',
                    state: subscription.state ? (subscription.status && subscription.status() || 'suspend') : 'suspend',
                    begin_date: subscription.starting_date,
                    end_date: subscription.endDate && subscription.endDate() || 0
                }) */
            }
            return returnedList
        }else {
            this.adlogs.writeRuntimeEvent({
                category: 'app',
                type: 'stop',
                message: `unable to use db < ${vehicleList.err} >`,
                save: true
            })
            return null
        }
    }
}

export default GetCustomerVehicle