import Adlogs from "#core/adlogs/index.js"
import IPairingTripRepository from "#app/repositories/IPairingTripRepository.js"
import PairingEventEntity from "#app/entities/pairing-event.js"


/** TS */
type PairingTrip = {
    id: string,
    date: number,
    event: {
        id: string,
        date: number,
        position: Coordinates,
        orientation: number,
        location: string,
        speed: number,
        mileage: number,
        alerts: ('fence-in' | 'fence-out' | 'speeding' | 'impact' | 'sos')[]
    }[]
}

class GetPairingTrips {
    constructor(private adlogs: Adlogs, private repository: IPairingTripRepository){}

    public execute = async (pairingID: string): Promise<PairingTrip[]> => {
        let err = ''
        const parsedPairingTrip: PairingTrip[] = []

        const tripList = await this.repository.getPairingTrips(pairingID)

        if(tripList.err) err = tripList.err
        else{
            tripList.data?.forEach(trip => {
                const eventList: PairingTrip['event'] = []
                trip.events.forEach(event => {
                    if(event instanceof PairingEventEntity){
                        const alert: PairingTrip['event'][0]['alerts'] = []
                        event.fence === 'in' && alert.push('fence-in')
                        event.fence === 'out' && alert.push('fence-in')
                        event.alert === 'speeding' && alert.push('speeding')
                        event.alert === 'impact' && alert.push('impact')
                        event.alert === 'sos' && alert.push('sos')
                        eventList.push({
                            id: event.id || '',
                            date: event.date,
                            position: event.localisation.gps,
                            location: event.localisation.location,
                            orientation: event.orientation,
                            speed: event.speed,
                            mileage: event.odometer,
                            alerts: alert
                        })
                    }
                })
                parsedPairingTrip.push({
                    id: trip.id || '',
                    date: trip.date,
                    event: eventList
                })
            })
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

        return parsedPairingTrip
    }
}

export default GetPairingTrips