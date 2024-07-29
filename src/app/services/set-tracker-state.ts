import IPairingRepository from "#app/repositories/IPairingRepository.js"
import ITrackerRepository from "#app/repositories/ITrackerRepository.js"
import Adlogs from "#core/adlogs/index.js"

class SetTrackerState {
    constructor(private adlogs: Adlogs, private trackerRepository: ITrackerRepository, private pairingRepository: IPairingRepository){}

    public execute = async (id: string, pairingID: string, state: 'inventory' | 'paired' | 'unpaired' | 'lost' | 'broken'): Promise<{ pass: boolean }> => {
        let err = ''
        if(!['inventory', 'paired'].includes(state) && pairingID !== ''){
            const result = await this.trackerRepository.setTrackerStatut(id, state)
            const pairingResult = await this.pairingRepository.setPairingState(pairingID, state === 'lost' ? 'lost' : 'end')
            if(result.err || pairingResult.err) err = result.err || pairingResult.err || ''
            else return { pass: true }
        }else{
            const result = await this.trackerRepository.setTrackerStatut(id, state)
            if(result.err) err = result.err
            else return { pass: true }
        }

        this.adlogs.writeRuntimeEvent({
            category: 'app',
            type: 'stop',
            message: `unable to use db < ${err} >`,
            save: true
        })
        return { pass: false }
    }
}

export default SetTrackerState