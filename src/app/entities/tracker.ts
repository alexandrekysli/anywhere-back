class TrackerEntity {
    constructor(
        public readonly brand: string,
        public readonly model: string,
        public readonly imei: string,
        public readonly sn: string,
        public sim: string,
        public enabled_option: string[],
        public readonly adding_date: number,
        public state: 'inventory' | 'paired' | 'lost' | 'broken',
        public id?: string
    ){}
}

export default TrackerEntity