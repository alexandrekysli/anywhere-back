type AdlogSavedItem = {
    id?: string,
    type: 'ready' | 'stop' | 'warning' | 'info',
    date?: number,
    category: string,
    message: string
}

type ToCoupledItem = { value: string, text: string }

type TrackerMessage = {
    date: number,
    brand: string,
    imei: string,
    event: 'command-response' | 'state' | 'power-on' | 'power-off' | 'sos' | 'relay' | 'buzzer' | 'speeding' | 'suspicious-activity' | 'impact',
    response?: { name:  'device-info' | 'relay-lock' | 'relay-unlock', data: any },
    state?: {
        move: boolean,
        gps?: {
            coordinates: {
                lat: number,
                lng: number
            },
            speed: number,
            orientation: number,
            altitude: number,
            odometer: number,
        },
        device: {
            battery: { powered: boolean }
            network: { signal: number }
        },
        io: { acc: boolean, relay: boolean, buzzer: boolean }
    }
}
type Coordinates = { lat: number, lng: number }

type TrackData = {
    id: string,
    state: 'on' | 'off',
    move: boolean,
    alert: string[],
    clear_alert: boolean,
    date: number,
    coordinates: Coordinates,
    location: string,
    speed: number,
    odometer: number,
    orientation: number,
    fence_value: 'in' | 'out' | '',
    device: {
        battery: { powered: boolean },
        network: { signal: number }
    },
    io: { acc: boolean, relay: boolean, buzzer: boolean }
}

interface GoogleReverseGeocodeResponse {
    plus_code: { compound_code: string, global_code: string },
    results: {
        address_components: { long_name: string, short_name: string, types: string[] }[],
        formatted_address: string,
        geometry: {
            bounds: { northeast: Coordinates, southwest: Coordinates },
            location: Coordinates,
            location_type: string,
            viewport: { northeast: Coordinates, southwest: Coordinates }
        },
        place_id: string,
        types: string[]
    }[]
}