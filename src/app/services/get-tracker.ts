import Adlogs from "#core/adlogs/index.js"
import ITrackerRepository from "#app/repositories/ITrackerRepository.js"


/** TS */
type TrackerData = {
    recap: { name: string, state: string },
    tracker: {
        brand: string,
        model: string,
        sn: string,
        sim: string,
        adding_date: number
    }
}

class GetTracker {
    constructor(private adlogs: Adlogs, private trackerRepository: ITrackerRepository){}

    public execute = async (id: string): Promise< TrackerData | null > => {
        const tracker = await this.trackerRepository.getTracker(id)        
        let err = ''
        if(tracker.data){
            return {
                recap: {
                    name: tracker.data.imei,
                    state: tracker.data.state
                },
                tracker: {
                    brand: tracker.data.brand,
                    model: tracker.data.model,
                    sn: tracker.data.sn,
                    sim: tracker.data.sim,
                    adding_date: tracker.data.adding_date
                }
            }
        }else err = tracker.err || ''

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

export default GetTracker