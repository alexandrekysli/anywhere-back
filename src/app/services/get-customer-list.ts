import Adlogs from "#core/adlogs/index.js"
import IUserRepository from "../repositories/IUserRepository"
import ISubscriptionRepository from "#app/repositories/ISubscriptionRepository.js"
import IVehicleRepository from "#app/repositories/IVehicleRepository.js"


/** TS */
type CustomerListItem = {
    id: string,
    name: string,
    phone: string,
    type: string,
    fleet: number,
    state: 'active' | 'inactive' | 'disable'
}

class GetCustomerList {
    constructor(private adlogs: Adlogs, private userRepository: IUserRepository, private subscriptionRepository: ISubscriptionRepository, private vehicleRepository: IVehicleRepository){}

    public execute = async (manager?: string, linkHash?: string): Promise< CustomerListItem[] | null > => {
        const returnedList: CustomerListItem[] = []
        const requestor = (await this.userRepository.getUserByArchangeLinkHash(linkHash || '')).data

        const customerUserList = await this.userRepository.getUserByType('customer')
        if(customerUserList.data){
            for (const customer of customerUserList.data) {
                let fleet = 0
                let pass = true
                const activeSubscription = await this.subscriptionRepository.getActiveSubscriptionByCustomer(customer.id || '')

                if(manager){
                    pass = customer.manager === manager ? true : false
                    const vehicles = await this.vehicleRepository.getVehicleByCustomer(customer.id || '')
                    if(vehicles.data) fleet = vehicles.data.length
                }else if(requestor){
                    if(
                        !['global_manager', 'admin'].includes(requestor.type) &&
                        customer.manager !== requestor.id
                    ) pass = false
                }

                if(pass){
                    returnedList.push({
                        id: customer.id || '',
                        name: customer.surname + ' ' + customer.name,
                        phone: customer.phone,
                        fleet: fleet,
                        state: customer.state ? activeSubscription.data?.length && 'active' || "inactive" : 'disable',
                        type: customer.type
                    })
                }
            }
            return returnedList
        }else{
            this.adlogs.writeRuntimeEvent({
                category: 'app',
                type: 'stop',
                message: `unable to use db < ${customerUserList.err} >`,
                save: true
            })
            return null
        }
    }
}

export default GetCustomerList