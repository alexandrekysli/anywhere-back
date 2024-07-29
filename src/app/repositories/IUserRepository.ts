import UserEntity from "../entities/user"

interface IUserRepository {
    addUser(user: UserEntity): Promise<{ data?: UserEntity | null, err?: string }>
    getUserBySpecs(email: string, phone: string): Promise<{ data?: UserEntity | null, err?: string }>
    getUserByID(id: string): Promise<{ data?: UserEntity | null, err?: string }>
    getUserByType(type: string): Promise<{ data?: UserEntity[], err?: string }>
    getUserByPassHash(passHash: string): Promise<{ data?: UserEntity | null, err?: string }>
    getUserByArchangeLinkHash(linkHash: string): Promise<{ data?: UserEntity, err?: string }>
    getAvailableManager(): Promise<{ data?: UserEntity[], err?: string }>
    setUserState(id: string, state: boolean): Promise<{ data?: boolean, err?: string }>
    setUserManager(id: string, manager: string): Promise<{ data?: boolean, err?: string }>
    removeUser(id: string): Promise<{ data?: boolean, err?: string }>
    setUserAuthPhone(id: string, newData: string): Promise<{ data?: boolean, err?: string }>
    setUserAuthEmail(id: string, newData: string): Promise<{ data?: boolean, err?: string }>
    setUserAuth2fa(id: string, newData: boolean): Promise<{ data?: boolean, err?: string }>
    setUserAuthPassHash(id: string, newData: string): Promise<{ data?: boolean, err?: string }>
}

export default IUserRepository