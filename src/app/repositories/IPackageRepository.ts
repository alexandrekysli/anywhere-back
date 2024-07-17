import PackageEntity from "#app/entities/package.js"

interface IPackageRepository {
    addPackage(_package: PackageEntity): Promise<{ data?: PackageEntity | null, err?: string }>
    getPackages(): Promise<{ data?: PackageEntity[], err?: string }>
    getPackageByID(id: string): Promise<{ data?: PackageEntity | null, err?: string }>
}

export default IPackageRepository