import ArchangeUserEntity from "../../entities/user"

interface IArchangeUserRepository {
    getUserByLinkHash(linkHash: string): Promise<{ data?: ArchangeUserEntity | null, err?: string }>
    addUser(linkHash: string): Promise<{ data?: ArchangeUserEntity | null, err?: string }>
    removeUser(id: string): Promise<{ data?: boolean, err?: string }>
}

export default IArchangeUserRepository