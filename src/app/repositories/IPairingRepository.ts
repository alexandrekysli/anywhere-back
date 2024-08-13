import PairingEntity from "#app/entities/pairing.js"

interface IPairingRepository{
    addPairing(pairing: PairingEntity): Promise<{ data?: PairingEntity | null, err?: string }>
    getPairing(id: string): Promise<{ data?: PairingEntity | null, err?: string }>
    getAllPairing(full: boolean): Promise<{ data?: PairingEntity[], err?: string }>
    getPairingbyVehicle(vehicle: string, full: boolean): Promise<{ data?: PairingEntity[], err?: string }>
    getPairingbyTracker(tracker: string, full: boolean): Promise<{ data?: PairingEntity[], err?: string }>
    getHeathlyPairingbyTracker(tracker: string): Promise<{ data?: PairingEntity | null, err?: string }>
    setPairingState(id: string, state: PairingEntity['state']):Promise<{ data?: boolean, err?: string }>
    setPairingGeofence(id: string, fenceArea: string):Promise<{ data?: boolean, err?: string }>
    setPairingLastStateDate(id: string, date: number):Promise<{ data?: boolean, err?: string }>
}
export default IPairingRepository