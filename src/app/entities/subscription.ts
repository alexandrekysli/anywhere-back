import Utils from "#utils/index.js"
import PackageEntity from "./package"
import UserEntity from "./user"
import VehicleEntity from "./vehicle"

class SubscriptionEntity {
    constructor(
        public readonly customer: UserEntity | string,
        public readonly manager: UserEntity | string,
        public _package: PackageEntity | string,
        public readonly adding_date: number,
        public readonly starting_date: number,
        public readonly package_quantity: number,
        public vehicle: VehicleEntity[],
        public state: boolean,
        public id?: string
    ){}

    public status? = () => {
        if(this._package instanceof PackageEntity && this.state){
            const endDate = this.starting_date + this._package.day_validity * (86400000)
            const nowDate = Date.now()

            if(nowDate < this.starting_date) return 'wait'
            else if(nowDate > endDate) return 'end'
            else return 'actual'
        }
        return ''
    }

    public endDate? = () => {
        if(this._package instanceof PackageEntity && this.state){
            const endDate = this.starting_date + this._package.day_validity * (86400000)
            return Utils.timestampDiff(endDate, Date.now(), 'day')
        }
        return 0
    }
}

export default SubscriptionEntity