import Adlogs from "#core/adlogs/index.js"
import ITrackerRepository from "#app/repositories/ITrackerRepository.js"

/** TS */
type AvailableTracker = { id: string, name: string }

class GetAvailableTracker {
    constructor(private adlogs: Adlogs, private repository: ITrackerRepository){}

    public execute = async (): Promise< AvailableTracker[] > => {
        const trackerList = await this.repository.getAvailableTracker()
        let err = ''
        if(trackerList.data){
            return trackerList.data.map(x => {
                return { id: x.id || '', name: `${x.model} - ${x.imei}` }
            })
        }else err = trackerList.err || ''

        // -> Write error
        this.adlogs.writeRuntimeEvent({
            category: 'app',
            type: 'stop',
            message: `unable to use db < ${err} >`,
            save: true
        })
        return []
    }
}

export default GetAvailableTracker