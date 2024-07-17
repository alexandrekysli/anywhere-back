import Adlogs from "#core/adlogs/index.js"
import Archange from "#core/archange/index.js"
import Utils from "#utils/index.js"
import IUserRepository from "../repositories/IUserRepository"

class LoginUser {
    constructor(private adlogs: Adlogs, private archange: Archange, private repository: IUserRepository){}

    public execute = async (pass_hash: string): Promise<{ pass: boolean, username?: string, linkHash?: string }> => {
        const fullPassHash = Utils.makeSHA256(`4[${pass_hash}]Gl0410fG0D`)        
        const userOnDB = (await this.repository.getUserByPassHash(fullPassHash))
        if(userOnDB.data !== undefined){
            if(userOnDB.data !== null){
                // -> User found -> login complete -> archange caller step
                const customerType = ['particular', 'corporate']
                const archangeUser = await this.archange.getArchangeUserByMasterID(userOnDB.data.master_id, customerType.includes(userOnDB.data.type) ? 'customer' : userOnDB.data.type)
                if(archangeUser){
                    return { pass: true, username: userOnDB.data.surname + ' ' + userOnDB.data.name, linkHash: archangeUser.link_hash }
                }else return { pass: false }
            }else return { pass: false }
        }else{
            this.adlogs.writeRuntimeEvent({
                category: 'app',
                type: 'stop',
                message: `unable to use db < ${userOnDB.err} >`,
                save: true
            })
            return { pass: false }
        }
    }
}

export default LoginUser