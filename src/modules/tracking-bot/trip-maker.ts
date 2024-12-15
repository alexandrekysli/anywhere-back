import IPairingTripRepository from "#app/repositories/IPairingTripRepository.js"
import AddNewPairingTrip from "#app/services/add-new-pairing-trip.js"
import Adlogs from "#core/adlogs/index.js"
import Config from "../../config"

/** TS */
type TripMakerItem = {
    pairing: string,
    interval?: NodeJS.Timeout,
    move_duration: number,
    stop_duration: number,
    events: TrackData[]
}

/**
 * # Trip Maker
 * Tracking BOT
 * ---
 * © 2024 BeTech CI
 */

class TripMaker {
    private tripLimit = Config.infrastructure.tracking_bot.trip_limit
    private pairingTripItem: TripMakerItem[] = []
    private services
    constructor(adlogs: Adlogs, pairingTripRepository: IPairingTripRepository){
        this.services = {
            addNewPairingTrip: new AddNewPairingTrip(adlogs, pairingTripRepository)
        }
    }

    public newPairingEvent = (pairingID: string, data: TrackData, live: boolean) => {
        live && console.log('live trip event !');
        
        const trip = this.pairingTripItem.filter(x => x.pairing === pairingID)[0]
        if(trip){
            // -> Old Pairing trip
            console.log('Old pairing new event ' + pairingID)

            trip.events.push(data)
            if(data.speed) trip.stop_duration = 0
            return this.pairingTripItem.indexOf(trip)
        }else{
            // -> New Pairing trip
            if(data.speed){
                console.log('New trip for pairing ' + pairingID)
                this.pairingTripItem.push({
                    pairing: pairingID,
                    events: [data],
                    move_duration: 0,
                    stop_duration: 0
                })
                const tripItem = this.pairingTripItem[this.pairingTripItem.length - 1]
                const tripIndex =this.pairingTripItem.length - 1
                tripItem.interval = setInterval(async () => {
                    tripItem.move_duration++
                    tripItem.stop_duration++
                    // -> Check Limit
                    if(tripItem.stop_duration > this.tripLimit.max_stop_duration){
                        // -> Trip is end
                        clearInterval(tripItem.interval)
                        console.log('Trip is end !')
                        if(tripItem.move_duration > this.tripLimit.min_move_duration){
                            const totalMileage = tripItem.events[tripItem.events.length -1].odometer - tripItem.events[0].odometer
                            console.log('total mileage -> ' + totalMileage)
                            if(totalMileage >= this.tripLimit.min_move_mileage){
                                // -> Save trip
                                const result = await this.services.addNewPairingTrip.execute(tripItem.pairing, tripItem.events.map(x => x.id || ''))
                                console.log('new trip save ✅');
                                this.pairingTripItem.splice(tripIndex, 1)
                            }else{
                                console.log('new trip remove due to low mileage -> ' + totalMileage)
                            }
                        }else console.log('new trip remove due to low trip duration', tripItem.move_duration)
                        this.pairingTripItem.splice(tripIndex, 1)
                    }

                }, 1000)

                return tripIndex
            }else return null
        }
    }

}

export default TripMaker