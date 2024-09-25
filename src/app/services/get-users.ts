import UserEntity from "#app/entities/user.js"
import Adlogs from "#core/adlogs/index.js"
import Archange from "#core/archange/index.js"
import IUserRepository from "../repositories/IUserRepository"

/** TS */
type UserData = {
    id: string,
    name: string,
    phone: string,
    email: string,
    adding_date: number,
    auth: { tfa: boolean, modification_date: number },
    type: string,
    godfather: string,
    manager: string
}

class GetUser {
    constructor(private adlogs: Adlogs, private archange: Archange, private repository: IUserRepository){}

    public execute = async (linkHash: string): Promise< UserData | null > => {
        const user = await this.repository.getUserByArchangeLinkHash(linkHash)
        if(user.data){
            const archangeUser =  await this.archange.getArchangeUserByMasterID(user.data.master_id)
            if(archangeUser){
                return {
                    id: user.data.id || '',
                    name: user.data.surname + ' ' + user.data.name,
                    type: user.data.type,
                    email: user.data.email,
                    phone: user.data.phone,
                    adding_date: user.data.adding_date,
                    godfather: user.data.godfather instanceof UserEntity ? user.data.godfather.surname + ' ' + user.data.godfather.name : user.data.godfather,
                    manager: user.data.manager instanceof UserEntity ? user.data.manager.surname + ' ' + user.data.manager.name : user.data.manager,
                    auth: { tfa: user.data.auth.tfa_state, modification_date: user.data.auth.modification_date }
                }
            }else return null
        }else return null
    }
}

export default GetUser