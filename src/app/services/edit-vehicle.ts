import IVehicleRepository from "#app/repositories/IVehicleRepository.js"
import Adlogs from "#core/adlogs/index.js"

class EditVehicle {
    constructor(private adlogs: Adlogs, private repository: IVehicleRepository){}

    public execute = async (id: string, numberplate: string, group: string, driver: string, speed: number): Promise<{ pass: boolean }> => {
        let err = ''
        const result = await this.repository.editVehicle(id, numberplate, group, driver, speed)
        
        if(result.err) err = result.err
        else return { pass: true }

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

export default EditVehicle