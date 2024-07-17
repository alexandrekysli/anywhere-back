import UserEntity from "./user";

class VehicleEntity {
    constructor(
        public readonly brand: string,
        public readonly model: number,
        public numberplate: number,
        public readonly type: 'motorcycle' | 'car' | 'truck',
        public group: string,
        public driver: string,
        public customer: UserEntity | string,
        public maxspeed: number,
        public state: 'inventory' | 'paired' | 'maintenance' | 'lost',
        public readonly adding_date: number,
        public id?: string
    ){}
}

export default VehicleEntity