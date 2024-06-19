/**
 * Adlogs Repository Interface
 * ---
 * Anywhere
 */

abstract class Interface {
    abstract addNewLogItem(item: AdlogSavedItem): Promise<{ state: boolean, err: string }>
}

export default Interface