import SubscriptionEntity from "#app/entities/subscription.js"

interface ISubscriptionRepository {
    addSubscription(subscription: SubscriptionEntity): Promise<{ data?: SubscriptionEntity | null, err?: string }>
    getSubscription(id: string): Promise<{ data?: SubscriptionEntity | null, err?: string }>
    getLastSubscriptionByCustomer(customer: string): Promise<{ data?: SubscriptionEntity | null, err?: string }>
    getChildSubscription(dependency: string): Promise<SubscriptionEntity[] | Error>
    getSubscriptionByCustomer(customer: string): Promise<{ data?: SubscriptionEntity[], err?: string }>
    getSubscriptionByPackage(_package: string): Promise<{ data?: SubscriptionEntity[], err?: string }>
    getSubscriptionByVehicle(vehicle: string): Promise<{ data?: SubscriptionEntity[], err?: string }>
    getActiveSubscriptionByCustomer(customer: string): Promise<{ data?: SubscriptionEntity[], err?: string }>
    setSubscriptionFleet(id: string, vehicle: string[]): Promise<{ data?: boolean, err?: string }>
    updateSubscriptionStartingDate(id: string, startingDate: number): Promise<boolean | Error>
    suspendSubscription(id: string): Promise<{ data?: boolean, err?: string }>
}

export default ISubscriptionRepository