import PairingEventEntity from "#app/entities/pairing-event.js"

interface IPairingEventRepository{
    addEvent(event: PairingEventEntity): Promise<{ data?: PairingEventEntity | null, err?: string }>
    getPairingEvent(id: string): Promise<{ data?: PairingEventEntity | null, err?: string }>
    getAllUnreadPairingEventAlert(pairing: string): Promise<{ data?: string[], err?: string }>
    getPairingEvents(pairing: string): Promise<{ data?: PairingEventEntity[], err?: string }>
    getLastPairingEvent(pairing: string): Promise<{ data?: PairingEventEntity | null, err?: string }>
    makeAllEventRead(pairing: string): Promise<{ data?: boolean, err?: string }>
    updateEventLocation(id: string, name: string): Promise<{ data?: boolean, err?: string }>
}
export default IPairingEventRepository