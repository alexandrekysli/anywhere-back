import CallerEntity from "../entities/caller"

interface ICallerRepository {
    getCallerByIdentifier(identifier: string): Promise<{ data: CallerEntity | null, err: string }>
    addCaller(caller: CallerEntity): Promise<{ data: CallerEntity | null, err: string }>
}

export default ICallerRepository