type SendMailData = {
    to: string[],
    data: {
        from: string,
        subject: string,
        message: { text: string | undefined, html: string | undefined }
    }
}

interface IEMailProvider {
    sendMail(data: SendMailData): Promise<{ state?: boolean, err?: string }>
}

export default IEMailProvider