import Adlogs from "#core/adlogs/index.js"
import ISubscriptionRepository from "#app/repositories/ISubscriptionRepository.js"
import IPackageRepository from "#app/repositories/IPackageRepository.js"
import PackageEntity from "#app/entities/package.js"
import UserEntity from "#app/entities/user.js"


/** TS */
type PackageData = {
    about: PackageEntity,
    subscription: {
        id: string,
        customer: string,
        begin_date: number,
        fleet: number,
        price: number,
        state: string
    }[]
}

class GetPackage {
    constructor(private adlogs: Adlogs, private packageRepository: IPackageRepository, private subscriptionRepository: ISubscriptionRepository){}

    public execute = async (id: string): Promise< PackageData | null > => {
        const _package = await this.packageRepository.getPackageByID(id)
        let err = ''
        if(_package.data){
            // -> Retrieve subscription link to package
            const subscriptionList = await this.subscriptionRepository.getSubscriptionByPackage(id)
            if(subscriptionList.data){
                const subscriptionParsed: PackageData['subscription'] = []
                subscriptionList.data.forEach(x => {
                    subscriptionParsed.push({
                        id: x.id || '',
                        customer: x.customer instanceof UserEntity ? (x.customer.surname + ' ' + x.customer.name) : '',
                        fleet: x.vehicle.length,
                        price: x._package instanceof PackageEntity ? x._package.amount : 0,
                        begin_date: x.starting_date,
                        state: x.status && x.status() || 'end'
                    })
                })
                return {
                    about: _package.data,
                    subscription: subscriptionParsed
                }
            }else err = subscriptionList.err || ''
        }else err = _package.err || ''

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

export default GetPackage