import Adlogs from "#core/adlogs/index.js"
import Archange from "#core/archange/index.js"
import IUserRepository from "../repositories/IUserRepository"

class SetUserState {
    constructor(private adlogs: Adlogs, private archange: Archange, private repository: IUserRepository){}

    public execute = async (id: string, state: boolean): Promise<{ pass: boolean }> => {
        const user = (await this.repository.getUserByID(id)).data
        if(user){
            const result = await this.repository.setUserState(id, state)

            if(result.err){
                this.adlogs.writeRuntimeEvent({
                    category: 'app',
                    type: 'stop',
                    message: `unable to use db < ${result.err} >`,
                    save: true
                })
            }else{
                result.data && this.archange.setActiveCallerWithAppAccountState(String(user.id), state)

                this.adlogs.writeRuntimeEvent({
                    category: 'archange',
                    type: state ? 'info' : 'warning',
                    message: `application access ${state ? 'enabled' : 'disabled'} for user < ${ user.email } >`,
                    save: true
                })

                return { pass: result.data || false }
            }
        }
        return { pass: false }
    }
}

export default SetUserState