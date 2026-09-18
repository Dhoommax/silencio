import type { ActivityEntry, BackupBundle, ExportRecord, Project, Recording, SongProject, Transcript, UserSettings } from '../types';
const DB_NAME = 'silencio-db';
const openDb = (): Promise<IDBDatabase> => new Promise((resolve, reject) => { const request = indexedDB.open(DB_NAME, 3); request.onupgradeneeded = () => { const db = request.result; if (!db.objectStoreNames.contains('recordings')) db.createObjectStore('recordings', { keyPath: 'id' }); if (!db.objectStoreNames.contains('transcripts')) db.createObjectStore('transcripts', { keyPath: 'id' }); if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'id' }); if (!db.objectStoreNames.contains('projects')) db.createObjectStore('projects', { keyPath: 'id' }); if (!db.objectStoreNames.contains('activities')) db.createObjectStore('activities', { keyPath: 'id' }); if (!db.objectStoreNames.contains('exports')) db.createObjectStore('exports', { keyPath: 'id' }); if (!db.objectStoreNames.contains('songs')) db.createObjectStore('songs', { keyPath: 'id' }); }; request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
const put = async <T extends { id: string }>(store: string, value: T) => { const db = await openDb(); return new Promise<void>((resolve, reject) => { const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).put(value); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); }); };
const all = async <T>(store: string): Promise<T[]> => { const db = await openDb(); return new Promise((resolve, reject) => { const request = db.transaction(store).objectStore(store).getAll(); request.onsuccess = () => resolve(request.result as T[]); request.onerror = () => reject(request.error); }); };
const clearStore = async (store: string) => { const db = await openDb(); return new Promise<void>((resolve, reject) => { const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).clear(); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); }); };
export const storageService = {
  saveRecording: (r: Recording) => put('recordings', r),
  getRecordings: () => all<Recording>('recordings'),
  saveTranscript: (t: Transcript) => put('transcripts', t),
  getTranscripts: () => all<Transcript>('transcripts'),
  saveSettings: (s: UserSettings) => put('settings', { ...s, id: 'current' }),
  async getSettings() { const values = await all<UserSettings & { id: string }>('settings'); return values[0]; },
  async deleteRecording(id: string) { const db = await openDb(); db.transaction('recordings', 'readwrite').objectStore('recordings').delete(id); },
  async deleteTranscript(id: string) { const db = await openDb(); db.transaction('transcripts', 'readwrite').objectStore('transcripts').delete(id); },
  saveProject: (project: Project) => put('projects', project),
  getProjects: () => all<Project>('projects'),
  deleteProject: async (id: string) => { const db = await openDb(); db.transaction('projects', 'readwrite').objectStore('projects').delete(id); },
  saveSongProject: (song: SongProject) => put('songs', song),
  getSongProjects: () => all<SongProject>('songs'),
  deleteSongProject: async (id: string) => { const db = await openDb(); db.transaction('songs', 'readwrite').objectStore('songs').delete(id); },
  saveActivity: (entry: ActivityEntry) => put('activities', entry),
  getActivities: () => all<ActivityEntry>('activities'),
  saveExportRecord: (record: ExportRecord) => put('exports', record),
  getExportRecords: () => all<ExportRecord>('exports'),
  deleteExportRecord: async (id: string) => { const db = await openDb(); db.transaction('exports', 'readwrite').objectStore('exports').delete(id); },
  clearRecordings: () => clearStore('recordings'),
  clearTranscripts: () => clearStore('transcripts'),
  clearProjects: () => clearStore('projects'),
  clearActivities: () => clearStore('activities'),
  clearExports: () => clearStore('exports'),
  clearSongs: () => clearStore('songs'),
  async exportBackup(): Promise<BackupBundle> {
    const [recordings, transcripts, projects, activities, settings, songs] = await Promise.all([
      this.getRecordings(),
      this.getTranscripts(),
      this.getProjects(),
      this.getActivities(),
      this.getSettings(),
      this.getSongProjects(),
    ]);
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      recordings,
      transcripts,
      projects,
      activities,
      settings: settings ?? {
        theme: 'dark',
        language: 'en-US',
        continuous: true,
        interimResults: true,
        noiseSuppression: true,
        echoCancellation: true,
        autoGainControl: true,
        fontSize: 'medium',
      },
      songs,
    };
  },
  async restoreBackup(bundle: BackupBundle) {
    if (!bundle || !Array.isArray(bundle.recordings)) return;
    await Promise.all([
      ...bundle.recordings.map((item) => this.saveRecording(item)),
      ...bundle.transcripts.map((item) => this.saveTranscript(item)),
      ...bundle.projects.map((item) => this.saveProject(item)),
      ...bundle.activities.map((item) => this.saveActivity(item)),
      ...(bundle.songs ?? []).map((item) => this.saveSongProject(item)),
    ]);
    if (bundle.settings) await this.saveSettings(bundle.settings);
  },
};
