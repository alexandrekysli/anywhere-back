import VehicleEntity from "#app/entities/vehicle.js"

interface IVehicleRepository {
    addVehicle(vehicle: VehicleEntity): Promise<{ data?: VehicleEntity | null, err?: string }>
    getVehicle(id: string): Promise<{ data?: VehicleEntity | null, err?: string }>
    getVehicles(): Promise<{ data?: VehicleEntity[], err?: string }>
    getVehicleByCustomer(customer: string): Promise<{ data?: VehicleEntity[] | null, err?: string }>
    editVehicle(id: string, numberplate: string, group: string, driver: string, speed: number): Promise<{ data?: boolean, err?: string }>
    setVehicleStatut(id: string, statut: VehicleEntity['state']): Promise<{ data?: boolean, err?: string }>
    removeVehicle(id: string): Promise<{ data?: boolean, err?: string }>
}

export default IVehicleRepository