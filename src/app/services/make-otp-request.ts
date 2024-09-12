import Adlogs from "#core/adlogs/index.js"
import SMS from "#utils/external/sms/index.js"
import Utils from "#utils/index.js"
import IUserRepository from "../repositories/IUserRepository"

/** TS */
class MakeOTPRequest {
    private sms
    constructor(private adlogs: Adlogs, private repository: IUserRepository){
        this.sms = new SMS(adlogs)
    }

    public execute = async (email: string, actualPINList: string[]) => {
        const user = (await this.repository.getUserBySpecs(email, '')).data
        if(user){
            let pin = ''
            do { pin = Utils.genString(5, false, true) } while (pin === '')
            const smsSend = await this.sms.sendOTPPin(user.phone, pin)
            return smsSend ? { phone: Utils.obscurifyPhoneNumber(user.phone, 3), pin: pin } : false
        }else false
    }
}

export default MakeOTPRequest