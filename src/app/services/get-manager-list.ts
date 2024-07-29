import Adlogs from "#core/adlogs/index.js"
import IUserRepository from "../repositories/IUserRepository"

/** TS */
type ManagerListItem = {
    id: string,
    name: string,
    type: string,
    state: 'active' | 'disable'
}

class GetManagerList {
    constructor(private adlogs: Adlogs, private userRepository: IUserRepository){}

    public execute = async (): Promise< ManagerListItem[] > => {
        const managerUserList = await this.userRepository.getUserByType('manager')
        if(managerUserList.data){
            return managerUserList.data.map(x => {
                return {
                    id: x.id || '',
                    name: x.surname + ' ' + x.name,
                    state: x.state ? 'active' : 'disable',
                    type: x.type
                }
            })
        }else{
            this.adlogs.writeRuntimeEvent({
                category: 'app',
                type: 'stop',
                message: `unable to use db < ${managerUserList.err} >`,
                save: true
            })
            return []
        }
    }
}

export default GetManagerList