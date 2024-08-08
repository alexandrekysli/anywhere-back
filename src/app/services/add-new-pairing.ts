import Adlogs from "#core/adlogs/index.js"
import ITrackerRepository from "#app/repositories/ITrackerRepository.js"
import TrackerEntity from "#app/entities/tracker.js"
import IPairingRepository from "#app/repositories/IPairingRepository.js"
import IVehicleRepository from "#app/repositories/IVehicleRepository.js"
import Utils from "#utils/index.js"
import PairingEntity from "#app/entities/pairing.js"


/** TS */
class AddNewPairing {
    constructor(private adlogs: Adlogs, private pairingRepository: IPairingRepository, private vehicleRepository: IVehicleRepository, private trackerRepository: ITrackerRepository){}

    public execute = async (trackerID: string, vehicleID: string): Promise<{ pass: boolean }> => {
        let err = ''

        // -> Retrieve last heathly pairing
        const allVehiclePairing = await this.pairingRepository.getPairingbyVehicle(vehicleID, false)
        if(allVehiclePairing.err) err = allVehiclePairing.err
        else{
            if(allVehiclePairing.data && allVehiclePairing.data.length){
                const lastPairing = allVehiclePairing.data.filter(x => x.state === 'heathly')[0]
                if(lastPairing && lastPairing.tracker instanceof TrackerEntity ){
                    // -> End pairing
                    const setPairingState = await this.pairingRepository.setPairingState(lastPairing.id || '', 'end')
                    const setVehicleState = await this.vehicleRepository.setVehicleStatut(vehicleID, 'unpaired')
                    const setTrackerState = await this.trackerRepository.setTrackerStatut(lastPairing.tracker.id || '', 'paired')
                    err = setPairingState.err || setVehicleState.err || setTrackerState.err || ''
                }
            }
        }

        if(err === ''){
            // -> Add new pairing
            const identifier = 'PTV-' + Utils.genString(5, false, false)
            const newPairingState = await this.pairingRepository.addPairing(new PairingEntity(identifier, vehicleID || '', trackerID, Date.now(), 0, '', 'heathly', 0, [], [] ))
            const updateVehicleState = await this.vehicleRepository.setVehicleStatut(vehicleID, 'paired')
            const updateTrackerState = await this.trackerRepository.setTrackerStatut(trackerID, 'paired')
            err = newPairingState.err || updateVehicleState.err || updateTrackerState.err || ''
        }

        if(err === '') return { pass: true }
        
        // -> Write error
        this.adlogs.writeRuntimeEvent({
            category: 'app',
            type: 'stop',
            message: `unable to use db < ${err} >`,
            save: true
        })

        return { pass: false }
    }
}

export default AddNewPairing