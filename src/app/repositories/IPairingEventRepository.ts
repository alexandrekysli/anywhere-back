import PairingEventEntity from "#app/entities/pairing-event.js"

interface IPairingEventRepository{
    addEvent(event: PairingEventEntity): Promise<{ data?: PairingEventEntity | null, err?: string }>
    getPairingEvent(pairing: string): Promise<{ data?: PairingEventEntity[], err?: string }>
    readEvent(id: string): Promise<{ data?: boolean, err?: string }>
    updateEventLocation(id: string, name: string): Promise<{ data?: boolean, err?: string }>
}
export default IPairingEventRepository