import Utils from "#utils/index.js"
import { ConfigType } from "../../../../config"
import ISMSProvider from "./iSMSProvider"

/** TS */
type OrangeSMSOutboundResponse = {}

class OrangeMiddleware implements ISMSProvider {
    private actualToken?: { value: string, date: number }

    constructor(private config: ConfigType['infrastructure']['sms']){}

    private getNewToken = async (): Promise<boolean> => {
        if(!this.actualToken || this.actualToken && Utils.timestampDiff(Date.now(), this.actualToken.date, 'minute') < 50){
            // -> Get new token
            try {
                const result = await fetch('https://api.orange.com/oauth/v3/token', {
                    method: 'POST',
                    headers: {
                        'Authorization': this.config.authorization,
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json'
                    },
                    body: `grant_type=client_credentials`
                })
                if(result.ok){
                    const response = await result.json() as { token_type: string, access_token: string, expires_in: number }
                    this.actualToken = { value: `${response.token_type} ${response.access_token}`, date: Date.now() }
                    return true
                }else {
                    return false
                }
            } catch (error) {
                return false
            }
        }
        return true
    }

    private exeSend = async (data: SendSMSData) : Promise<{ state?: boolean; err?: string }> => {
        try {
            if(this.actualToken){                
                const result = await fetch(`https://api.orange.com/smsmessaging/v1/outbound/tel%3A%2B2250000/requests`, {
                    method: 'POST',
                    headers: {
                        'Authorization': this.actualToken.value,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        outboundSMSMessageRequest: {
                            address: `tel:${data.to.replace(/ /g, '')}`,
                            senderAddress: 'tel:+2250000',
                            outboundSMSTextMessage: { message: data.message }
                        }
                    })
                })
                if(result.ok) return { state: true }
                else return { err: JSON.stringify(await result.json())}
            }
        } catch (err) {
            return { err: err instanceof Error && err.message || '' }
        }
        return { err: 'no token available' }
    }

    public sendSMS = async (data: SendSMSData): Promise<{ state?: boolean; err?: string }> => {
        if(await this.getNewToken()){
            const result = await this.exeSend(data)
            return { state: result.state, err: result.err }
        }else return { err: 'unable to get token' }
    }
}

export default OrangeMiddleware