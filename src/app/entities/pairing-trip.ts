class PairingTripEntity {
    constructor(
        public readonly date: number,
        public points: { gps: { lat: number, lng: number }, location: string }[],
        public id?: string

    ){}
}

export default PairingTripEntity