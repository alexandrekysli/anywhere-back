import IFenceAreaRepository from "#app/repositories/IFenceAreaRepository.js"
import IPairingRepository from "#app/repositories/IPairingRepository.js"
import Adlogs from "#core/adlogs/index.js"

class SetFenceArea {
    constructor(private adlogs: Adlogs, private pairingRepository: IPairingRepository){}

    public execute = async (pairingID: string, fenceAreaID: string): Promise<{ pass: boolean }> => {
        let err = ''
        const pairing = (await this.pairingRepository.getPairing(pairingID)).data
        if(pairing){
            const setFenceAreaState = (await this.pairingRepository.setPairingGeofence(pairingID, fenceAreaID)).data
            if(setFenceAreaState){
                // -> Notify TrackingBot
                this.adlogs.hub.emit('refresh-pairing', pairingID)
                return { pass: setFenceAreaState }
            }
        }

        if(err){
            // -> Write error
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

export default SetFenceArea