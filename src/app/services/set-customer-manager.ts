import Adlogs from "#core/adlogs/index.js"
import IUserRepository from "../repositories/IUserRepository"

class SetCustomerManager {
    constructor(private adlogs: Adlogs, private repository: IUserRepository){}

    public execute = async (customerID: string, managerID: string): Promise<{ pass: boolean }> => {
        let err = ''
        const manager = await this.repository.getUserByID(managerID)
        
        if(manager.err){
            err = manager.err
        }else{
            const result = await this.repository.setUserManager(customerID, managerID)
            if(result.err) err = result.err
            else return { pass: true }
        }

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

export default SetCustomerManager