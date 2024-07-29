import Adlogs from "#core/adlogs/index.js"
import IPackageRepository from "#app/repositories/IPackageRepository.js"
import PackageEntity from "#app/entities/package.js"

class GetPackageListFull {
    constructor(private adlogs: Adlogs, private packageRepository: IPackageRepository){}

    public execute = async (): Promise< PackageEntity[] > => {
        const _packages = await this.packageRepository.getPackages()
        let err = ''
        if(_packages.data){
            return _packages.data
        }else err = _packages.err || ''

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

export default GetPackageListFull