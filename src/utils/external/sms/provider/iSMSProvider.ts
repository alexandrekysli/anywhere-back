type SMSProviderAvailability = { state: boolean, sms: number, to: number }

interface ISMSProvider {
    sendSMS(data: SendSMSData): Promise<boolean | Error>
    getAvailability(): Promise<SMSProviderAvailability | Error>
}

export default ISMSProvider