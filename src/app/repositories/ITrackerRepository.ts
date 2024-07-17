import TrackerEntity from "#app/entities/tracker.js"

interface ITrackerRepository {
    addTracker(tracker: TrackerEntity): Promise<{ data?: TrackerEntity | null, err?: string }>
    getTracker(id: string): Promise<{ data?: TrackerEntity | null, err?: string }>
    getAvailableTracker(): Promise<{ data?: TrackerEntity[], err?: string }>
    setTrackerStatut(id: string, statut: TrackerEntity['state']): Promise<{ data?: boolean, err?: string }>
    removeTracker(id: string): Promise<{ data?: boolean, err?: string }>
}

export default ITrackerRepository