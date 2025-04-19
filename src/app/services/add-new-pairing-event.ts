import Adlogs from "#core/adlogs/index.js"
import Utils from "#utils/index.js"
import IPairingEventRepository from "#app/repositories/IPairingEventRepository.js"
import PairingEventEntity from "#app/entities/pairing-event.js"


/** TS */
class AddNewPairingEvent {
    private softAlert = ['low-battery', 'power-on', 'power-off', 'relay-on', 'buzzer-on', 'fence-in', 'powered', 'unpowered', 'gps-lost', 'gps-found']

    constructor(private adlogs: Adlogs, private repository: IPairingEventRepository){}

    public execute = async (
        pairingID: string,
        date: number,
        event: TrackerMessage['event'],
        state: TrackerMessage['state'],
        fenceValue: TrackData['fence_value']
    ): Promise<TrackData | null> => {
        let err = ''
        if(state){
            // -> Retrieve last pairing event
            const lastPosition = await this.repository.getLastPairingEvent(pairingID)
            if(lastPosition.err) err = lastPosition.err || ''
            else{
                if(!lastPosition.data && state.gps){
                    const entity = new PairingEventEntity(
                        date,
                        event,
                        event === event,
                        { gps: state.gps.coordinates, location: '' },
                        state.gps.orientation,
                        state.gps.speed,
                        state.gps.altitude,
                        state.gps.odometer,
                        state.device.battery,
                        state.device.network.signal,
                        fenceValue,
                        state.io.acc,
                        state.io.relay,
                        state.io.buzzer,
                        pairingID
                    )
                    return await this.customSave(entity)
                }else if(state.gps && state.gps.speed){
                    // -> With coordinates 
                    const distance = lastPosition.data ? (Utils.distanceBetweenCoordinates(state.gps.coordinates, lastPosition.data.localisation.gps) * 1000) : 15                    
                    if(distance >= /* 15 */ 40){
                        console.log(`new position with distance -> ${distance}`)
                        const entity = new PairingEventEntity(
                            date,
                            event,
                            event === event,
                            { gps: state.gps.coordinates, location: '' },
                            state.gps.orientation,
                            state.gps.speed,
                            state.gps.altitude,
                            state.gps.odometer,
                            state.device.battery,
                            state.device.network.signal,
                            fenceValue,
                            state.io.acc,
                            state.io.relay,
                            state.io.buzzer,
                            pairingID
                        )
                        return await this.customSave(entity)
                    }
                }else{
                    // -> Without coordinates
                    if(lastPosition.data && event !== 'state'){
                        console.log(`new position with last event by alert -> ${event}`)
                        const entity = new PairingEventEntity(
                            date,
                            event,
                            this.softAlert.includes(event) ? true : false,
                            lastPosition.data.localisation,
                            lastPosition.data.orientation,
                            Utils.timestampDiff(date, lastPosition.data.date, 'hour') > 1 ? 0 : lastPosition.data.speed,
                            lastPosition.data.altitude,
                            lastPosition.data.odometer,
                            state.device.battery,
                            state.device.network.signal,
                            lastPosition.data.fence,
                            state.io.acc,
                            state.io.relay,
                            state.io.buzzer,
                            pairingID
                        )
                        return await this.customSave(entity)
                    }
                }
            }
        }

        if(err){
            // -> Write error
            this.adlogs.writeRuntimeEvent({
                category: 'app',
                type: 'stop',
                message: `unable to use db < ${err} >`,
                save: true
            })
        }

        return null
    }

    private customSave = async (event: PairingEventEntity): Promise<TrackData | null> => {
        const result = await this.repository.addEvent(event)
        if(result.err){
            this.adlogs.writeRuntimeEvent({
                category: 'app',
                type: 'stop',
                message: `unable to use db < ${result.err} >`,
                save: true
            })
            return null
        }else{
            return {
                id: String(event.id),
                state: event.speed || event.acc ? 'move' : 'off',
                move: event.speed > 0,
                alert: event.alert !== 'state' ? [ event.alert ] : [],
                clear_alert: false,
                date: event.date,
                coordinates: event.localisation.gps,
                location: event.localisation.location,
                speed: event.speed,
                odometer: event.odometer,
                orientation: event.orientation,
                fence_value: event.fence,
                device: { battery: event.battery, network: { signal: event.network_level }},
                io: {
                    acc: event.acc,
                    buzzer: event.buzzer,
                    relay: event.relay
                }
            }
        }
    }
}

export default AddNewPairingEvent