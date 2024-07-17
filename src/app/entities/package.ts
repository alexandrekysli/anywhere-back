class PackageEntity {
    constructor(
        public readonly name: string,
        public readonly day_validity: number,
        public readonly fleet_count: number,
        public readonly amount: number,
        public readonly accessibility: 'all' | 'particular' | 'corporate',
        public readonly allowed_option: string[],
        public readonly adding_date: number,
        public id?: string
    ){}
}

export default PackageEntity