import Adlogs from "#core/adlogs/index.js"
import Archange from "#core/archange/index.js"
import Utils from "#utils/index.js"
import IUserRepository from "../repositories/IUserRepository"

class DeleteUser {
    constructor(private adlogs: Adlogs, private archange: Archange, private repository: IUserRepository){}

    public execute = async (id: string, pass_hash: string): Promise<{ pass: boolean, err?: string }> => {
        let err = ''
        const fullPassHash = Utils.makeSHA256(`4[${pass_hash}]Gl0410fG0D`)
        const exeUser = await this.repository.getUserByPassHash(fullPassHash)

        if(exeUser.err){
            err = exeUser.err
        }else{
            if(exeUser.data){
                // -> Executor found
                const userToRemove = await this.repository.getUserByID(id)
                const removeState = await this.repository.removeUser(id)

                if(userToRemove.err || removeState.err){
                    err = userToRemove.err || removeState.err || ''
                }else{
                    // -> Remove archange user
                    await this.archange.removeArchangeUserByMasterID(userToRemove.data?.master_id || '')
                    return { pass: true }
                }
            }else{
                // -> Executor not found -> bad password
                return { pass: false, err: 'Votre mot de passe est incorrect !' }
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
        return { pass: false }
    }
}

export default DeleteUser