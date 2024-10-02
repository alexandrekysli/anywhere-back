import Adlogs from "#core/adlogs/index.js"
import Utils from "#utils/index.js"
import Config from "../../../config"
import ISMSProvider from "./provider/iSMSProvider"
import OrangeMiddleware from "./provider/orange"

/**
 * SMS Service
 * ---
 * k-engine
 */

class SMS {
    private smsConfig = Config.infrastructure.sms
    private middleware: ISMSProvider

    constructor(private adlogs: Adlogs){
        this.middleware = new OrangeMiddleware(this.smsConfig)
    }

    exeSMSSend = async (sms: SendSMSData) => {
        const result = await this.middleware.sendSMS(sms)
        if(result instanceof Error) this.handleError(result, sms.to)
        else return true

        return false
    }

    handleError = (error: Error, phoneNumber: string) => {
        this.adlogs.writeRuntimeEvent({
            category: 'app',
            type: 'warning',
            message: `unable to send sms to < ${phoneNumber} >`,
            critical: error,
            save: true
        })
    }

    sendNewAccountAuthData = async (phoneNumber: string, fullname: string, email: string, password: string) => {
        const sms = {
            to: phoneNumber,
            message: `Bonjour ${fullname}, bienvenue sur Anywhere.#Informations d'authentification :##Email : ${email}#Mot de passe : ${password}##Au plaisir de vous revoir très prochainement.`
        }
        return await this.exeSMSSend(sms)
    }

    sendOldAccountAuthData = async (phoneNumber: string, fullname: string, email: string, password: string) => {
        const sms = {
            to: phoneNumber,
            message: `Bonjour ${fullname}, votre compte a bien été récupéré.##Email : ${email}#Nouveau mot de passe : ${password}##Au plaisir de vous revoir très prochainement.`
        }
        return await this.exeSMSSend(sms)
    }

    sendOTPPin = async (phoneNumber: string, email: string, pin: string) => {
        const sms = {
            to: phoneNumber,
            message: `Bonjour, une vérification OTP a été initiée sur votre compte ${email}.##Code PIN : ${pin}##Merci d'ignorer ce message si vous n'avez initié aucune vérification.#Au plaisir de vous revoir très prochainement.`
        }
        return await this.exeSMSSend(sms)
    }

    sendVehicleAlertOverspeed = async (phoneNumber: string, vehicleModel: string, vehicleNumberplate: string, vehicleSpeed: number, vehicleMaxSpeed: number, location: string) => {
        const sms = {
            to: phoneNumber,
            message: `Alerte de Survitesse !#Excès de vitesse (${vehicleSpeed} / ${vehicleMaxSpeed}) détecté sur le véhicule ${vehicleModel} immatriculé ${vehicleNumberplate} à ${location}.`
        }
        return await this.exeSMSSend(sms)
    }

    sendVehicleAlertImpact = async (phoneNumber: string, vehicleModel: string, vehicleNumberplate: string, location: string) => {
        const sms = {
            to: phoneNumber,
            message: `Alerte de Collision !#Possible collision détectée à ${location} sur le véhicule ${vehicleModel} immatriculé ${vehicleNumberplate}.`
        }
        return await this.exeSMSSend(sms)
    }

    sendVehicleAlertFence = async (phoneNumber: string, vehicleModel: string, vehicleNumberplate: string, mode: string, location: string, fenceName: string) => {
        const sms = {
            to: phoneNumber,
            message: `${Utils.capitalizeThen(mode, false)}e de zone !#Le véhicule ${vehicleModel} immatriculé ${vehicleNumberplate} à ${location} est ${mode} de la sa zone géographique (${fenceName})}`
        }
        return await this.exeSMSSend(sms)
    }

    sendVehicleAlertAntiTheft = async (phoneNumber: string, vehicleModel: string, vehicleNumberplate: string, location: string) => {
        const sms = {
            to: phoneNumber,
            message: `Suspicion de vol !#Mouvements suspects détectés sur le véhicule éteint ${vehicleModel} immatriculé ${vehicleNumberplate} à ${location}.`
        }
        return await this.exeSMSSend(sms)
    }

    sendVehicleAlertEngineLock = async (phoneNumber: string, vehicleModel: string, vehicleNumberplate: string, location: string) => {
        const sms = {
            to: phoneNumber,
            message: `Alerte de Verrouillage Moteur !#Commande d'immobilisation exécutée sur le véhicule ${vehicleModel} immatriculé ${vehicleNumberplate} à ${location}.`
        }
        return await this.exeSMSSend(sms)
    }

    sendVehicleAlertSOS = async (phoneNumber: string, vehicleModel: string, vehicleNumberplate: string, location: string) => {
        const sms = {
            to: phoneNumber,
            message: `Alerte SOS !#Commande d'urgence enclenchée sur le véhicule ${vehicleModel} immatriculé ${vehicleNumberplate} à ${location}`
        }
        return await this.exeSMSSend(sms)
    }
}

export default SMS