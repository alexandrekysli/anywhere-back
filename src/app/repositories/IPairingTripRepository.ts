import PairingTripEntity from "#app/entities/pairing-trip.js"

interface IPairingTripRepository {
    addTrip(trip: PairingTripEntity): Promise<{ data?: PairingTripEntity | null, err?: string }>
    getPairingTrips(pairing: string): Promise<{ data?: PairingTripEntity[], err?: string }>
}

export default IPairingTripRepository