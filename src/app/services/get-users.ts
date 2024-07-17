import Adlogs from "#core/adlogs/index.js"
import Archange from "#core/archange/index.js"
import IUserRepository from "../repositories/IUserRepository"

/** TS */
type UserData = {
    name: string,
    phone: string,
    email: string,
    auth: { tfa: boolean, modification_date: number },
    type: string,
    access: { name: string, description: string }[]
}

class GetUser {
    constructor(private adlogs: Adlogs, private archange: Archange, private repository: IUserRepository){}

    public execute = async (linkHash: string): Promise< UserData | null > => {
        const user = await this.repository.getUserByArchangeLinkHash(linkHash)        
        if(user.data){
            const customerType = ['particular', 'corporate']
            const archangeUser =  await this.archange.getArchangeUserByMasterID(user.data.master_id, customerType.includes(user.data.type) ? 'customer' : user.data.type)
            if(archangeUser && archangeUser.group){
                return {
                    name: user.data.surname + ' ' + user.data.name,
                    type: user.data.type,
                    email: user.data.email,
                    phone: user.data.phone,
                    access: archangeUser.group.access || [],
                    auth: { tfa: user.data.auth.tfa_state, modification_date: user.data.auth.modification_date }
                }
            }else return null
        }else return null
    }
}

export default GetUser