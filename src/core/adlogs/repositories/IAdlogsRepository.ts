/**
 * Adlogs Repository Interface
 * ---
 * k-engine
 */

abstract class Interface {
    abstract save(item: AdlogSavedItem): Promise<{ state: boolean, err: string }>
}

export default Interface