import UserEntity from "#app/entities/user.js"
import Adlogs from "#core/adlogs/index.js"
import Archange from "#core/archange/index.js"
import IUserRepository from "../repositories/IUserRepository"

/** TS */
type AccountRecoveryData = { email: string, tfa: boolean }

class CheckUserAccountRecoveryEmail {
    constructor(private adlogs: Adlogs, private repository: IUserRepository){}

    public execute = async (email: string): Promise< AccountRecoveryData | null > => {
        const user = (await this.repository.getUserBySpecs(email, '')).data
        return user ? { email: user.email, tfa: user.auth.tfa_state } : null
    }
}

export default CheckUserAccountRecoveryEmail