/** ### Applications common types ### */

/** ## Repositories ## */

/** Adlogs */
type AdlogSavedItem = {
    id?: string,
    type: 'ready' | 'stop' | 'warning' | 'info',
    date?: number,
    category: string,
    message: string
}