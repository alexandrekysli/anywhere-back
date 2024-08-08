import Adlogs from "#core/adlogs/index.js"
import IPairingTripRepository from "#app/repositories/IPairingTripRepository.js"
import PairingTripEntity from "#app/entities/pairing-trip.js"


/** TS */
class AddNewPairingTrip {
    constructor(private adlogs: Adlogs, private repository: IPairingTripRepository){}

    public execute = async (pairingID: string, pairingEventList: string[]): Promise<boolean> => {
        const result = await this.repository.addTrip(new PairingTripEntity(Date.now(), pairingEventList, pairingID))

        if(result.data) return true
        else {
            // -> Write error
            this.adlogs.writeRuntimeEvent({
                category: 'app',
                type: 'stop',
                message: `unable to use db < ${result.err} >`,
                save: true
            })
            return false
        }
    }
}

export default AddNewPairingTrip