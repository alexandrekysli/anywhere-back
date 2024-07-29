import ArchangeUserEntity from "../entities/user"

interface IArchangeUserRepository {
    getUserByLinkHash(linkHash: string, group: string): Promise<{ data?: ArchangeUserEntity | null, err?: string }>
    addUser(linkHash: string, group: string): Promise<{ data?: ArchangeUserEntity | null, err?: string }>
    removeUser(id: string): Promise<{ data?: boolean, err?: string }>
}

export default IArchangeUserRepository