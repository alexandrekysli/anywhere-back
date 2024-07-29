import Adlogs from "#core/adlogs/index.js"
import IUserRepository from "../repositories/IUserRepository"

/** TS */

class GetAvailableManager {
    constructor(private adlogs: Adlogs, private repository: IUserRepository){}

    public execute = async (customerID: string): Promise<{ list: ToCoupledItem[] }> => {
        let err = ''
        const customer = await this.repository.getUserByID(customerID)
        const allManager = await this.repository.getAvailableManager()
        if(customer.err || allManager.err){
            err = customer.err || allManager.err || ''
        }else if(!customer.data){
            return { list: [] }
        }else{
            const customerAvailableManager = allManager.data && allManager.data.filter(x => x.id !== customer.data?.manager) || []
            return {
                list: customerAvailableManager.map(x => {
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

export default GetAvailableManager