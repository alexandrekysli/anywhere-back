import VehicleEntity from "#app/entities/vehicle.js"
import IPairingRepository from "#app/repositories/IPairingRepository.js"
import IVehicleRepository from "#app/repositories/IVehicleRepository.js"
import Adlogs from "#core/adlogs/index.js"

/** TS */

class GetAvailableVehicle {
    constructor(private adlogs: Adlogs, private vehicleRepository: IVehicleRepository, private pairingRepository: IPairingRepository){}

    public execute = async (trackerID: string): Promise<{ list: ToCoupledItem[] }> => {
        let err = ''
        const trackerPairing = await this.pairingRepository.getPairingbyTracker(trackerID, false)
        const allVehicle = await this.vehicleRepository.getVehicles()
        if(trackerPairing.err || allVehicle.err) err = trackerPairing.err || allVehicle.err || ''
        else if (trackerPairing.data && allVehicle.data){
            const trackerPairingVehicle = trackerPairing.data.map(x => {
                if(x.vehicle instanceof VehicleEntity && x.state === 'heathly') return x.vehicle.id || ''
            }) || []
            
            return {
                list: allVehicle.data.filter(x => !trackerPairingVehicle.includes(x.id || '')).map(x => {
                    return { value: x.id || '', text: x.numberplate + ' | ' + x.brand + ' ' + x.model }
                })
            }
        }else return { list: [] }
        
        if(err){
            this.adlogs.writeRuntimeEvent({
                category: 'app',
                type: 'stop',
                message: `unable to use db < ${err} >`,
                save: true
            })
        }
        return { list: [] }
    }
}

export default GetAvailableVehicle