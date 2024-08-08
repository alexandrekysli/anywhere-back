import PairingEventEntity from "./pairing-event";

class PairingTripEntity {
    constructor(
        public readonly date: number,
        public events: string[] | PairingEventEntity[],
        public readonly pairing: string,
        public id?: string

    ){}
}

export default PairingTripEntity