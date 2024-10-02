import UserEntity from "#app/entities/user.js"
import Adlogs from "#core/adlogs/index.js"
import Archange from "#core/archange/index.js"
import Utils from "#utils/index.js"
import IUserRepository from "../repositories/IUserRepository"
import Email from "#utils/external/email/index.js"

/** TS */
type NewUserData = {
    account_type: 'global_manager' | 'manager' | 'corporate' | 'particular',
    name: string,
    surname: string,
    email: string,
    phone: string
}

type ExeResult = { err?: string, account_id?: string }

class AddNewUserAccount {
    private email

    constructor(private adlogs: Adlogs, private archange: Archange, private repository: IUserRepository){
        this.email = new Email(adlogs)
    }

    public execute = async (data: NewUserData, linkHash: string): Promise< ExeResult | null > => {
        const godfatherLinkHash = await this.repository.getUserByArchangeLinkHash(linkHash)
        const user = await this.repository.getUserBySpecs(data.email, data.phone)
        if(godfatherLinkHash.data &&  user.err !== ''){
            if(user.data) return { err: 'Un compte avec ces identifiants (email, numero de téléphone) existe déjà' }
            else {
                const randomPassword = Utils.genString(8, true, true)
                const firstHash = Utils.makeSHA256(`${randomPassword}@${data.email}`)
                const realPassHash = Utils.makeSHA256(`4[${firstHash}]Gl0410fG0D`)
                
                const newUser = await this.repository.addUser(new UserEntity(
                    data.name,
                    data.surname,
                    data.email,
                    data.phone,
                    Utils.genString(20, true, false),
                    data.account_type,
                    true,
                    Date.now(),
                    godfatherLinkHash.data.id || '',
                    godfatherLinkHash.data.id || '',
                    { modification_date: 0, tfa_state: false, pass_hash: realPassHash }
                ))

                if(newUser.data){
                    const customerType = ['particular', 'corporate']
                    // -> Make ArchangeUser
                    await this.archange.addArchangeUser(newUser.data.master_id)

                    this.adlogs.writeRuntimeEvent({
                        category: 'app',
                        type: 'info',
                        message: `new user account < ${newUser.data.email} > created by caller < ${linkHash} >`
                    })

                    this.email.sendNewAccountAuthData(newUser.data.email, `${newUser.data.surname} ${newUser.data.name}`, randomPassword)

                    return { account_id: newUser.data.id }
                }else return null
            }
        }else return null
    }
}

export default AddNewUserAccount