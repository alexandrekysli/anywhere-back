import Adlogs from "#core/adlogs/index.js"
import SMS from "#utils/external/sms/index.js"
import Utils from "#utils/index.js"
import IUserRepository from "../repositories/IUserRepository"

// -> TS
type AccountRecoveryData = { pass: boolean, err: string }

class RecoveryUserAccount {
    private sms
    constructor(private adlogs: Adlogs, private repository: IUserRepository){
        this.sms = new SMS(adlogs)
    }

    public execute = async (email: string): Promise<AccountRecoveryData> => {
        let err = ''
        const user = await this.repository.getUserBySpecs(email, '')

        if(user.err) err = user.err
        else{
            if(user.data){
                const generatedPassword = Utils.genString(8, true)
                const passHash = Utils.makeSHA256(`${generatedPassword}@${email}`)
                const fullPassHash = Utils.makeSHA256(`4[${passHash}]Gl0410fG0D`)
                const result = await this.repository.setUserAuthPassHash(String(user.data.id), fullPassHash)
                if(result.err) err = result.err
                else{
                    // -> New Password making for user -> Send SMS to this
                    const smsSend = await this.sms.sendOldAccountAuthData(user.data.phone, `${user.data.surname} ${user.data.name}`, user.data.email, generatedPassword)
                    return { pass: smsSend, err: '' }
                }
            }else return { pass: false, err: 'Cet adresse e-mail n\'est liée à aucun compte !' }
        }

        if(err){
            this.adlogs.writeRuntimeEvent({
                category: 'app',
                type: 'stop',
                message: `unable to use db < ${err} >`,
                save: true
            })
        }
        return { pass: false, err: '' }
    }
}

export default RecoveryUserAccount