import PackageEntity from "#app/entities/package.js"
import TrackerEntity from "#app/entities/tracker.js"
import UserEntity from "#app/entities/user.js"
import VehicleEntity from "#app/entities/vehicle.js"
import IPairingRepository from "#app/repositories/IPairingRepository.js"
import ISubscriptionRepository from "#app/repositories/ISubscriptionRepository.js"
import Adlogs from "#core/adlogs/index.js"
import IUserRepository from "../repositories/IUserRepository"

/** TS */
type PairingData = {
    pairing: {
        id: string,
        name: string,
        begin_date: number,
        end_date: number,
        state: 'heathly' | 'end',
        lost: boolean
    },
    vehicle: {
        id: string,
        type: 'motorcycle' | 'car' | 'truck',
        model: string,
        numberplate: string,
        group: string,
        driver: string,
        max_speed: number,
        fence: Coordinates[]
    },
    subscription: {
        package: string,
        allowed_option: string[],
        state: 'wait' | 'actual' | 'end' | 'suspend',
        end_date: number
    }
    customer: { id: string, name: string },
    manager: { id: string, name: string },
    tracker: {
        id: string,
        model: string,
        imei: string
    }
}

class GetPairingTrack {
    constructor(
        private adlogs: Adlogs,
        private pairingRepository: IPairingRepository,
        private userRepository: IUserRepository,
        private subscriptionRepository: ISubscriptionRepository,
    ){}

    public execute = async (id: string): Promise< PairingData | null> => {

        let err = ''
        
        const pairing = (await this.pairingRepository.getPairing(id)).data

        if(pairing){
            const vehicle = pairing.vehicle as VehicleEntity
            const tracker = pairing.tracker as TrackerEntity
            const customer = vehicle.customer as UserEntity
            const manager = (await this.userRepository.getUserByID(customer.manager.toString())).data as UserEntity

            const subscription = ((await this.subscriptionRepository.getSubscriptionByVehicle(vehicle.id || '')).data || []).filter(x => {
                if(x.status && x.status() === 'actual') return true
            })[0]

            return {
                pairing: {
                    id: String(pairing.id),
                    name: pairing.identifier,
                    begin_date: pairing.begin_date,
                    end_date: pairing.end_date,
                    state: pairing.state,
                    lost: tracker.state === 'lost'
                },
                vehicle: {
                    id: String(vehicle.id),
                    numberplate: vehicle.numberplate,
                    type: vehicle.type,
                    model: vehicle.brand + ' ' + vehicle.model,
                    group: vehicle.group,
                    driver: vehicle.driver,
                    max_speed: vehicle.maxspeed,
                    fence: []
                },
                tracker: {
                    id: String(tracker.id),
                    imei: tracker.imei,
                    model: tracker.brand + ' ' + tracker.model
                },
                subscription: {
                    package: subscription._package instanceof PackageEntity ? subscription._package.name : '#',
                    allowed_option: subscription._package instanceof PackageEntity ? subscription._package.allowed_option : [],
                    state: subscription.status ? subscription.status() : 'end',
                    end_date: subscription.endDate ? subscription.endDate() : 0
                },
                customer: { id: String(customer.id), name: customer.surname + ' ' + customer.name },
                manager: { id: String(manager.id), name: manager.surname + ' ' + manager.name }
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
        return null
    }
}

export default GetPairingTrack