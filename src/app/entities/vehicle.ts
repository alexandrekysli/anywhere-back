import UserEntity from "./user"

class VehicleEntity {
    constructor(
        public readonly brand: string,
        public readonly model: string,
        public numberplate: string,
        public readonly type: 'motorcycle' | 'car' | 'truck',
        public group: string,
        public driver: string,
        public customer: UserEntity | string,
        public maxspeed: number,
        public state: 'inventory' | 'paired' | 'unpaired' | 'lost',
        public readonly adding_date: number,
        public id?: string
    ){}
}

export default VehicleEntity