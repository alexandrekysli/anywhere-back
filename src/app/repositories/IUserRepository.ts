import UserEntity from "../entities/user"

interface IUserRepository {
    addUser(user: UserEntity): Promise<{ data?: UserEntity | null, err?: string }>
    getUserBySpecs(email: string, phone: string): Promise<{ data?: UserEntity | null, err?: string }>
    getUserByID(id: string): Promise<{ data?: UserEntity | null, err?: string }>
    getUserByType(type: string): Promise<{ data?: UserEntity[], err?: string }>
    getUserByPassHash(passHash: string): Promise<{ data?: UserEntity | null, err?: string }>
    getUserByArchangeLinkHash(linkHash: string): Promise<{ data?: UserEntity, err?: string }>
}

export default IUserRepository