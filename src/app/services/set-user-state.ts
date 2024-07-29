import Adlogs from "#core/adlogs/index.js"
import IUserRepository from "../repositories/IUserRepository"

class SetUserState {
    constructor(private adlogs: Adlogs, private repository: IUserRepository){}

    public execute = async (id: string, state: boolean): Promise<{ pass: boolean }> => {
        const result = await this.repository.setUserState(id, state)
        if(result.err){
            this.adlogs.writeRuntimeEvent({
                category: 'app',
                type: 'stop',
                message: `unable to use db < ${result.err} >`,
                save: true
            })
            return { pass: false }
        }else{
            return { pass: result.data || false }
        }
    }
}

export default SetUserState