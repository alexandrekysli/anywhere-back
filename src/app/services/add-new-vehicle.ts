import Adlogs from "#core/adlogs/index.js"
import IVehicleRepository from "#app/repositories/IVehicleRepository.js"
import VehicleEntity from "#app/entities/vehicle.js"
import IPairingRepository from "#app/repositories/IPairingRepository.js"
import PairingEntity from "#app/entities/pairing.js"
import ITrackerRepository from "#app/repositories/ITrackerRepository.js"
import Utils from "#utils/index.js"


/** TS */
type ExeResult = { err?: string, id?: string }

type NewVehicleData = {
    customer: string,
    numberplate: string,
    brand: string,
    model: string,
    type: 'motorcycle' | 'car' | 'truck',
    group: string,
    driver: string,
    tracker: string
}
class AddNewVehicle {
    constructor(private adlogs: Adlogs, private repository: IVehicleRepository, private trackerRepository: ITrackerRepository, private pairingRepository: IPairingRepository){}

    public execute = async (data: NewVehicleData): Promise< ExeResult | null > => {
        let err = ''

        const newVehicle = await this.repository.addVehicle(new VehicleEntity(
            data.brand,
            data.model,
            data.numberplate,
            data.type,
            data.group,
            data.driver,
            data.customer,
            120,
            'inventory',
            Date.now()
        ))

        if(newVehicle.err) err = newVehicle.err
        else if(newVehicle.data){
            // -> Add new pairing -> if tracker is set
            if(data.tracker){
                const identifier = 'PTV-' + Utils.genString(5, false, false)
                const pairing = await this.pairingRepository.addPairing(new PairingEntity(identifier, newVehicle.data.id || '', data.tracker, Date.now(), 0, '', 'tracker-off', 0, [], [] ))
                const updateTrackerState = await this.trackerRepository.setTrackerStatut(data.tracker, 'paired')
                if(pairing.err || updateTrackerState.err ) err = pairing.err || updateTrackerState.err || ''
                else { id: newVehicle.data.id || '' }
            }else return { id: newVehicle.data.id || '' }
        }

        if(newVehicle.data) return { id: newVehicle.data.id  }
        else err = newVehicle.err || ''
        
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

export default AddNewVehicle