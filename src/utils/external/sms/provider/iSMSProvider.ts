interface ISMSProvider {
    sendSMS(data: SendSMSData): Promise<{ state?: boolean, err?: string }>
}

export default ISMSProvider