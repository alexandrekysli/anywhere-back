class PairingEventEntity {
    constructor(
        public readonly date: number,
        public readonly alert: 'command-response' | 'state' | 'low-battery' | 'power-on' | 'power-off' | 'sos' | 'relay-on' | 'relay-off' | 'buzzer-on' | 'buzzer-off' | 'speeding' | 'suspicious-activity' | 'impact' | 'fence-in' | 'fence-out' | 'powered' | 'unpowered' | 'gps-lost' | 'gps-found',
        public read: boolean,
        public localisation: { gps: { lat: number, lng: number }, location: string },
        public readonly orientation: number,
        public readonly speed: number,
        public readonly altitude: number,
        public readonly odometer: number,
        public readonly battery: { powered: boolean },
        public readonly network_level: number,
        public readonly fence: 'in' | 'out' | '',
        public readonly acc: boolean,
        public readonly relay: boolean,
        public readonly buzzer: boolean,
        public readonly pairing: string,
        public id?: string
    ){}
}

export default PairingEventEntity