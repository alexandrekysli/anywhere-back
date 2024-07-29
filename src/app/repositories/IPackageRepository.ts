import PackageEntity from "#app/entities/package.js"

interface IPackageRepository {
    addPackage(_package: PackageEntity): Promise<{ data?: PackageEntity | null, err?: string }>
    getPackages(): Promise<{ data?: PackageEntity[], err?: string }>
    getPackageByID(id: string): Promise<{ data?: PackageEntity | null, err?: string }>
    getPackageByName(name: string): Promise<{ data?: PackageEntity | null, err?: string }>    
    removePackage(id: string): Promise<{ data?: boolean, err?: string }>
}

export default IPackageRepository