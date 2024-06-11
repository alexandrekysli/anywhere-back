/**
 * Adlogs Repository Interface
 * ---
 * Anywhere
 */

export default abstract class {
    abstract addNewLogItem(item: AdlogSavedItem): Promise<{ state: boolean, err: string }>
}