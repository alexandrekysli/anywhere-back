import Adlogs from "#core/adlogs/index.js"
import IUserRepository from "../repositories/IUserRepository"

/** TS */

class GetAvailableCustomer {
    constructor(private adlogs: Adlogs, private repository: IUserRepository){}

    public execute = async (managerID: string): Promise<{ list: ToCoupledItem[] }> => {
        let err = ''
        const customerList = await this.repository.getUserByType('customer')
        if(customerList.err) err = customerList.err
        else if(customerList.data){
            return {
                list: customerList.data.filter(x => x.manager !== managerID).map(x => {
                    return { value: x.id || '', text: x.surname + ' ' + x.name }
                } )
            }
        }
        
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

export default GetAvailableCustomer