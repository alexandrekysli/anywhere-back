import Adlogs from "#core/adlogs/index.js"
import IPackageRepository from "#app/repositories/IPackageRepository.js"
import PackageEntity from "#app/entities/package.js"


/** TS */
type ExeResult = { err?: string, id?: string }

type NewPackageData = {
    name: string,
    day_validity: number,
    fleet: number,
    amount: number,
    accessibility: 'all' | 'particular' | 'corporate',
    allowed_option: string[]
}
class AddNewPackage {
    constructor(private adlogs: Adlogs, private packageRepository: IPackageRepository){}

    public execute = async (data: NewPackageData): Promise< ExeResult | null > => {
        let err = ''

        // -> Verify if package name is already use
        const packageWithThisName = await this.packageRepository.getPackageByName(data.name.toUpperCase())
        if(packageWithThisName.err) err = packageWithThisName.err
        else{
            if(packageWithThisName.data) return { err: 'Une formule avec ce nom existe déjà !' }
            else{
                const newPackage = await this.packageRepository.addPackage(new PackageEntity(
                    data.name.toUpperCase(),
                    data.day_validity,
                    data.fleet,
                    data.amount,
                    data.accessibility,
                    data.allowed_option,
                    Date.now()
                ))
        
                if(newPackage.data) return { id: newPackage.data.id  }
                else  err = newPackage.err || ''
            }
        }
        
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

export default AddNewPackage