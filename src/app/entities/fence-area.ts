class FenceAreaEntity {
    constructor(
        public readonly name: string,
        public readonly geometry: {
            type: string,
            coordinates: [number, number][][]
        },
        public id?: string
    ){}
}

export default FenceAreaEntity