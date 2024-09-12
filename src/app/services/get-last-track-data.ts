import IFenceAreaRepository from "#app/repositories/IFenceAreaRepository.js"
import IPairingEventRepository from "#app/repositories/IPairingEventRepository.js"
import IPairingRepository from "#app/repositories/IPairingRepository.js"
import Adlogs from "#core/adlogs/index.js"

class GetLastTrackData {
    private softAlert = ['low-battery', 'power-on', 'power-off', 'relay-off', 'buzzer-off', 'fence-in', 'powered', 'unpowered', 'gps-lost', 'gps-found']

    constructor(private adlogs: Adlogs, private pairingRepository: IPairingRepository, private pairingEventRepository: IPairingEventRepository, private fenceAreaRepository: IFenceAreaRepository){}

    public execute = async (pairingID: string): Promise< TrackData | null> => {
        const pairingFenceArea = (await this.pairingRepository.getPairing(pairingID)).data?.geofence
        const lastEvent = (await this.pairingEventRepository.getLastPairingEvent(pairingID)).data
        const unreadAlert = (await this.pairingEventRepository.getAllUnreadPairingEventAlert(pairingID)).data
        const fenceArea = (await this.fenceAreaRepository.getArea(pairingFenceArea || ''))

        if(lastEvent && unreadAlert){
            for (const alert of unreadAlert) {
                if(this.softAlert.includes(alert.alert)) await this.pairingEventRepository.makePairingEventRead(alert.id)
            }
            return {
                id: String(lastEvent.id),
                state: lastEvent.speed || lastEvent.acc ? 'on' : 'off',
                move: lastEvent.speed > 0,
                alert: unreadAlert.map(x => x.alert),
                clear_alert: true,
                fence: fenceArea.data && { id: fenceArea.data.id || '', name: fenceArea.data.name, coordinates: fenceArea.data.geometry.coordinates[0].map(x => {
                    return { lat: x[1], lng: x[0] }
                }) } || undefined,
                date: lastEvent.date,
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