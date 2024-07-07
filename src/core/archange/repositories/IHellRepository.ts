import HellItemEntity from "../entities/hell"

interface IRepository {
    getItem(identity: string) : Promise<{ data: HellItemEntity | null, err: string }>
    addItem(identity: string, mode: HellItemEntity['mode'], time: number): Promise<{ data: HellItemEntity | null, err: string }>
    removeItemByEndStayTime(identity: string, to: number): Promise<{ data: number | null, err: string }>
    updateItemHellMode(item: HellItemEntity, mode: HellItemEntity['mode'], time: number): Promise<{ data: boolean, err: string }>
}

export default IRepository