/** Repositories types */
/** Adlogs */

type AdlogSavedItem = {
    id?: string,
    "ke-app-id"?: string,
    type: 'stop' | 'warning' | 'info',
    date?: number,
    category: 'global' | 'rock' | 'archange' | 'app',
    message: string
}