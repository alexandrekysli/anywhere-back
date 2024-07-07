type OriginAgent = {
    client: { name: string, version: string },
    os: { name: string, version: string }
}

class OriginEntity {
    constructor(
        public id: string | undefined,
        public readonly ip: string,
        public readonly since: number,
        public lastActivity: number,
        public readonly caller: string,
        public readonly identifier: string,
        public agent: OriginAgent
    ){}
}

export default OriginEntity