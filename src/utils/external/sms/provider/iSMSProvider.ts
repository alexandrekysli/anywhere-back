type SMSProviderAvailability = { state: boolean, sms: number, to: number }

interface ISMSProvider {
    sendSMS(data: SendSMSData): Promise<{ state?: boolean, err?: string }>
    getAvailability(): Promise<SMSProviderAvailability | Error>
}

export default ISMSProvider