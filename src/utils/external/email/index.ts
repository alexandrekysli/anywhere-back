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
    private mailToSendStack: SendMailData[] = []
    private emailConfig = Config.infrastructure.email
    private middleware: IEMailProvider
    constructor(private adlogs: Adlogs){
        this.middleware = new NodemailerMiddleware(this.emailConfig)
    }

    public sendNewAccountEmail = async (email: string, password: string) => {
        const mail = {
            to: [email],
            data: {
                from: 'Anywhere',
                subject: 'Nouveau Compte',
                message: {
                    text: `Nous vous notifions de la creation effective de votre compte sur la plateforme de gestion client Anywhere.#La connexion initiale à la plateforme d'effectuera avec les accès suivants:##Email: ${email}#Mot de passe: ${password}##Cordialement 👍🏾.##--##Ceci est un message à lecture seul. Merci de ne pas y repondre.#Anywhere GPS Platform.`,
                    html: undefined
                }
            }
        }
        const result = await this.middleware.sendMail(mail)

        if(result.state){
            this.adlogs.writeRuntimeEvent({
                category: 'app',
                type: 'info',
                message: `new account email send complete to recipient < ${email} >`
            })
            return true
        }else{
            this.mailToSendStack.push(mail)
            this.adlogs.writeRuntimeEvent({
                category: 'app',
                type: 'warning',
                message: `unable to send email to < ${email} > < ${password} > with error < ${result.err} >`,
                save: true
            })
            return false
        }
    }
}

export default Email