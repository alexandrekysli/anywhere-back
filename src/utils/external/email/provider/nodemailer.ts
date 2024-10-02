import { ConfigType } from "../../../../config";
import IEMailProvider from "./iEmailProvider";

import Nodemailer from "nodemailer"

class NodemailerMiddleware implements IEMailProvider{
    private transporter
    constructor(private config: ConfigType['infrastructure']['email']){
        this.transporter = Nodemailer.createTransport(config)
    }

    async sendMail(mail: SendMailData): Promise<boolean | Error> {
        return new Promise((resolve) => {
            this.transporter.verify((err, ok) => {
                if(err){
                    resolve(err instanceof Error ? err : Error('<!>'))
                }else{
                    this.transporter.sendMail({
                        from: `${mail.data.from} "<${this.config.auth.user}>"`,
                        to: mail.to,
                        subject: mail.data.subject,
                        text: mail.data.message.text?.replace(/\#/g, '\n'),
                        html: mail.data.message.html
                    })
                    .then(() => resolve(true))
                    .catch(err => resolve(err instanceof Error ? err : Error('<!>')))
                }
            })
        })
    }
}

export default NodemailerMiddleware