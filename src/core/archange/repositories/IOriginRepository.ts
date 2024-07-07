import OriginEntity from "../entities/origin"

interface IOriginRepository {
    getOriginByCaller(callerIdentifier: string): Promise<{ data: OriginEntity[], err: string }>
    addOrigin(origin: OriginEntity): Promise<{ data: OriginEntity | null, err: string}>
    updateOriginActivity(originID: string, lastActivity: number): Promise<{ data: boolean, err: string}>
}

export default IOriginRepository