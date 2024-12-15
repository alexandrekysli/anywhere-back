import Adlogs from "#core/adlogs/index.js"
import ISubscriptionRepository from "#app/repositories/ISubscriptionRepository.js"
import IPairingRepository from "#app/repositories/IPairingRepository.js"
import VehicleEntity from "#app/entities/vehicle.js"


class SetSubscriptionFleet {
    constructor(private adlogs: Adlogs, private repository: ISubscriptionRepository, private pairingRepository: IPairingRepository){}

    public execute = async (id: string, fleet: string[]): Promise<{ pass: boolean }> => {
        let err = ''
        const vehicleList = JSON.parse(JSON.stringify(fleet)) as String[]
        const oldSubscriptionData = (await this.repository.getSubscription(id))

        if(oldSubscriptionData.err) err = oldSubscriptionData.err
        else{
            if(oldSubscriptionData.data){
                oldSubscriptionData.data.vehicle.forEach(vehicle => {
                    if(vehicle instanceof VehicleEntity && !vehicleList.includes(String(vehicle.id))) vehicleList.push(String(vehicle.id))
                })

                const result = await this.repository.setSubscriptionFleet(id, fleet)
                if(result.err) err = result.err
                else{
                    // -> Notify TrackingBot
                    let pairingList: string[] = []
                    for (const vehicle of vehicleList) {
                        const vehiclePairingList = (await this.pairingRepository.getPairingbyVehicle(String(vehicle), false)).data
                        if(vehiclePairingList) pairingList = [...pairingList, ...vehiclePairingList.map(pairing => String(pairing.id))]
                    }
                    // -> Notify TrackingBot
                    pairingList.forEach(pairing =>  this.adlogs.hub.emit('refresh-pairing', pairing))
                    return { pass: result.data || false }
                }

            }
            
        }

        if(err){
            this.adlogs.writeRuntimeEvent({
                category: 'app',
                type: 'stop',
                message: `unable to use db < ${err} >`,
                save: true
            })
        }

        return { pass: false }
    }
}

export default SetSubscriptionFleet