/** ### Applications common types ### */

/** ## Repositories ## */

/** Adlogs */
type AdlogSavedItem = {
    id?: string,
    type: 'ready' | 'stop' | 'warning' | 'info',
    date?: number,
    category: 'global' | 'rock' | 'archange' | 'app',
    message: string
}