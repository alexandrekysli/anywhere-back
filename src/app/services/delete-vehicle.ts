import IVehicleRepository from "#app/repositories/IVehicleRepository.js"
import Adlogs from "#core/adlogs/index.js"

class DeleteVehicle {
    constructor(private adlogs: Adlogs, private repository: IVehicleRepository){}

    public execute = async (id: string): Promise<{ pass: boolean }> => {
        let err = ''

        const removeState = await this.repository.removeVehicle(id)
        if(removeState.data) return { pass : true }
        else err = removeState.err || ''

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

export default DeleteVehicle