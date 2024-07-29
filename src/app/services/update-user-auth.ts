import Adlogs from "#core/adlogs/index.js"
import Utils from "#utils/index.js"
import IUserRepository from "../repositories/IUserRepository"

class UpdateUserAuth {
    constructor(private adlogs: Adlogs, private repository: IUserRepository){}

    public execute = async (pass_hash: string, type: string, list: { '2fa': boolean, email: string, phone: string, password: string }): Promise<{ pass: boolean, err?: string }> => {
        let err = ''
        const fullPassHash = Utils.makeSHA256(`4[${pass_hash}]Gl0410fG0D`)
        const exeUser = await this.repository.getUserByPassHash(fullPassHash)

        if(exeUser.err) err = exeUser.err
        else{
            if(exeUser.data){
                // -> Executor found -> Update data
                const userID = exeUser.data.id || ''
                if(type === '2fa'){
                    const result = await this.repository.setUserAuth2fa(userID, list["2fa"])
                    if(result.err) err = result.err
                    else return { pass: true }
                }else if(type === 'phone'){
                    const accountWithThisPhone = await this.repository.getUserBySpecs('', list.phone)
                    if(accountWithThisPhone.err) err = accountWithThisPhone.err
                    else{
                        if(accountWithThisPhone.data){
                            return { pass: false, err: 'Un compte utilise déjà ce numéro de téléphone !' }
                        }else{
                            const result = await this.repository.setUserAuthPhone(userID, list.phone)
                            if(result.err) err = result.err
                            else return { pass: true }
                        }
                    }
                }else if(type === 'email'){
                    const accountWithThisEmail = await this.repository.getUserBySpecs(list.email, '')
                    if(accountWithThisEmail.err) err = accountWithThisEmail.err
                    else{
                        if(accountWithThisEmail.data){
                            return { pass: false, err: 'Un compte utilise déjà cette adresse email !' }
                        }else{
                            const resultEmail = await this.repository.setUserAuthEmail(userID, list.email)
                            const resultPassHash = await this.repository.setUserAuthPassHash(userID, Utils.makeSHA256(`4[${list.password}]Gl0410fG0D`))
                            if(resultEmail.err || resultPassHash.err) err = resultEmail.err || resultPassHash.err || ''
                            else return { pass: true }
                        }
                    }
                }else if(type === 'password'){
                    const result = await this.repository.setUserAuthPassHash(userID, Utils.makeSHA256(`4[${list.password}]Gl0410fG0D`))
                    if(result.err) err = result.err
                    else return { pass: true }
                }
            }else{
                // -> Executor not found -> bad password
                return { pass: false, err: 'Votre mot de passe est incorrect !' }
            }
        }

        //const result = await this.repository.setUserState(id, state)
        

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

export default UpdateUserAuth