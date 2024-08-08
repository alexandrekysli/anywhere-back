import PairingEventEntity from "./pairing-event"
import PairingTrip from "./pairing-trip"
import TrackerEntity from "./tracker"
import VehicleEntity from "./vehicle"

class PairingEntity {
    constructor(
        public readonly identifier: string,
        public readonly vehicle: VehicleEntity | string,
        public readonly tracker: TrackerEntity | string,
        public readonly begin_date: number,
        public end_date: number,
        public geofence: '' | 'administrative-area',
        public state: 'heathly' | 'end',
        public last_state_date: number,
        public event_list: PairingEventEntity[],
        public trip_list: PairingTrip[],
        public id?: string
    ){}
}

export default PairingEntity