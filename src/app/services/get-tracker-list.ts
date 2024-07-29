import ITrackerRepository from "#app/repositories/ITrackerRepository.js"
import Adlogs from "#core/adlogs/index.js"

/** TS */
type TrackerListItem = {
    list: {
        id: string,
        name: string,
        type: string,
        group: { light: string, pure: string }
    }[]
}

class GetTrackerList {
    constructor(private adlogs: Adlogs, private repository: ITrackerRepository){}

    public execute = async (): Promise< TrackerListItem > => {
        const trackerList = await this.repository.getTrackers()
        if(trackerList.data){
            return { list: trackerList.data.map(x => {
                return {
                    id: x.id || '',
                    name: x.imei,
                    group: { light: x.brand, pure: x.model },
                    type: 'tracker'
                }
            }) }
        }else{
            this.adlogs.writeRuntimeEvent({
                category: 'app',
                type: 'stop',
                message: `unable to use db < ${trackerList.err} >`,
                save: true
            })
            return { list: [] }
        }
    }
}

export default GetTrackerList