import Adlogs from "#core/adlogs/index.js"
import Config from "../../../config"
import ISMSProvider from "./provider/iSMSProvider"
import OrangeMiddleware from "./provider/orange"

/**
 * SMS Service
 * ---
 * k-engine
 */

class SMS {
    private smsToSendStack: SendSMSData[] = []
    private smsConfig = Config.infrastructure.sms
    private middleware: ISMSProvider

    constructor(private adlogs: Adlogs){
        this.middleware = new OrangeMiddleware(this.smsConfig)
    }

    private saveError = (message: string) => {
        this.adlogs.writeRuntimeEvent({
            category: 'app',
            type: 'warning',
            message: `unable to send sms with error < ${message} >`
        })
    }
    public sendTrackAlertImpact = async (phone: string, vehicle: string, numberplate: string, location: string) => {
        const result = await this.middleware.sendSMS({
            to: phone,
            message: `Possible collision detectée à < ${location} > sur le véhicule ${vehicle}, immatriculé ${numberplate} !`
        })
        result.err && this.saveError(result.err)
    }
    public sendTrackAlertRelay = async (phone: string, vehicle: string, numberplate: string) => {
        const result = await this.middleware.sendSMS({
            to: phone,
            message: `Commande de blocage exécutée avec succès sur le véhicule ${vehicle}, immatriculé ${numberplate} !`
        })
        result.err && this.saveError(result.err)
    }
    public sendTrackAlertSpeeding = async (phone: string, vehicle: string, numberplate: string, max: number, actual: number) => {
        const result = await this.middleware.sendSMS({
            to: phone,
            message: `Excès de vitesse < ${actual.toString().padStart(2, '0')} / ${max.toString().padStart(2, '0')} > détécté sur le véhicule ${vehicle}, immatriculé ${numberplate} !`
        })
        result.err && this.saveError(result.err)
    }
    public sendTrackAlertSuspiciousActivity = async (phone: string, vehicle: string, numberplate: string) => {
        const result = await this.middleware.sendSMS({
            to: phone,
            message: `Activité suspecte à l\'arrêt détéctée sur le véhicule ${vehicle}, immatriculé ${numberplate} !`
        })
        result.err && this.saveError(result.err)
    }
    public sendTrackAlertFenceIn = async (phone: string, vehicle: string, numberplate: string, location: string) => {
        const result = await this.middleware.sendSMS({
            to: phone,
            message: `Le véhicule ${vehicle}, immatriculé ${numberplate}, localisé à < ${location} > vient de rentrer dans la clôture géographique definie !`
        })
        result.err && this.saveError(result.err)
    }
    public sendTrackAlertFenceOut = async (phone: string, vehicle: string, numberplate: string, location: string) => {
        const result = await this.middleware.sendSMS({
            to: phone,
            message: `Le véhicule ${vehicle}, immatriculé ${numberplate}, localisé à < ${location} > vient de sortie de la clôture géographique definie !`
        })
        result.err && this.saveError(result.err)
    }
    public sendTrackAlertSOS = async (phone: string, vehicle: string, numberplate: string, location: string) => {
        const result = await this.middleware.sendSMS({
            to: phone,
            message: `Commande d'urgence executée à < ${location} > sur le véhicule ${vehicle}, immatriculé ${numberplate} !`
        })
        result.err && this.saveError(result.err)
    }
    public sendOTPPin = async (phone: string, pin: string) => {
        const result = await this.middleware.sendSMS({
            to: phone,
            message: `Code PIN: ${pin}\n\nCe message resulte d'une double authentification que vous avez initié sur la plateforme Anywhere.`
        })
        if(result.err){
            this.saveError(result.err)
            return false
        }else return true
    }
    public sendNewUserPassword = async (phone: string, password: string) => {
        const result = await this.middleware.sendSMS({
            to: phone,
            message: `Nouveau mot de passe: ${password}\n\nVotre compte a bien été recupéré, vous pouvez vous authentifier sur la plateforme Anywhere avec ce nouveau mot de passe.`
        })
        if(result.err){
            this.saveError(result.err)
            return false
        }else return true
    }
}

export default SMS