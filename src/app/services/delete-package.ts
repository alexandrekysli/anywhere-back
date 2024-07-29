import IPackageRepository from "#app/repositories/IPackageRepository.js"
import Adlogs from "#core/adlogs/index.js"

class DeletePackage {
    constructor(private adlogs: Adlogs, private repository: IPackageRepository){}

    public execute = async (id: string): Promise<{ pass: boolean }> => {
        let err = ''

        const removeState = await this.repository.removePackage(id)
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

export default DeletePackage