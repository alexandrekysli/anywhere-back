import FenceAreaEntity from "#app/entities/fence-area.js"

interface IFenceAreaRepository {
    getAreas(): Promise<{ data?: FenceAreaEntity[], err?: string }>
    getArea(id: string): Promise<{ data?: FenceAreaEntity | null, err?: string }>
    checkPositionInArea(position: Coordinates, areaID: string): Promise<{ data?: 'in' | 'out', err?: string }>
}

export default IFenceAreaRepository