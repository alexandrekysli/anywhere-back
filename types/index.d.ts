type ArchangeErrorCode = 'HELL_DELAYED' | 'HELL_BAN' | 'DERECK_UNKNOWN_CALLER' | 'DERECK_EMPTY_ACCESS_ATTEMPT' | 'DERECK_SUSPENDED_CALLER_ACCOUNT' | 'DERECK_BAD_CALLER_TYPE_ACCESS' | 'DERECK_BAD_CALLER_ACCOUNT_ACCESS' | 'DERECK_BAD_BODY_STRUCTURE' | 'DERECK_UNSAFE_ROUTE_ACCESS_UNALLOWED'
type ArchangeRequestCheckResult = { pass: boolean, err_code?: ArchangeErrorCode, hell_exit_date?: number }

type AdlogSavedItem = {
    id?: string,
    type: 'ready' | 'stop' | 'warning' | 'info',
    date?: number,
    category: string,
    message: string,
    critical?: Error
}

type ToCoupledItem = { value: string, text: string }

type TrackerMessage = {
    date: number,
    brand: string,
    imei: string,
    event: 'command-response' | 'state' | 'low-battery' | 'power-on' | 'power-off' | 'sos' | 'relay-on' | 'relay-off' | 'buzzer-on' | 'buzzer-off' | 'speeding' | 'suspicious-activity' | 'impact' | 'fence-in' | 'fence-out' | 'powered' | 'unpowered' | 'gps-lost' | 'gps-found',
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
    fence?: {id: string, name: string, coordinates: Coordinates[]},
    fence_value: 'in' | 'out' | '',
    device: {
        battery: { powered: boolean },
        network: { signal: number }
    },
    io: { acc: boolean, relay: boolean, buzzer: boolean }
}

type SendMailData = {
    to: string[],
    data: {
        from: string,
        subject: string,
        message: { text: string | undefined, html: string | undefined }
    }
}

type SendSMSData = { to: string, message: string }

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