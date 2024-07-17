import { ConfigType } from "../../../../config";
import IEMailProvider from "./iEmailProvider";

import Nodemailer from "nodemailer"

/** TS */
type SendMailData = {
    to: string[],
    data: {
        from: string,
        subject: string,
        message: { text: string | undefined, html: string | undefined }
    }
}

class NodemailerMiddleware implements IEMailProvider{
    private transporter
    constructor(private config: ConfigType['infrastructure']['email']){
        this.transporter = Nodemailer.createTransport(config)
    }

    public async sendMail(mail: SendMailData): Promise<{ state?: boolean; err?: string; }> {
        return new Promise((resolve) => {
            this.transporter.verify((err, ok) => {
                if(err){
                    resolve({ err: err instanceof Error ? err.message : '' })
                }else{
                    this.transporter.sendMail({
                        from: `${mail.data.from} "<${this.config.auth.user}>"`,
                        to: mail.to,
                        subject: mail.data.subject,
                        text: mail.data.message.text?.replace(/\#/g, '\n'),
                        html: mail.data.message.html
                    })
                    .then(() => resolve({ state: true }))
                    .catch(err => resolve({ err: err }))
                }
            })
        })
    }
}

export default NodemailerMiddleware