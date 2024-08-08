import IPairingEventRepository from "#app/repositories/IPairingEventRepository.js"
import Adlogs from "#core/adlogs/index.js"

class GetLastTrackData {
    constructor(private adlogs: Adlogs, private pairingEventRepository: IPairingEventRepository){}

    public execute = async (pairingID: string): Promise< TrackData | null> => {
        let err = ''
        const lastEvent = (await this.pairingEventRepository.getLastPairingEvent(pairingID)).data
        const unreadAlert = (await this.pairingEventRepository.getAllUnreadPairingEventAlert(pairingID)).data

        if(lastEvent && unreadAlert){
            return {
                id: String(lastEvent.id),
                state: lastEvent.speed || lastEvent.acc ? 'on' : 'off',
                move: lastEvent.speed > 0,
                alert: unreadAlert,
                clear_alert: true,
                date: lastEvent.date,
                coordinates: lastEvent.localisation.gps,
                location: lastEvent.localisation.location,
                speed: lastEvent.speed,
                orientation: lastEvent.orientation,
                fence_value: lastEvent.fence,
                odometer: lastEvent.odometer,
                device: { battery: lastEvent.battery, network: { signal: lastEvent.network_level }},
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