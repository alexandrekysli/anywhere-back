/** ### Applications common types ### */

/** Adlogs */
type AdlogSavedItem = {
    id?: string,
    type: 'ready' | 'stop' | 'warning' | 'info',
    date?: number,
    category: string,
    message: string
}

type ToCoupledItem = { value: string, text: string }

type TrackerMessage = {
    brand: string,
    imei: string,
    event: 'state' | 'command_response' | 'power_on' | 'power_off' | 'speeding' | 'suspicious_activity' | 'impact' | 'acc_on' | 'acc_off'
    response?: { name:  'device_info' | 'relay_lock' | 'relay_unlock', data: any },
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
            battery: { powered: boolean, low: boolean }
            network: { signal: number }
        },
        io: { acc: boolean, relay: boolean }
    }
}