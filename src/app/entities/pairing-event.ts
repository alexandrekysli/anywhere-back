class PairingEventEntity {
    constructor(
        public readonly date: number,
        public readonly type: 'on' | 'off' | 'moving' | 'stop' | 'state',
        public readonly alert: 'speeding' | 'impact' | 'sos-command' | 'off-state-activity' | 'fuel-thefting' | 'engine-lock' | 'buzzer-on' | 'microphone-on' | 'in-geofence' | 'out-geofence' | '',
        public read: boolean,
        public localisation: { gps: { lat: number, lng: number }, location: string },
        public readonly orientation: number,
        public readonly speed: number,
        public readonly altitude: number,
        public readonly odometer: number,
        public readonly battery: { level: number, charging: boolean },
        public readonly network_level: number,
        public readonly pairing: string,
        public id?: string
    ){}
}

export default PairingEventEntity