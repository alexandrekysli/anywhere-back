import PairingTripEntity from "#app/entities/pairing-trip.js"

interface IPairingTripRepository {
    addTrip(trip: PairingTripEntity): Promise<{ data?: PairingTripEntity | null, err?: string }>
    getPairingTrip(pairing: string): Promise<{ data?: PairingTripEntity[], err?: string }>
    addTripPoints(id: string,  positions: PairingTripEntity['points']): Promise<{ data?: boolean, err?: string }>
    updateTripPointLocation(id: string, index: number, name: string): Promise<{ data?: boolean, err?: string }>
}

export default IPairingTripRepository