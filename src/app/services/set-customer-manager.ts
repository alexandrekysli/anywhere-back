import IPairingRepository from "#app/repositories/IPairingRepository.js"
import IVehicleRepository from "#app/repositories/IVehicleRepository.js"
import Adlogs from "#core/adlogs/index.js"
import IUserRepository from "../repositories/IUserRepository"

class SetCustomerManager {
    constructor(private adlogs: Adlogs, private repository: IUserRepository, private vehicleRepository: IVehicleRepository, private pairingRepository: IPairingRepository){}

    public execute = async (customerID: string, managerID: string): Promise<{ pass: boolean }> => {
        let err = ''
        const manager = await this.repository.getUserByID(managerID)
        
        if(manager.err){
            err = manager.err
        }else{
            const result = await this.repository.setUserManager(customerID, managerID)
            if(result.err) err = result.err
            else{
                let pairingList: string[] = []
                const customerVehicleList = (await this.vehicleRepository.getVehicleByCustomer(String(customerID))).data
                if(customerVehicleList){
                    for (const vehicle of customerVehicleList) {
                        const vehiclePairingList = (await this.pairingRepository.getPairingbyVehicle(String(vehicle.id), false)).data
                        if(vehiclePairingList) pairingList = [...pairingList, ...vehiclePairingList.map(pairing => String(pairing.id))]
                    }
                }
                // -> Notify TrackingBot
                pairingList.forEach(pairing =>  this.adlogs.hub.emit('refresh-pairing', pairing))
                return { pass: true }
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

export default SetCustomerManager