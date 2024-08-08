import Adlogs from "#core/adlogs/index.js"
import IPairingRepository from "#app/repositories/IPairingRepository.js"
import VehicleEntity from "#app/entities/vehicle.js"
import UserEntity from "#app/entities/user.js"


/** TS */
type TrackerPairingData = {
    id: string,
    identifier: string,
    vehicle: string,
    customer: string,
    begin_date: number,
    end_date: number,
    state: string
}

class GetTrackerPairingList {
    constructor(private adlogs: Adlogs, private pairingRepository: IPairingRepository){}

    public execute = async (trackerID: string): Promise< TrackerPairingData[] > => {
        let err = ''
        const pairingList: TrackerPairingData[] = []

        const pairings = await this.pairingRepository.getPairingbyTracker(trackerID, false)
        if(pairings.data){
            pairings.data.forEach(pairing => {
                if(pairing.vehicle instanceof VehicleEntity){
                    const vehicle = pairing.vehicle.brand + ' ' + pairing.vehicle.model + ' - ' + pairing.vehicle.numberplate
                    const customer = pairing.vehicle.customer instanceof UserEntity && (pairing.vehicle.customer.surname + ' ' + pairing.vehicle.customer.name) ||' '

                    pairingList.push({
                        id: pairing.id || '',
                        identifier: pairing.identifier,
                        customer: customer,
                        vehicle: vehicle,
                        begin_date: pairing.begin_date,
                        end_date: pairing.end_date,
                        state: pairing.end_date ? 'unpaired' : 'paired'
                    })
                }
            })
            return pairingList
        }else err = pairings.err || ''

        // -> Write error
        this.adlogs.writeRuntimeEvent({
            category: 'app',
            type: 'stop',
            message: `unable to use db < ${err} >`,
            save: true
        })
        return []
    }
}

export default GetTrackerPairingList