import Adlogs from "#core/adlogs/index.js"
import IVehicleRepository from "#app/repositories/IVehicleRepository.js"
import IPairingRepository from "#app/repositories/IPairingRepository.js"


/** TS */
type VehicleListItem = {
    id: string,
    numberplate: string,
    brand: string,
    model: string,
    group: string,
    driver: string,
    state: 'inventory' | 'paired' | 'unpaired' | 'lost'
}

class GetCustomerVehicle {
    constructor(private adlogs: Adlogs, private vehicleRepository: IVehicleRepository, private pairingRepository: IPairingRepository){}

    public execute = async (customerID: string): Promise< VehicleListItem[] | null > => {
        let err = ''
        const returnedList: VehicleListItem[] = []
        const vehicleList = await this.vehicleRepository.getVehicleByCustomer(customerID)
        if(vehicleList.data){
            for (const vehicle of vehicleList.data) {
                // -> Get vehicle pairing
                const vehiclePairing = await this.pairingRepository.getPairingbyVehicle(vehicle.id || '', false)
                if(vehiclePairing.data){
                    const paired = vehiclePairing.data.length && (vehiclePairing.data.filter(x => ['lost', 'end'].includes(x.state)).length === 0) || 0
                    returnedList.push({
                        id: vehicle.id || '',
                        numberplate: vehicle.numberplate,
                        brand: vehicle.brand,
                        model: vehicle.model,
                        driver: vehicle.driver,
                        group: vehicle.group,
                        state: paired ? 'paired' : vehicle.state
                    })
                } else err = vehiclePairing.err || ''
            }
            return returnedList
        }else err = vehicleList.err || ''

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

export default GetCustomerVehicle