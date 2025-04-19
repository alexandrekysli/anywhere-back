import Adlogs from "#core/adlogs/index.js"
import Config from "../../../config"
import IEMailProvider from "./provider/iEmailProvider"
import NodemailerMiddleware from "./provider/nodemailer"

type SendMailData = {
    to: string[],
    data: {
        from: string,
        subject: string,
        message: { text: string | undefined, html: string | undefined }
    }
}

/**
 * Email Service
 * ---
 * k-engine
 */

class Email {
    private emailConfig = Config.infrastructure.email
    private middleware: IEMailProvider
    private commonEndBody = '#Au plaisir de vous revoir très prochainement.##Ce message a été automatiquement généré. Merci de ne pas y répondre.#Anywhere GPS Platform.'

    constructor(private adlogs: Adlogs){
        this.middleware = new NodemailerMiddleware(this.emailConfig)
    }

    exeMailSend = async (mail: SendMailData) => {
        const result = await this.middleware.sendMail(mail)
        if(result instanceof Error) this.handleError(result, mail.to)
        else return true

        return false
    }

    handleError = (error: Error, address: string[] | string) => {
        this.adlogs.writeRuntimeEvent({
            category: 'app',
            type: 'warning',
            message: `unable to send email to < ${address.toString()} > because of < ${error} >`,
            save: true
        })
    }

    sendNewAccountAuthData = async (email: string, fullname: string, password: string) => {
        const mail = {
            to: [email],
            data: {
                from: 'Anywhere',
                subject: '👋🏾 Bienvenue sur Anywhere',
                message: {
                    text: `Bienvenue sur Anywhere#-#Bonjour ${fullname},#Nous avons le plaisir de vous annoncer la création effective de votre compte sur notre plateforme.#Merci d'effectuer votre prochaine connexion avec les informations suivantes :##Email : ${email}#Mot de passe : ${password}` + this.commonEndBody,
                    html: undefined
                }
            }
        }
        return await this.exeMailSend(mail)
    }

    sendOldAccountAuthData = async (email: string, fullname: string, password: string) => {
        const mail = {
            to: [email],
            data: {
                from: 'Anywhere',
                subject: '🔐 Recuperation de compte',
                message: {
                    text: `Bonjour ${fullname},#La procédure de récupération de votre compte a bien été achevé.##Email : ${email}#Nouveau mot de passe : ${password}` + this.commonEndBody,
                    html: undefined
                }
            }
        }
        return await this.exeMailSend(mail)
    }

    sendVehicleAlertOverspeed = async (email: string, vehicleModel: string, vehicleNumberplate: string, vehicleSpeed: number, vehicleMaxSpeed: number, location: string) => {
        const mail = {
            to: [email],
            data: {
                from: 'Anywhere',
                subject: '🚀 Alerte de Survitesse',
                message: {
                    text: `Bonjour, le véhicule ${vehicleModel} immatriculé ${vehicleNumberplate} vient d'enregistrer un excès de vitesse (${vehicleSpeed} / ${vehicleMaxSpeed}) à ${location}.` + this.commonEndBody,
                    html: undefined
                }
            }
        }
        return await this.exeMailSend(mail)
    }

    sendVehicleAlertImpact = async (email: string, vehicleModel: string, vehicleNumberplate: string, location: string) => {
        const mail = {
            to: [email],
            data: {
                from: 'Anywhere',
                subject: '💥 Alerte de Collision',
                message: {
                    text: `Bonjour, une possible collision a été détectée sur le véhicule ${vehicleModel} immatriculé ${vehicleNumberplate} à ${location}.` + this.commonEndBody,
                    html: undefined
                }
            }
        }
        return await this.exeMailSend(mail)
    }

    sendVehicleAlertFence = async (email: string, vehicleModel: string, vehicleNumberplate: string, mode: string, location: string, fenceName: string) => {
        const mail = {
            to: [email],
            data: {
                from: 'Anywhere',
                subject: '🚧 Alerte de Cloture géographique',
                message: {
                    text: `Bonjour, le véhicule ${vehicleModel} immatriculé ${vehicleNumberplate} à ${location} est ${fenceName} de la sa zone géographique (${fenceName})}.` + this.commonEndBody,
                    html: undefined
                }
            }
        }
        return await this.exeMailSend(mail)
    }

    sendVehicleAlertAntiTheft = async (email: string, vehicleModel: string, vehicleNumberplate: string, location: string) => {
        const mail = {
            to: [email],
            data: {
                from: 'Anywhere',
                subject: '🚨 Suspicion de vol',
                message: {
                    text: `Bonjour, des mouvements suspects été détectés sur le véhicule éteint ${vehicleModel} immatriculé ${vehicleNumberplate} à ${location}.` + this.commonEndBody,
                    html: undefined
                }
            }
        }
        return await this.exeMailSend(mail)
    }

    sendVehicleAlertEngineLock = async (email: string, vehicleModel: string, vehicleNumberplate: string, location: string) => {
        const mail = {
            to: [email],
            data: {
                from: 'Anywhere',
                subject: '🔒 Alerte de Verouillage Moteur',
                message: {
                    text: `Bonjour, le véhicule ${vehicleModel} immatriculé ${vehicleNumberplate} a été immobilisé, via une commande de verrouillage moteur, à ${location}.` + this.commonEndBody,
                    html: undefined
                }
            }
        }
        return await this.exeMailSend(mail)
    }

    sendVehicleAlertSOS = async (email: string, vehicleModel: string, vehicleNumberplate: string, location: string) => {
        const mail = {
            to: [email],
            data: {
                from: 'Anywhere',
                subject: '🆘 Alerte SOS',
                message: {
                    text: `Bonjour, commande d'urgence enclenchée sur le véhicule ${vehicleModel} immatriculé ${vehicleNumberplate} à ${location}.` + this.commonEndBody,
                    html: undefined
                }
            }
        }
        return await this.exeMailSend(mail)
    }


    sendCriticalAdlogsEvent = async (email: string, event: AdlogSavedItem) => {
        const mail = {
            to: [email],
            data: {
                from: 'Anywhere',
                subject: '⚠️ Critical error on Anywhere',
                message: {
                    text: `Dear Administrator, an critical error has occurred on Anywhere platform.##Adlogs Event#-#DateTime : ${new Date(event.date || 0).toLocaleString()}#Category : ${event.category}#Type : ${event.type}#Message : ${event.message}##${event.critical ? `Catch traceback#-#${event.critical.stack}` : ''}`,
                    html: undefined
                }
            }
        }
        return await this.exeMailSend(mail)
    }

    debug = async (email: string) => {
        const mail = {
            to: [email],
            data: {
                from: 'Anywhere',
                subject: 'Débogage',
                message: {
                    text: 'Ceci est un test !',
                    html: undefined
                }
            }
        }
        return await this.exeMailSend(mail)
    }

}

export default Email