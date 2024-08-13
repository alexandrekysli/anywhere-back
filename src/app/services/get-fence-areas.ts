import IFenceAreaRepository from "#app/repositories/IFenceAreaRepository.js"
import IPairingRepository from "#app/repositories/IPairingRepository.js"
import Adlogs from "#core/adlogs/index.js"

class GetFenceAreas {
    constructor(private adlogs: Adlogs, private pairingRepository: IPairingRepository, private fenceAreaRepository: IFenceAreaRepository){}

    public execute = async (pairingID: string): Promise<{ list: { id: string, name: string, actual: boolean }[] }> => {
        let err = ''

        const pairing = await this.pairingRepository.getPairing(pairingID)
        const fenceArea = await this.fenceAreaRepository.getAreas()

        if(pairing.data && fenceArea.data){
            return {
                list: fenceArea.data.map(x => {
                    return {
                        id: x.id || '',
                        name: x.name,
                        actual: pairing.data?.geofence === x.id
                    }
                })
            }
        }else err = pairing.err || fenceArea.err || ''

        if(err){
            // -> Write error
            this.adlogs.writeRuntimeEvent({
                category: 'app',
                type: 'stop',
                message: `unable to use db < ${err} >`,
                save: true
            })
        }

        return { list: [] }
    }
}

export default GetFenceAreas