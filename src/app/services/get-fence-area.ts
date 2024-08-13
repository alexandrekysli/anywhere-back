import IFenceAreaRepository from "#app/repositories/IFenceAreaRepository.js"
import IPairingRepository from "#app/repositories/IPairingRepository.js"
import Adlogs from "#core/adlogs/index.js"

class GetFenceArea {
    constructor(private adlogs: Adlogs, private pairingRepository: IPairingRepository, private fenceAreaRepository: IFenceAreaRepository){}

    public execute = async (pairingID: string): Promise<{ id: string, name: string, coordinates: Coordinates[] } | undefined> => {
        let err = ''

        const pairing = await this.pairingRepository.getPairing(pairingID)

        if(pairing.data){
            const fenceArea = (await this.fenceAreaRepository.getArea(pairing.data.geofence)).data
            
            if(fenceArea){
                return { 
                    id: fenceArea.id || '',
                    name: fenceArea.name,
                    coordinates: fenceArea.geometry.coordinates[0].map(x => {
                        return { lat: x[1], lng: x[0] }
                    })
                }
            }
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

        return undefined
    }
}

export default GetFenceArea