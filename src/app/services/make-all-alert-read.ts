import Adlogs from "#core/adlogs/index.js"
import IPairingEventRepository from "#app/repositories/IPairingEventRepository.js"


/** TS */
class MakeAllAlertRead {
    constructor(private adlogs: Adlogs, private repository: IPairingEventRepository){}

    public execute = async (pairingID: string): Promise< { pass: boolean } > => {
        const result = await this.repository.makeAllEventRead(pairingID)

        if(result.err){
            // -> Write error
            this.adlogs.writeRuntimeEvent({
                category: 'app',
                type: 'stop',
                message: `unable to use db < ${result.err} >`,
                save: true
            })
            return { pass: false }
        } else {
            // -> Notify TrackingBot
            this.adlogs.hub.emit('send-track-event', pairingID)
            return { pass: true }
        }
    }
}

export default MakeAllAlertRead