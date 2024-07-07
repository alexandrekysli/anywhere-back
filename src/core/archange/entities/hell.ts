class HellItemEntity {
    constructor(
        public id: string | undefined,
        public readonly identity: string,
        public mode: 'delayed' | 'ban',
        public from: number,
        public to: number
    ){}
}

export default HellItemEntity