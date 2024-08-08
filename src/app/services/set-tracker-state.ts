import VehicleEntity from "#app/entities/vehicle.js"
import IPairingRepository from "#app/repositories/IPairingRepository.js"
import ITrackerRepository from "#app/repositories/ITrackerRepository.js"
import IVehicleRepository from "#app/repositories/IVehicleRepository.js"
import Adlogs from "#core/adlogs/index.js"

class SetTrackerState {
    constructor(private adlogs: Adlogs, private trackerRepository: ITrackerRepository, private pairingRepository: IPairingRepository, private vehicleRepository: IVehicleRepository){}

    public execute = async (id: string, pairingID: string, state: 'inventory' | 'paired' | 'unpaired' | 'lost' | 'broken'): Promise<{ pass: boolean }> => {
        let err = ''
        if(!['inventory', 'paired'].includes(state) && pairingID !== ''){
            // -> Retrieve pairing vehicle
            const pairingItem = await this.pairingRepository.getPairing(pairingID)
            let vehicleID = ''

            if(pairingItem.err) err = pairingItem.err
            else if(pairingItem.data && pairingItem.data.vehicle instanceof VehicleEntity){
                vehicleID = pairingItem.data.vehicle.id || ''
            }

            // -> next ...
            const setVehicleState = await this.vehicleRepository.setVehicleStatut(vehicleID, state === 'lost' ? 'lost' : 'unpaired')
            const setPairingState = await this.pairingRepository.setPairingState(pairingID, 'end')
            const setTrackerState = await this.trackerRepository.setTrackerStatut(id, state)
            err = setPairingState.err || setVehicleState.err || setTrackerState.err || ''
            if(err === '') return { pass: true }
        }else{
            const result = await this.trackerRepository.setTrackerStatut(id, state)
            if(result.err) err = result.err
            else return { pass: true }
        }

        this.adlogs.writeRuntimeEvent({
            category: 'app',
            type: 'stop',
            message: `unable to use db < ${err} >`,
            save: true
        })
        return { pass: false }
    }
}

export default SetTrackerState