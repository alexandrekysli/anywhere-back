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
                // -> Check if location already known
                const pairingEventOfLocation = (await this.repository.getPairingEventBySavedLocation(pairingEvent.data.localisation.gps)).data
                let location = pairingEventOfLocation && pairingEventOfLocation.localisation.location || ''
                
                if(location === ''){
                    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${pairingEvent.data.localisation.gps.lat},${pairingEvent.data.localisation.gps.lng}&key=${engineConfig.infrastructure.api_key.google}`)
                    if(response.ok){
                        const data = await response.json() as GoogleReverseGeocodeResponse
                        const place = data.results.filter(x => x.types.filter(x => ['locality', 'sublocality', 'route'].includes(x)).length)[0]
                        location = place && place.formatted_address || ''
                    }
                }

                const result = await this.repository.updateEventLocation(id, location)
                if(result.err) err = result.err
                else return { name: location }
            }
        }

        if(err){
            // -> Write error
            this.adlogs.writeRuntimeEvent({
                category: 'app',
                type: 'stop',
                message: `unable to use db < ${err} >`,
                save: true
            })
        }

        return { name: '' }
    }
}

export default GetLocationName