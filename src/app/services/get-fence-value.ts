import Adlogs from "#core/adlogs/index.js"
import IPairingRepository from "#app/repositories/IPairingRepository.js"
import IFenceAreaRepository from "#app/repositories/IFenceAreaRepository.js"

/** TS */
type FenceValue = { value: 'in' | 'out' | '' }

class GetFenceValue {
    constructor(private adlogs: Adlogs, private pairingRepository: IPairingRepository, private fenceAreaRepository: IFenceAreaRepository){}

    public execute = async (pairingID: string, position: Coordinates): Promise< FenceValue > => {
        let err = ''

        const pairing = await this.pairingRepository.getPairing(pairingID)

        if(pairing.data){
            const fenceValue = await this.fenceAreaRepository.checkPositionInArea(position, pairing.data.geofence)

            if(fenceValue.err) err = fenceValue.err || ''
            else return { value: fenceValue.data || '' }
        }else err = pairing.err || ''

        if(err){
            // -> Write error
            this.adlogs.writeRuntimeEvent({
                category: 'app',
                type: 'stop',
                message: `unable to use db < ${err} >`,
                save: true
            })
        }

        return { value: '' }
    }
}

export default GetFenceValue