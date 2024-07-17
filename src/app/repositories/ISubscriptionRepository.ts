import SubscriptionEntity from "#app/entities/subscription.js"

interface ISubscriptionRepository {
    addSubscription(subscription: SubscriptionEntity): Promise<{ data?: SubscriptionEntity | null, err?: string }>
    getSubscriptionByCustomer(customer: string): Promise<{ data?: SubscriptionEntity[], err?: string }>
    getActiveSubscriptionByCustomer(customer: string): Promise<{ data?: SubscriptionEntity[], err?: string }>
}

export default ISubscriptionRepository