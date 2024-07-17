import ArchangeGroupEntity from "../entities/group"

interface IArchangeGroupRepository {
    getGroupByName(name: string): Promise<{ data?: ArchangeGroupEntity | null, err?: string }>
    addUser(group: ArchangeGroupEntity): Promise<{ data?: ArchangeGroupEntity | null, err?: string }>
}

export default IArchangeGroupRepository