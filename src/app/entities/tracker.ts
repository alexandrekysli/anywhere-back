class TrackerEntity {
    constructor(
        public readonly brand: string,
        public readonly model: string,
        public readonly imei: string,
        public readonly sn: string,
        public sim: string,
        public readonly adding_date: number,
        public state: 'inventory' | 'paired' | 'unpaired' | 'lost' | 'broken',
        public id?: string
    ){}
}

export default TrackerEntity