import engineConfig from "../../config"
import IPairingEventRepository from "#app/repositories/IPairingEventRepository.js"
import Adlogs from "#core/adlogs/index.js"

/** TS */
type ExeResult = { name: string }

class GetLocationName {
    constructor(private adlogs: Adlogs, private repository: IPairingEventRepository){}

    public execute = async (id: string): Promise<ExeResult> => {
        let err = ''

        const pairingEvent = await this.repository.getPairingEvent(id)
        if(pairingEvent.err) err = pairingEvent.err
        else{
            if(pairingEvent.data){
                const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${pairingEvent.data.localisation.gps.lat},${pairingEvent.data.localisation.gps.lng}&key=${engineConfig.infrastructure.api_key.google}`)
                if(response.ok){
                    const data = await response.json() as GoogleReverseGeocodeResponse
                    const address = data.results.filter(x => x.types.includes('sublocality'))[0].formatted_address || ''

                    const result = await this.repository.updateEventLocation(id, address)

                    if(result.err) err = result.err
                    else return { name: address }
                }
            }
        }
        return { name: '' }
    }
}

export default GetLocationName