import VehicleEntity from "#app/entities/vehicle.js"
import IPairingRepository from "#app/repositories/IPairingRepository.js"
import ISubscriptionRepository from "#app/repositories/ISubscriptionRepository.js"
import Adlogs from "#core/adlogs/index.js"

class SuspendSubscription {
    constructor(private adlogs: Adlogs, private repository: ISubscriptionRepository, private pairingRepository: IPairingRepository){}

    public execute = async (id: string): Promise<{ pass: boolean }> => {
        let err = ''
        const dependantSubscription = (await this.repository.getChildSubscription(id))

        if(dependantSubscription instanceof Error) err = dependantSubscription.message
        else{
            let pass = true
            for (const subscription of dependantSubscription) {
                // -> Update child subscription item to start now !!!
                const updateResult = await this.repository.updateSubscriptionStartingDate(String(subscription.id), Date.now())
                if(updateResult instanceof Error){
                    err = updateResult.message
                    pass = false
                    break
                }
            }

            if(pass){
                // -> Suspended concern subscription now !!!
                const result = await this.repository.suspendSubscription(id)
                if(result.err) err = result.err
                else{
                    const vehicleList: string[] = []
                    let pairingList: string[] = []
                    const oldSubscriptionData = (await this.repository.getSubscription(id)).data
                    if(oldSubscriptionData){
                        oldSubscriptionData.vehicle.forEach(vehicle => {
                            if(vehicle instanceof VehicleEntity) vehicleList.push(String(vehicle.id))
                        })
                    }
                    for (const vehicle of vehicleList) {
                        const vehiclePairingList = (await this.pairingRepository.getPairingbyVehicle(String(vehicle), false)).data
                        if(vehiclePairingList) pairingList = [...pairingList, ...vehiclePairingList.map(pairing => String(pairing.id))]
                    }
                    // -> Notify TrackingBot
                    pairingList.forEach(pairing =>  this.adlogs.hub.emit('refresh-pairing', pairing))
                    return { pass: true }
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

export default SuspendSubscription