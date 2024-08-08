import UserEntity from "#app/entities/user.js"
import VehicleEntity from "#app/entities/vehicle.js"
import IPairingRepository from "#app/repositories/IPairingRepository.js"
import ISubscriptionRepository from "#app/repositories/ISubscriptionRepository.js"
import IVehicleRepository from "#app/repositories/IVehicleRepository.js"
import Adlogs from "#core/adlogs/index.js"
import IUserRepository from "../repositories/IUserRepository"
import GetCustomerList from "./get-customer-list"


class GetUserPairingList {
    constructor(
        private adlogs: Adlogs,
        private userRepository: IUserRepository,
        private subscriptionRepository: ISubscriptionRepository,
        private vehicleRepository: IVehicleRepository,
        private pairingRepository: IPairingRepository,
    ){}

    public execute = async (userID: string): Promise<{ list: string[] }> => {
        const getCustomerList = new GetCustomerList(this.adlogs, this.userRepository, this.subscriptionRepository, this.vehicleRepository)

        let err = ''
        const customerList: string[] = []
        const pairingList: string[] = []

        const user = await this.userRepository.getUserByID(userID)
        const allPairing = ((await this.pairingRepository.getAllPairing(true)).data || []).filter(x => x.event_list.length)

        if(user.data){
            if(['particular', 'corporate'].includes(user.data.type)){
                customerList.push(user.data.id || '')
            }else if(user.data.type === 'manager'){
                const managerCustomerList = await getCustomerList.execute(userID) || []
                managerCustomerList.forEach(x => customerList.push(x.id || ''))
            }else{
                const allCustomerList = (await this.userRepository.getUserByType('customer')).data || []
                allCustomerList.forEach(x => customerList.push(x.id || ''))
            }

            // -> Retrieve not-empty pairing
            customerList.forEach(customer => {
                const customerPairingList = allPairing.filter(pairing => {
                    const pairingCustomer = pairing.vehicle instanceof VehicleEntity ? (pairing.vehicle.customer instanceof UserEntity ? pairing.vehicle.customer.id || '' : pairing.vehicle.customer) : ''
                    if(pairingCustomer === customer) return true
                })

                customerPairingList.forEach(x => pairingList.push(x.id || ''))
            })

            return { list: pairingList }
        }else if (user.err) err = user.err || ''
        
        if(err){
            this.adlogs.writeRuntimeEvent({
                category: 'app',
                type: 'stop',
                message: `unable to use db < ${err} >`,
                save: true
            })
        }
        return { list: [] }
    }
}

export default GetUserPairingList