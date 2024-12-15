import IPairingEventRepository from "#app/repositories/IPairingEventRepository.js"
import IPairingRepository from "#app/repositories/IPairingRepository.js"
import Adlogs from "#core/adlogs/index.js"

class GetLastTrackData {
    private softAlert = ['low-battery', 'power-on', 'power-off', 'relay-off', 'buzzer-off', 'fence-in', 'powered', 'unpowered', 'gps-lost', 'gps-found']

    constructor(private adlogs: Adlogs, private pairingRepository: IPairingRepository, private pairingEventRepository: IPairingEventRepository){}

    public execute = async (pairingID: string, eventDate = true): Promise< TrackData | null> => {
        const pairing = (await this.pairingRepository.getPairing(pairingID)).data
        const lastEvent = (await this.pairingEventRepository.getLastPairingEvent(pairingID)).data
        const unreadAlert = (await this.pairingEventRepository.getAllUnreadPairingEventAlert(pairingID)).data

        if(pairing && lastEvent && unreadAlert){
            for (const alert of unreadAlert) {
                if(this.softAlert.includes(alert.alert)) await this.pairingEventRepository.makePairingEventRead(alert.id)
            }
            return {
                id: String(lastEvent.id),
                state: lastEvent.speed || lastEvent.acc ? 'move' : 'off',
                move: lastEvent.speed > 0,
                alert: unreadAlert.map(x => x.alert),
                clear_alert: true,
                date: eventDate ? lastEvent.date : pairing.last_state_date,
                coordinates: lastEvent.localisation.gps,
                location: lastEvent.localisation.location,
                speed: lastEvent.speed,
                orientation: lastEvent.orientation,
                fence_value: lastEvent.fence,
                odometer: lastEvent.odometer,
                device: { battery: lastEvent.battery, network: { signal: lastEvent.network_level } },
                io: {
                    acc: lastEvent.acc,
                    buzzer: lastEvent.buzzer,
                    relay: lastEvent.relay
                }
            }
        }

        return null
    }
}

export default GetLastTrackData