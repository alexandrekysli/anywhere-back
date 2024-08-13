import TrackerEntity from "#app/entities/tracker.js"
import IPairingRepository from "#app/repositories/IPairingRepository.js"
import Adlogs from "#core/adlogs/index.js"
import Utils from "#utils/index.js"
import IUserRepository from "../repositories/IUserRepository"

class SetPairingIORelayState {
    constructor(private adlogs: Adlogs, private pairingRepository: IPairingRepository, private userRepository: IUserRepository){}

    public execute = async (id: string, state: boolean, pass_hash: string): Promise<{ pass: boolean, err?: string }> => {
        let err = ''
        const fullPassHash = Utils.makeSHA256(`4[${pass_hash}]Gl0410fG0D`)
        const exeUser = await this.userRepository.getUserByPassHash(fullPassHash)

        if(exeUser.err){
            err = exeUser.err
        }else{
            if(exeUser.data){
                // -> Executor found -> Retrieve Pairing tracker IMEI
                const tracker = (await this.pairingRepository.getPairing(id)).data?.tracker
                if(tracker instanceof TrackerEntity){
                    this.adlogs.hub.emit('change-tracker-relay-state', { brand: tracker.brand, imei: tracker.imei, state: state })
                    return { pass: true }
                }else return { pass: false, err: 'Ce couplage n\'existe pas !' }
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

export default SetPairingIORelayState