import Adlogs from "#core/adlogs/index.js"
import IPackageRepository from "#app/repositories/IPackageRepository.js"


/** TS */
type PackageListData = { id: string, name: string, price: number, validity: number, fleet: number, accessibility: string }

class GetPackageList {
    constructor(private adlogs: Adlogs, private packageRepository: IPackageRepository){}

    public execute = async (): Promise< PackageListData[] > => {
        const _packages = await this.packageRepository.getPackages()
        let err = ''
        if(_packages.data){
            return _packages.data.map(x => {
                return { id: x.id || '', name: x.name, price: x.amount, validity: x.day_validity, fleet: x.fleet_count, accessibility: x.accessibility }
            })
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

export default GetPackageList