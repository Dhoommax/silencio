export type RecordingState = 'idle' | 'recording' | 'paused' | 'processing' | 'completed' | 'error';
export type Page = 'home' | 'record' | 'transcription' | 'tts' | 'recordings' | 'history' | 'ai' | 'translation' | 'settings' | 'projects' | 'converter' | 'effects' | 'export-center' | 'storage' | 'song-studio';
export interface Recording { id: string; name: string; createdAt: string; duration: number; mimeType: string; size: number; language: string; transcriptionStatus: 'not-started' | 'complete'; blob?: Blob; favorite?: boolean; projectId?: string; }
export interface Transcript { id: string; title: string; text: string; createdAt: string; language: string; recordingId?: string; projectId?: string; }
export interface UserSettings { theme: 'dark' | 'light'; language: string; continuous: boolean; interimResults: boolean; noiseSuppression: boolean; echoCancellation: boolean; autoGainControl: boolean; fontSize: 'small' | 'medium' | 'large'; }
export interface Project { id: string; name: string; description: string; createdAt: string; updatedAt: string; favorite?: boolean; }
export interface ActivityEntry { id: string; type: 'recording' | 'transcript' | 'subtitle' | 'export' | 'import' | 'project' | 'settings' | 'song'; message: string; createdAt: string; }
export interface ExportRecord { id: string; name: string; type: 'audio' | 'transcript' | 'subtitle' | 'project' | 'backup' | 'song'; format: string; size: number; createdAt: string; status: 'success' | 'error' | 'pending'; content?: string; }
export interface BackupBundle { version: number; exportedAt: string; recordings: Recording[]; transcripts: Transcript[]; projects: Project[]; activities: ActivityEntry[]; settings: UserSettings; songs?: SongProject[]; }

export type SongStep = 'idea' | 'script' | 'structure' | 'vocals' | 'music' | 'edit' | 'subtitles' | 'mix' | 'export';
export interface SongSection { id: string; name: string; type: 'intro' | 'verse' | 'pre-chorus' | 'chorus' | 'bridge' | 'hook' | 'outro' | 'spoken' | 'adlib' | 'custom'; text: string; start: number; end: number; duration: number; color: string; collapsed: boolean; }
export interface SongTake { id: string; label: string; createdAt: string; duration: number; mimeType: string; size: number; url?: string; selected?: boolean; }
export interface SongTrack { id: string; name: string; type: 'lead-vocal' | 'backing-vocal' | 'adlibs' | 'background-music' | 'sound-effects'; volume: number; pan: number; muted: boolean; solo: boolean; url?: string; fileName?: string; loop: boolean; fadeIn: number; fadeOut: number; }
export interface SongMetadata { title: string; artist: string; album: string; genre: string; language: string; year: string; description: string; composer: string; songwriter: string; }
export interface SongProject {
  id: string;
  title: string;
  artistName: string;
  genre: string;
  mood: string;
  language: string;
  description: string;
  lyrics: string;
  idea: string;
  targetDuration: number;
  audience: string;
  songStructure: SongSection[];
  tracks: SongTrack[];
  takes: SongTake[];
  subtitles: string;
  coverImage?: string;
  metadata: SongMetadata;
  notes: string;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'in-progress' | 'ready';
  currentStep: SongStep;
  versionName?: string;
}