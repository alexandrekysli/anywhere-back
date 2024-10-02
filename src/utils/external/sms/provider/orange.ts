import Utils from "#utils/index.js"
import { ConfigType } from "../../../../config"
import ISMSProvider from "./iSMSProvider"

/** TS */
interface OrangeSMSContractsResponse {
    country: string,
    status: string,
    availableUnits: number,
    expirationDate: string
}

class OrangeMiddleware implements ISMSProvider {
    private actualToken?: { value: string, date: number }

    constructor(private config: ConfigType['infrastructure']['sms']){}

    private getNewToken = async (): Promise<boolean> => {
        if(!this.actualToken || Utils.timestampDiff(Date.now(), this.actualToken.date, 'minute') < 50){
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
        }else return true
    }

    private exeSend = async (data: SendSMSData) : Promise<boolean | Error> => {
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
                            senderName: 'Anywhere',
                            outboundSMSTextMessage: { message: data.message }
                        }
                    })
                })
                if(result.ok) true
                else return Error(await result.json())
            }
        } catch (err) {
            return err instanceof Error ? err : Error('<!>')
        }
        return Error('no token available')
    }

    public getAvailability = async (): Promise<{ state: boolean; sms: number; to: number } | Error> => {
        if(await this.getNewToken() && this.actualToken){
            const adminDataResult = await fetch('https://api.orange.com/sms/admin/v1/contracts', { method: 'GET', headers: { 'Authorization': this.actualToken.value } })
            if(adminDataResult.ok){
                try {
                    const rawAdminResult = await adminDataResult.json() as OrangeSMSContractsResponse[]
                    if(rawAdminResult.length){
                        return {
                            state: rawAdminResult[0].status === 'ACTIVE',
                            sms: rawAdminResult[0].availableUnits,
                            to: new Date(rawAdminResult[0].expirationDate).getTime()
                        }
                    }else return new Error('no contract available !')
                } catch (error) {
                    return new Error(`critical error < ${error} > !`)
                }
            }else return Error('unable to retrieve availability data from Orange SMS API provider !')
        }else return Error('unable to retrieve a token from Orange SMS API provider !')
    }

    async sendSMS(data: SendSMSData): Promise<boolean | Error> {
        const availability = await this.getAvailability()
        
        if(!(availability instanceof Error)){
            if(availability.state) return await this.exeSend(data)
            else{
                if(availability.sms === 0) return Error('unable to send sms due to no available unit !')
                else if(availability.to < Date.now()) return Error('unable to send sms due to expired contract !')
                else return Error('unable to send sms with this contract !')
            }
        } else return availability
    }
}

export default OrangeMiddleware