import Adlogs from "#core/adlogs/index.js"
import IPairingEventRepository from "#app/repositories/IPairingEventRepository.js"

/** TS */
type FenceValue = { value: 'in' | 'out' | '' }

class GetLastPairingFenceValue {
    constructor(private repository: IPairingEventRepository){}

    public execute = async (pairingID: string): Promise< FenceValue > => {
        const lastEvent = (await this.repository.getLastPairingEvent(pairingID)).data
        
        if(lastEvent){
            return { value: lastEvent.fence }
        }

        return { value: '' }
    }
}

export default GetLastPairingFenceValue