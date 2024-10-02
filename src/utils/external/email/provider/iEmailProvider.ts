type SendMailData = {
    to: string[],
    data: {
        from: string,
        subject: string,
        message: { text: string | undefined, html: string | undefined }
    }
}

interface IEmailProvider {
    sendMail(data: SendMailData): Promise<boolean | Error>
}

export default IEmailProvider