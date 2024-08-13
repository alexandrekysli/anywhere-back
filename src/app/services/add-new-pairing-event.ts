import Adlogs from "#core/adlogs/index.js"
import Utils from "#utils/index.js"
import IPairingEventRepository from "#app/repositories/IPairingEventRepository.js"
import PairingEventEntity from "#app/entities/pairing-event.js"


/** TS */
class AddNewPairingEvent {
    private softAlert = ['low-battery', 'power-on', 'power-off', 'relay-on', 'buzzer-on', 'fence-in', 'powered', 'unpowered', 'gps-lost', 'gps-found']

    constructor(private adlogs: Adlogs, private repository: IPairingEventRepository){}

    public execute = async (pairingID: string, eventMessage: TrackerMessage, fenceValue: TrackData['fence_value']): Promise<TrackData | null> => {
        let err = ''

        if(eventMessage.state){
            // -> Retrieve last pairing event
            const lastPosition = await this.repository.getLastPairingEvent(pairingID)

            if(lastPosition.err) err = lastPosition.err || ''
            else{                
                if(eventMessage.state.gps && eventMessage.state.gps.speed){
                    // -> With coordinates 
                    const distance = lastPosition.data ? (Utils.distanceBetweenCoordinates(eventMessage.state.gps.coordinates, lastPosition.data.localisation.gps) * 1000) : 10
                    //const orientation = lastPosition.data ? (lastPosition.data.orientation - eventMessage.state.gps.orientation) : 1

                    // -> DBG
                    /* console.log('---');
                    console.log(eventMessage.state.gps.coordinates);
                    console.log(lastPosition.data?.localisation.gps);
                    console.log(distance);
                    console.log(eventMessage.state.gps.speed);
                    console.log('^^^'); */
                    
                    if(distance >= 15){
                        console.log(`new position with distance -> ${distance}`)
                        const entity = new PairingEventEntity(
                            Date.now(),
                            eventMessage.event,
                            eventMessage.event === 'state',
                            { gps: eventMessage.state.gps.coordinates, location: '' },
                            eventMessage.state.gps.orientation,
                            eventMessage.state.gps.speed,
                            eventMessage.state.gps.altitude,
                            eventMessage.state.gps.odometer,
                            eventMessage.state.device.battery,
                            eventMessage.state.device.network.signal,
                            fenceValue,
                            eventMessage.state.io.acc,
                            eventMessage.state.io.relay,
                            eventMessage.state.io.buzzer,
                            pairingID
                        )
                        return await this.customSave(entity)
                    }/* else if(Math.abs(orientation) > 45){
                        console.log(`new position with orientation -> ${orientation}`)
                        const entity = new PairingEventEntity(
                            Date.now(),
                            eventMessage.event,
                            eventMessage.event === 'state',
                            { gps: eventMessage.state.gps.coordinates, location: '' },
                            eventMessage.state.gps.orientation,
                            eventMessage.state.gps.speed,
                            eventMessage.state.gps.altitude,
                            eventMessage.state.gps.odometer,
                            eventMessage.state.device.battery,
                            eventMessage.state.device.network.signal,
                            lastPosition.data ? lastPosition.data.fence : '',
                            eventMessage.state.io.acc,
                            eventMessage.state.io.relay,
                            eventMessage.state.io.buzzer,
                            pairingID
                        )
                        return await this.customSave(entity)
                    } */
                }else{
                    // -> Without coordinates
                    if(lastPosition.data && eventMessage.event !== 'state'){
                        console.log(`new position with last event by alert -> ${eventMessage.event}`)
                        const entity = new PairingEventEntity(
                            Date.now(),
                            eventMessage.event,
                            this.softAlert.includes(eventMessage.event) ? true : false,
                            lastPosition.data.localisation,
                            lastPosition.data.orientation,
                            Utils.timestampDiff(Date.now(), lastPosition.data.date, 'hour') > 1 ? 0 : lastPosition.data.speed,
                            lastPosition.data.altitude,
                            lastPosition.data.odometer,
                            eventMessage.state.device.battery,
                            eventMessage.state.device.network.signal,
                            lastPosition.data.fence,
                            eventMessage.state.io.acc,
                            eventMessage.state.io.relay,
                            eventMessage.state.io.buzzer,
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
                state: event.speed || event.acc ? 'on' : 'off',
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