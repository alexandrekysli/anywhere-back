import ITrackerRepository from "#app/repositories/ITrackerRepository.js"
import Adlogs from "#core/adlogs/index.js"

class DeleteTracker {
    constructor(private adlogs: Adlogs, private repository: ITrackerRepository){}

    public execute = async (id: string): Promise<{ pass: boolean }> => {
        let err = ''

        const removeState = await this.repository.removeTracker(id)
        if(removeState.data){
            this.adlogs.hub.emit('tracker-removed', id)
            return { pass : true }
        }
        else err = removeState.err || ''

        if(err){
            this.adlogs.writeRuntimeEvent({
                category: 'app',
                type: 'stop',
                message: `unable to use db < ${err} >`,
                save: true
            })
        }
        return { pass: false }
    }
}

export default DeleteTracker