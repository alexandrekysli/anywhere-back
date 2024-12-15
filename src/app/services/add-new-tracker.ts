import Adlogs from "#core/adlogs/index.js"
import ITrackerRepository from "#app/repositories/ITrackerRepository.js"
import TrackerEntity from "#app/entities/tracker.js"


/** TS */
type ExeResult = { err?: string, id?: string }

type NewTrackerData = { brand: string, model: string, imei: string, sn: string, sim: string }

class AddNewTracker {
    constructor(private adlogs: Adlogs, private repository: ITrackerRepository){}

    public execute = async (data: NewTrackerData): Promise< ExeResult | null > => {
        let err = ''

        // -> Verify if tracker imei is already use
        const trackerWithThisIMEI = await this.repository.getTrackerByIMEI(data.imei)
        if(trackerWithThisIMEI.err) err = trackerWithThisIMEI.err
        else{
            if(trackerWithThisIMEI.data) return { err: 'Un traqueur avec ce numero IMEI existe déjà !' }
            else{
                const newTracker = await this.repository.addTracker(new TrackerEntity(
                    data.brand,
                    data.model,
                    data.imei,
                    data.sn,
                    data.sim,
                    Date.now(),
                    "inventory"
                ))
        
                if(newTracker.data){
                    this.adlogs.hub.emit('new-tracker-insert', { imei: data.imei, id: newTracker.data.id })
                    return { id: newTracker.data.id  }
                }
                else  err = newTracker.err || ''
            }
        }
        
        // -> Write error
        this.adlogs.writeRuntimeEvent({
            category: 'app',
            type: 'stop',
            message: `unable to use db < ${err} >`,
            save: true
        })
        return null
    }
}

export default AddNewTracker