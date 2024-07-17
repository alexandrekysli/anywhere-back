import ArchangeGroupEntity from "./group"

class ArchangeUserEntity {
    constructor(
        public readonly link_hash: string,
        public group?: ArchangeGroupEntity,
        public id?: string
    ){}
}

export default ArchangeUserEntity