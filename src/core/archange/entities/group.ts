class ArchangeGroupEntity {
    constructor(
        public readonly name: string,
        public readonly description: string,
        public state: boolean,
        public readonly access: { name: string, description: string }[],
        public id?: string
    ){}
}

export default ArchangeGroupEntity