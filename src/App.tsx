import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  Activity,
  Archive,
  ArrowRight,
  BrainCircuit,
  Check,
  ChevronRight,
  CircleHelp,
  Clipboard,
  Database,
  Download,
  FileAudio,
  FileText,
  Folder,
  History,
  Home as HomeIcon,
  Languages,
  Menu,
  Mic,
  MoreHorizontal,
  Pause,
  Play,
  RotateCcw,
  Search,
  Settings,
  Square,
  Trash2,
  Volume2,
  Waves,
  X,
} from "lucide-react";
import type {
  ActivityEntry,
  ExportRecord,
  Page,
  Project,
  Recording,
  RecordingState,
  SongProject,
  SongSection,
  SongTrack,
  Transcript,
  UserSettings,
} from "./types";
import { recordingService } from "./services/recordingService";
import { storageService } from "./services/storageService";
import { textToSpeechService } from "./services/textToSpeechService";
import { aiService, type AIAction } from "./services/aiService";

type RecognitionEvent = {
  results: {
    [index: number]: {
      [index: number]: { transcript: string };
      isFinal: boolean;
    };
    length: number;
  };
};
type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type RecognitionConstructor = new () => Recognition;
const getRecognition = () =>
  (
    window as unknown as {
      SpeechRecognition?: RecognitionConstructor;
      webkitSpeechRecognition?: RecognitionConstructor;
    }
  ).SpeechRecognition ??
  (window as unknown as { webkitSpeechRecognition?: RecognitionConstructor })
    .webkitSpeechRecognition;
const languages = [
  { label: "English (US)", code: "en-US" },
  { label: "Swahili (Tanzania)", code: "sw-TZ" },
  { label: "Portuguese", code: "pt-PT" },
];
const defaultSettings: UserSettings = {
  theme: "dark",
  language: "en-US",
  continuous: true,
  interimResults: true,
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: true,
  fontSize: "medium",
};
const uid = () => crypto.randomUUID?.() ?? `${Date.now()}`;
const formatTime = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

function App() {
  const [page, setPage] = useState<Page>("home");
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [songs, setSongs] = useState<SongProject[]>([]);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [exportRecords, setExportRecords] = useState<ExportRecord[]>([]);
  const [aiDraft, setAiDraft] = useState("");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    storageService
      .getRecordings()
      .then(setRecordings)
      .catch(() => undefined);
    storageService
      .getTranscripts()
      .then(setTranscripts)
      .catch(() => undefined);
    storageService
      .getSettings()
      .then((value) => value && setSettings(value))
      .catch(() => undefined);
    storageService
      .getProjects()
      .then(setProjects)
      .catch(() => undefined);
    storageService
      .getSongProjects()
      .then(setSongs)
      .catch(() => undefined);
    storageService
      .getActivities()
      .then(setActivities)
      .catch(() => undefined);
    storageService
      .getExportRecords()
      .then(setExportRecords)
      .catch(() => undefined);
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, []);
  const saveSettings = (next: UserSettings) => {
    setSettings(next);
    storageService.saveSettings(next).catch(() => undefined);
  };
  const recordActivity = (type: ActivityEntry["type"], message: string) => {
    const entry: ActivityEntry = {
      id: uid(),
      type,
      message,
      createdAt: new Date().toISOString(),
    };
    setActivities((current) => [entry, ...current]);
    storageService.saveActivity(entry).catch(() => undefined);
  };
  return (
    <div className={`app ${settings.theme}`}>
      <Sidebar page={page} setPage={setPage} />
      <main className="main">
        <Topbar page={page} online={isOnline} setPage={setPage} />
        <div className="content">
          {page === "home" && (
            <Home
              recordings={recordings}
              transcripts={transcripts}
              activities={activities}
              setPage={setPage}
            />
          )}{" "}
          {page === "record" && (
            <Studio
              settings={settings}
              setPage={setPage}
              onSaved={(recording) =>
                setRecordings((current) => [recording, ...current])
              }
            />
          )}{" "}
          {page === "transcription" && (
            <TranscriptWorkspace
              transcripts={transcripts}
              onSaved={(transcript) =>
                setTranscripts((current) => [
                  transcript,
                  ...current.filter((item) => item.id !== transcript.id),
                ])
              }
            />
          )}{" "}
          {page === "tts" && (
            <TTS
              onEditWithAI={(value) => {
                setAiDraft(value);
                setPage("ai");
              }}
            />
          )}{" "}
          {page === "recordings" && (
            <Recordings
              recordings={recordings}
              setRecordings={setRecordings}
              recordActivity={recordActivity}
            />
          )}{" "}
          {page === "history" && (
            <HistoryPage
              transcripts={transcripts}
              setTranscripts={setTranscripts}
              recordActivity={recordActivity}
            />
          )}{" "}
          {page === "projects" && (
            <ProjectsPage
              projects={projects}
              setProjects={setProjects}
              recordActivity={recordActivity}
            />
          )}{" "}
          {page === "converter" && <AudioConverterPage />}{" "}
          {page === "effects" && <VoiceEffectsPage />}{" "}
          {page === "export-center" && (
            <ExportCenterPage
              exportRecords={exportRecords}
              setExportRecords={setExportRecords}
            />
          )}{" "}
          {page === "storage" && (
            <StoragePage
              recordings={recordings}
              transcripts={transcripts}
              projects={projects}
              songs={songs}
              setRecordings={setRecordings}
              setTranscripts={setTranscripts}
              setProjects={setProjects}
              setSongs={setSongs}
              setActivities={setActivities}
              setExportRecords={setExportRecords}
            />
          )}{" "}
          {page === "song-studio" && (
            <SongStudioPage
              songs={songs}
              setSongs={setSongs}
              recordActivity={recordActivity}
            />
          )}{" "}
          {page === "translation" && <Translation />}{" "}
           {page === "ai" && <AITools initialText={aiDraft} />} {" "}
          {page === "settings" && (
            <SettingsPage settings={settings} saveSettings={saveSettings} />
          )}
        </div>
      </main>
      <BottomNav page={page} setPage={setPage} />
    </div>
  );
}

function Sidebar({
  page,
  setPage,
}: {
  page: Page;
  setPage: (page: Page) => void;
}) {
  const items: [Page, string, typeof HomeIcon][] = [
    ["home", "Home", HomeIcon],
    ["record", "Record", Mic],
    ["transcription", "Transcription", FileText],
    ["tts", "Text to Speech", Volume2],
    ["recordings", "Recordings", Archive],
    ["history", "History", History],
    ["projects", "Projects", Folder],
    ["song-studio", "Song Studio", Waves],
    ["converter", "Audio Converter", FileAudio],
    ["effects", "Voice Effects", Volume2],
    ["export-center", "Export Center", Download],
    ["storage", "Storage", Database],
    ["ai", "AI Tools", BrainCircuit],
    ["translation", "Translation", Languages],
    ["settings", "Settings", Settings],
  ];
  return (
    <aside className="sidebar">
      <div className="brand" onClick={() => setPage("home")}>
        <span className="brand-mark">
          <Waves size={18} />
        </span>
        <span>SILENCIO</span>
      </div>
      <div className="sidebar-label">Workspace</div>
      <nav>
        {items.map(([id, label, Icon]) => (
          <button
            key={id}
            className={page === id ? "nav-item active" : "nav-item"}
            onClick={() => setPage(id)}
          >
            <Icon size={17} />
            <span>{label}</span>
            {page === id && <ChevronRight className="nav-arrow" size={14} />}
          </button>
        ))}
      </nav>
      <div className="sidebar-foot">
        <div className="privacy-pill">
          <span className="status-dot green" />
          Local-first storage
        </div>
        <button className="profile">
          <span className="avatar">S</span>
          <span>
            <strong>Guest workspace</strong>
            <small>Local account</small>
          </span>
          <MoreHorizontal size={16} />
        </button>
      </div>
    </aside>
  );
}
function BottomNav({
  page,
  setPage,
}: {
  page: Page;
  setPage: (page: Page) => void;
}) {
  return (
    <nav className="bottom-nav">
      {(
        [
          ["home", "Home", HomeIcon],
          ["record", "Record", Mic],
          ["transcription", "Transcribe", FileText],
          ["history", "History", History],
          ["settings", "More", Menu],
        ] as [Page, string, typeof HomeIcon][]
      ).map(([id, label, Icon]) => (
        <button
          key={id}
          className={page === id ? "active" : ""}
          onClick={() => setPage(id)}
        >
          <Icon size={19} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
function Topbar({
  page,
  online,
  setPage,
}: {
  page: Page;
  online: boolean;
  setPage: (page: Page) => void;
}) {
  const names: Record<Page, string> = {
    home: "Overview",
    record: "Recording studio",
    transcription: "Transcript editor",
    tts: "Text to speech",
    recordings: "Recordings",
    history: "Transcript history",
    projects: "Projects",
    "song-studio": "Song Studio",
    converter: "Audio converter",
    effects: "Voice effects",
    "export-center": "Export center",
    storage: "Storage",
    ai: "AI tools",
    translation: "Translation",
    settings: "Settings",
  };
  return (
    <header className="topbar">
      <div>
        <span className="eyebrow">SILENCIO / {names[page]}</span>
        <h1>{names[page]}</h1>
      </div>
      <div className="top-actions">
        <span className={online ? "online-status" : "online-status offline"}>
          <span className="status-dot" />
          {online ? "Online" : "Offline"}
        </span>
        {!online && <span className="offline-note">Local data available</span>}
        <button className="icon-button" aria-label="Help">
          <CircleHelp size={19} />
        </button>
        <button className="quick-record" onClick={() => setPage("record")}>
          <Mic size={16} /> Quick record
        </button>
      </div>
    </header>
  );
}

function Home({
  recordings,
  transcripts,
  activities,
  setPage,
}: {
  recordings: Recording[];
  transcripts: Transcript[];
  activities: ActivityEntry[];
  setPage: (page: Page) => void;
}) {
  return (
    <>
      <section className="hero-panel">
        <div className="hero-copy">
          <div className="kicker">
            <span className="pulse-dot" /> Voice workspace
          </div>
          <h2>
            Speak freely.
            <br />
            <em>Keep the signal.</em>
          </h2>
          <p>
            Record, transcribe, and shape your thinking in one calm workspace.
          </p>
          <button className="primary-button" onClick={() => setPage("record")}>
            <Mic size={18} /> Start recording <ArrowRight size={17} />
          </button>
        </div>
        <Waveform large />
      </section>
      <section className="section-heading">
        <div>
          <span className="eyebrow">Your workspace</span>
          <h2>Good to have you back.</h2>
        </div>
        <span className="date-label">
          {new Intl.DateTimeFormat("en", {
            weekday: "long",
            month: "short",
            day: "numeric",
          }).format(new Date())}
        </span>
      </section>
      <div className="stats-grid">
        <Stat
          icon={FileAudio}
          label="Recordings"
          value={String(recordings.length).padStart(2, "0")}
          trend="Stored locally"
        />
        <Stat
          icon={Activity}
          label="Transcription time"
          value="00:00"
          trend="Ready to begin"
        />
        <Stat
          icon={FileText}
          label="Words transcribed"
          value={String(
            transcripts.reduce(
              (sum, item) =>
                sum + item.text.trim().split(/\s+/).filter(Boolean).length,
              0,
            ),
          ).padStart(2, "0")}
          trend="Across all transcripts"
        />
        <Stat
          icon={Check}
          label="Saved transcripts"
          value={String(transcripts.length).padStart(2, "0")}
          trend="Private by default"
        />
      </div>
      <div className="split-grid">
        <section className="content-block">
          <div className="block-title">
            <div>
              <span className="eyebrow">Recent activity</span>
              <h3>Your latest work</h3>
            </div>
            <button
              className="text-button"
              onClick={() => setPage("recordings")}
            >
              View all <ArrowRight size={14} />
            </button>
          </div>
          {activities.length === 0 ? (
            recordings.length === 0 ? (
              <Empty
                icon={Mic}
                title="No recordings yet"
                text="Tap the microphone to create your first recording."
                action="Record a voice note"
                onClick={() => setPage("record")}
              />
            ) : (
              recordings
                .slice(0, 3)
                .map((recording) => (
                  <RecordingRow key={recording.id} recording={recording} />
                ))
            )
          ) : (
            <div className="history-list">
              {activities.slice(0, 6).map((entry) => (
                <article className="history-item" key={entry.id}>
                  <span className="file-icon">
                    <Activity size={16} />
                  </span>
                  <span>
                    <strong>{entry.type}</strong>
                    <small>
                      {new Date(entry.createdAt).toLocaleString()}
                    </small>
                    <p>{entry.message}</p>
                  </span>
                </article>
              ))}
            </div>
          )}
        </section>
        <section className="content-block quick-actions">
          <div className="block-title">
            <div>
              <span className="eyebrow">Shortcuts</span>
              <h3>Make something</h3>
            </div>
          </div>
          {[
            ["record", "Record voice", Mic, "Capture a thought"],
            ["transcription", "Transcribe", FileText, "Edit words precisely"],
            ["tts", "Text to speech", Volume2, "Listen back"],
            ["projects", "Projects", Folder, "Organize the workspace"],
            ["converter", "Audio converter", FileAudio, "Convert local files"],
            ["effects", "Voice effects", Volume2, "Polish tone and output"],
            ["export-center", "Export center", Download, "Download everything"],
          ].map(([id, label, Icon, desc]) => (
            <button
              className="action-row"
              key={id as string}
              onClick={() => setPage(id as Page)}
            >
              <span className="action-icon">
                <Icon size={18} />
              </span>
              <span>
                <strong>{label as string}</strong>
                <small>{desc as string}</small>
              </span>
              <ArrowRight size={15} />
            </button>
          ))}
        </section>
      </div>
    </>
  );
}
function Stat({
  icon: Icon,
  label,
  value,
  trend,
}: {
  icon: typeof FileText;
  label: string;
  value: string;
  trend: string;
}) {
  return (
    <div className="stat-card">
      <span className="stat-icon">
        <Icon size={17} />
      </span>
      <span className="stat-label">{label}</span>
      <strong>{value}</strong>
      <small>{trend}</small>
    </div>
  );
}
function Waveform({
  large = false,
  active = false,
}: {
  large?: boolean;
  active?: boolean;
}) {
  return (
    <div
      className={`waveform ${large ? "waveform-large" : ""} ${active ? "active" : ""}`}
      aria-label={active ? "Live audio waveform" : "Audio waveform"}
    >
      {Array.from({ length: large ? 38 : 28 }, (_, i) => (
        <i
          key={i}
          style={{
            height: `${18 + ((i * 17) % 62)}%`,
            animationDelay: `${i * 22}ms`,
          }}
        />
      ))}
    </div>
  );
}
function Empty({
  icon: Icon,
  title,
  text,
  action,
  onClick,
}: {
  icon: typeof Mic;
  title: string;
  text: string;
  action?: string;
  onClick?: () => void;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon size={22} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action && (
        <button className="secondary-button" onClick={onClick}>
          {action}
        </button>
      )}
    </div>
  );
}
function AudioPlayer({ recording }: { recording: Recording }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!recording.blob) return;
    const nextUrl = URL.createObjectURL(recording.blob);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [recording.blob]);
  return url ? (
    <span className="audio-actions">
      <audio
        className="audio-player"
        controls
        preload="metadata"
        src={url}
        aria-label={`Play ${recording.name}`}
      />
      <a
        className="icon-button audio-download"
        href={url}
        download={`${recording.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "silencio-recording"}.${recording.mimeType.includes("ogg") ? "ogg" : recording.mimeType.includes("mp4") ? "m4a" : "webm"}`}
        aria-label={`Download ${recording.name}`}
        title="Download audio"
      >
        <Download size={15} />
      </a>
    </span>
  ) : (
    <span className="muted audio-unavailable">Audio unavailable</span>
  );
}
function RecordingRow({ recording }: { recording: Recording }) {
  return (
    <div className="recording-row">
      <span className="row-icon">
        <FileAudio size={18} />
      </span>
      <span className="row-main">
        <strong>{recording.name}</strong>
        <small>
          {new Date(recording.createdAt).toLocaleDateString()} ·{" "}
          {recording.language}
        </small>
      </span>
      <span className="row-time">{formatTime(recording.duration)}</span>
      <AudioPlayer recording={recording} />
    </div>
  );
}

function Studio({
  settings,
  setPage,
  onSaved,
}: {
  settings: UserSettings;
  setPage: (page: Page) => void;
  onSaved: (recording: Recording) => void;
}) {
  const [state, setState] = useState<RecordingState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState("");
  const [interim, setInterim] = useState("");
  const [language, setLanguage] = useState(settings.language);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const recognition = useRef<Recognition | null>(null);
  const startedAt = useRef(0);
  useEffect(() => {
    if (state !== "recording") return;
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
      setLevel(Math.min(95, 25 + Math.random() * 65));
    }, 120);
    return () => window.clearInterval(timer);
  }, [state]);
  const startRecognition = () => {
    const Recognition = getRecognition();
    if (!Recognition) return;
    const instance = new Recognition();
    instance.continuous = true;
    instance.interimResults = true;
    instance.lang = language;
    instance.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = 0; i < event.results.length; i++)
        event.results[i].isFinal
          ? (finalText += event.results[i][0].transcript)
          : (interimText += event.results[i][0].transcript);
      if (finalText)
        setConfirmed((current) => `${current} ${finalText}`.trim());
      setInterim(interimText);
    };
    instance.onerror = (event) =>
      setError(
        `Speech recognition: ${event.error}. Recording can continue without live text.`,
      );
    instance.onend = () => {
      if (state === "recording")
        try {
          instance.start();
        } catch {
          /* browser may already be restarting */
        }
    };
    recognition.current = instance;
    try {
      instance.start();
    } catch {
      setError("Speech recognition could not start.");
    }
  };
  const start = async () => {
    setError("");
    try {
      stream.current = await recordingService.requestStream({
        echoCancellation: settings.echoCancellation,
        noiseSuppression: settings.noiseSuppression,
        autoGainControl: settings.autoGainControl,
      });
      recorder.current = recordingService.createRecorder(stream.current);
      chunks.current = [];
      recorder.current.ondataavailable = (event) =>
        event.data.size && chunks.current.push(event.data);
      recorder.current.onstop = () => setState("completed");
      recorder.current.start();
      startedAt.current = Date.now();
      setElapsed(0);
      setState("recording");
      startRecognition();
    } catch (err) {
      setState("error");
      setError(
        (err as Error).message === "MIC_UNAVAILABLE"
          ? "No microphone was detected."
          : "Microphone access is required for recording. Please allow microphone access in your browser settings.",
      );
    }
  };
  const stop = () => {
    recorder.current?.stop();
    recognition.current?.stop();
    stream.current?.getTracks().forEach((track) => track.stop());
    setInterim("");
    setState("completed");
  };
  const save = async () => {
    const blob = new Blob(chunks.current, {
      type: recorder.current?.mimeType || "audio/webm",
    });
    const recording: Recording = {
      id: uid(),
      name: `Voice note ${new Date().toLocaleDateString()}`,
      createdAt: new Date().toISOString(),
      duration: elapsed,
      mimeType: blob.type,
      size: blob.size,
      language,
      transcriptionStatus: confirmed ? "complete" : "not-started",
      blob,
    };
    await storageService.saveRecording(recording);
    if (confirmed)
      await storageService.saveTranscript({
        id: uid(),
        title: recording.name,
        text: confirmed,
        createdAt: recording.createdAt,
        language,
        recordingId: recording.id,
      });
    onSaved(recording);
    setPage("recordings");
  };
  const reset = () => {
    setState("idle");
    setElapsed(0);
    setConfirmed("");
    setInterim("");
    setError("");
    chunks.current = [];
  };
  return (
    <div className="studio-layout">
      <section className="studio-main">
        <div className="studio-head">
          <div>
            <span className="eyebrow">Live capture</span>
            <h2>Recording studio</h2>
          </div>
          <div className="studio-controls">
            <span className="mode-pill">
              <span className="status-dot green" /> SILENCIO MODE
            </span>
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              aria-label="Recognition language"
            >
              {languages.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className={`recording-visual ${state}`}>
          <div className="ring ring-one" />
          <div className="ring ring-two" />
          <button
            className="mic-button"
            aria-label={
              state === "recording" ? "Stop recording" : "Start recording"
            }
            onClick={
              state === "recording"
                ? stop
                : state === "completed"
                  ? reset
                  : start
            }
          >
            {state === "recording" ? (
              <Square size={28} fill="currentColor" />
            ) : state === "completed" ? (
              <RotateCcw size={28} />
            ) : (
              <Mic size={34} />
            )}
          </button>
          <div className="timer">{formatTime(elapsed)}</div>
          <span className="record-status">
            {state === "recording"
              ? "Listening"
              : state === "completed"
                ? "Recording complete"
                : state === "error"
                  ? "Needs attention"
                  : "Ready when you are"}
          </span>
        </div>
        <Waveform active={state === "recording"} />
        <div className="level-line">
          <span>INPUT LEVEL</span>
          <div className="level-track">
            <i style={{ width: `${state === "recording" ? level : 0}%` }} />
          </div>
          <span>{state === "recording" ? `${Math.round(level)}%` : "—"}</span>
        </div>
        {error && (
          <div className="error-banner">
            <X size={17} />
            <span>{error}</span>
          </div>
        )}
        <div className="studio-actions">
          {state === "recording" ? (
            <>
              <button
                className="secondary-button"
                onClick={() => {
                  recorder.current?.pause();
                  setState("paused");
                }}
              >
                <Pause size={16} /> Pause
              </button>
              <button className="danger-button" onClick={stop}>
                <Square size={15} /> Stop
              </button>
            </>
          ) : state === "paused" ? (
            <>
              <button
                className="primary-button"
                onClick={() => {
                  recorder.current?.resume();
                  setState("recording");
                }}
              >
                <Play size={16} /> Resume
              </button>
              <button className="danger-button" onClick={stop}>
                <Square size={15} /> Stop
              </button>
            </>
          ) : state === "completed" ? (
            <>
              <button className="primary-button" onClick={save}>
                <Check size={16} /> Save recording
              </button>
              <button className="secondary-button" onClick={reset}>
                Discard
              </button>
            </>
          ) : (
            <button className="primary-button" onClick={start}>
              <Mic size={17} /> Start recording
            </button>
          )}
        </div>
      </section>
      <section className="transcript-panel">
        <div className="block-title">
          <div>
            <span className="eyebrow">Raw transcript</span>
            <h3>Live transcription</h3>
          </div>
          <span
            className={
              getRecognition() ? "support-badge supported" : "support-badge"
            }
          >
            {getRecognition() ? "Browser ready" : "Unavailable"}
          </span>
        </div>
        <p className="panel-note">
          Words are kept as recognized. Nothing is rewritten or summarized.
        </p>
        <div className="live-text">
          <p>
            {confirmed || (
              <span className="muted">
                Your confirmed speech will appear here.
              </span>
            )}
          </p>
          {interim && <p className="interim">{interim}</p>}
        </div>
        <div className="transcript-meta">
          <span>
            {confirmed.trim() ? confirmed.trim().split(/\s+/).length : 0} words
          </span>
          <span>{languages.find((item) => item.code === language)?.label}</span>
        </div>
      </section>
    </div>
  );
}

function TranscriptWorkspace({
  transcripts,
  onSaved,
}: {
  transcripts: Transcript[];
  onSaved: (transcript: Transcript) => void;
}) {
  const [selected, setSelected] = useState<Transcript | null>(
    transcripts[0] ?? null,
  );
  const [text, setText] = useState(transcripts[0]?.text ?? "");
  const [search, setSearch] = useState("");
  useEffect(() => {
    if (selected) setText(selected.text);
  }, [selected]);
  const current = selected ?? {
    id: uid(),
    title: "Untitled transcript",
    createdAt: new Date().toISOString(),
    language: "en-US",
    text: "",
  };
  const generateSubtitleFile = (format: "srt" | "vtt") => {
    const source = text.trim();
    if (!source) return;
    const blocks = source
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .flatMap((line, index, lines) => {
        const words = line.split(/\s+/).filter(Boolean);
        const duration = Math.max(2, Math.min(8, words.length / 2.4));
        const start = index * 3;
        return [
          {
            start,
            end: start + duration,
            text: line,
          },
          ...(!lines[index + 1] ? [] : []),
        ];
      });

    const content = blocks
      .map((block, index) => {
        if (format === "vtt") {
          return [
            `${index + 1}`,
            `${formatTimecode(block.start)} --> ${formatTimecode(block.end)}`,
            block.text,
            "",
          ].join("\n");
        }

        return [
          `${index + 1}`,
          `${formatTimecode(block.start, true)} --> ${formatTimecode(block.end, true)}`,
          block.text,
          "",
        ].join("\n");
      })
      .join("\n");

    download(
      format === "srt" ? "transcript.srt" : "transcript.vtt",
      format === "vtt" ? `WEBVTT\n\n${content}` : content,
    );
  };

  const save = () => {
    const next = { ...current, text };
    storageService
      .saveTranscript(next)
      .then(() => onSaved(next))
      .catch(() => undefined);
  };
  return (
    <div className="editor-layout">
      <aside className="document-list">
        <div className="list-head">
          <span className="eyebrow">Saved text</span>
          <button className="icon-button">
            <Search size={16} />
          </button>
        </div>
        <input
          className="search-input"
          placeholder="Search transcripts"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        {transcripts
          .filter((item) =>
            item.title.toLowerCase().includes(search.toLowerCase()),
          )
          .map((item) => (
            <button
              className={
                selected?.id === item.id
                  ? "document-item selected"
                  : "document-item"
              }
              key={item.id}
              onClick={() => setSelected(item)}
            >
              <FileText size={16} />
              <span>
                <strong>{item.title}</strong>
                <small>{new Date(item.createdAt).toLocaleDateString()}</small>
              </span>
            </button>
          ))}
        {!transcripts.length && (
          <p className="muted list-empty">No saved transcripts yet.</p>
        )}
      </aside>
      <section className="editor-panel">
        <div className="editor-head">
          <div>
            <span className="eyebrow">{current.language}</span>
            <h2>{current.title}</h2>
          </div>
          <button className="primary-button compact" onClick={save}>
            <Check size={15} /> Save
          </button>
        </div>
        <div className="editor-toolbar">
          <button onClick={() => navigator.clipboard?.writeText(text)}>
            <Clipboard size={15} /> Copy
          </button>
          <button onClick={() => setText("")}>
            <Trash2 size={15} /> Clear
          </button>
          <button onClick={() => generateSubtitleFile("srt")} disabled={!text.trim()}>
            <Download size={15} /> SRT
          </button>
          <button onClick={() => generateSubtitleFile("vtt")} disabled={!text.trim()}>
            <Download size={15} /> VTT
          </button>
          <button onClick={() => download("transcript.txt", text)}>
            <Download size={15} /> TXT
          </button>
          <button
            onClick={() =>
              download("transcript.json", JSON.stringify(current, null, 2))
            }
          >
            <Download size={15} /> JSON
          </button>
        </div>
        <textarea
          className="transcript-editor"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Your transcript will live here..."
        />
        <div className="editor-footer">
          <span>{text.trim() ? text.trim().split(/\s+/).length : 0} words</span>
          <span>{text.length} characters</span>
          <span>{text.split(/\n+/).filter(Boolean).length} paragraphs</span>
        </div>
      </section>
    </div>
  );
}
function formatTimecode(totalSeconds: number, srt = false) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (srt) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(Math.floor(seconds)).padStart(2, "0")},${String(Math.round((seconds % 1) * 1000)).padStart(3, "0")}`;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds.toFixed(3)).padStart(6, "0")}`;
}

function generateSubtitleText(text: string, format: "srt" | "vtt") {
  const blocks = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!blocks.length) return "";

  const subtitleEntries = blocks.map((line, index) => {
    const words = line.split(/\s+/).filter(Boolean);
    const start = index * 3;
    const end = start + Math.max(2.2, Math.min(8, words.length / 2.4));
    return { start, end, text: line };
  });

  const body = subtitleEntries
    .map((block, index) => {
      if (format === "vtt") {
        return [
          `${index + 1}`,
          `${formatTimecode(block.start)} --> ${formatTimecode(block.end)}`,
          block.text,
          "",
        ].join("\n");
      }

      return [
        `${index + 1}`,
        `${formatTimecode(block.start, true)} --> ${formatTimecode(block.end, true)}`,
        block.text,
        "",
      ].join("\n");
    })
    .join("\n");

  return format === "vtt" ? `WEBVTT\n\n${body}` : body;
}

function download(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/plain" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function renderSongInstrumental(song: SongProject) {
  const sampleRate = 44100;
  const duration = Math.min(300, Math.max(24, song.targetDuration));
  const sampleCount = Math.floor(sampleRate * duration);
  const samples = new Float32Array(sampleCount);
  const tempo = song.genre === "Hip-hop" ? 92 : song.genre === "Afrobeat" ? 104 : song.genre === "Electronic" ? 118 : 96;
  const beatLength = 60 / tempo;
  const root = song.mood === "uplifting" ? 261.63 : song.mood === "moody" ? 220 : song.mood === "dreamy" ? 246.94 : 233.08;
  const progression = [1, 6, 4, 5];
  const notes = [0, 4, 7, 12, 7, 4, 2, 4];

  for (let index = 0; index < sampleCount; index += 1) {
    const time = index / sampleRate;
    const beat = Math.floor(time / beatLength);
    const bar = Math.floor(beat / 4);
    const chordRoot = root * Math.pow(2, (progression[bar % progression.length] - 1) / 12);
    const note = chordRoot * Math.pow(2, notes[beat % notes.length] / 12);
    const envelope = Math.min(1, time * 8) * Math.min(1, (duration - time) * 8);
    const pad = Math.sin(2 * Math.PI * chordRoot * time) * 0.12 + Math.sin(2 * Math.PI * chordRoot * 1.5 * time) * 0.06;
    const lead = Math.sin(2 * Math.PI * note * time) * 0.16;
    const kickPhase = (time % (beatLength * 2)) / (beatLength * 2);
    const kick = Math.sin(2 * Math.PI * (90 - kickPhase * 55) * time) * Math.max(0, 1 - kickPhase) * 0.18;
    const snarePhase = ((time + beatLength) % (beatLength * 2)) / (beatLength * 2);
    const snare = (Math.random() * 2 - 1) * Math.max(0, 1 - snarePhase * 10) * 0.035;
    samples[index] = Math.max(-1, Math.min(1, (pad + lead + kick + snare) * envelope));
  }

  const dataLength = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);
  const write = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, dataLength, true);
  samples.forEach((sample, index) => view.setInt16(44 + index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true));
  return new Blob([buffer], { type: "audio/wav" });
}

function TTS({ onEditWithAI }: { onEditWithAI: (text: string) => void }) {
  const [text, setText] = useState("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voice, setVoice] = useState("");
  const [language, setLanguage] = useState("en-US");
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const languageVoices = voices.filter((item) =>
    item.lang.toLowerCase().startsWith(language.toLowerCase().split("-")[0]),
  );
  const selectedVoice =
    voices.find((item) => item.name === voice) ??
    languageVoices.find(
      (item) => item.lang.toLowerCase() === language.toLowerCase(),
    ) ??
    languageVoices[0];
  useEffect(() => {
    const update = () => setVoices(window.speechSynthesis?.getVoices() ?? []);
    update();
    window.speechSynthesis?.addEventListener("voiceschanged", update);
    return () =>
      window.speechSynthesis?.removeEventListener("voiceschanged", update);
  }, []);
  useEffect(() => {
    setVoice("");
  }, [language]);
  const speak = () => {
    if (!selectedVoice) return;
    textToSpeechService.speak(text, {
      voice: selectedVoice,
      rate,
      pitch,
      volume: 1,
      language,
    });
  };
  return (
    <div className="tool-layout">
      <section className="tool-main">
        <div className="tool-title">
          <span className="eyebrow">Voice synthesis</span>
          <h2>Give your words a voice.</h2>
          <p>
            Choose a voice in the same language as your text for clearer
            pronunciation.
          </p>
        </div>
        <textarea
          className="large-input"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Write something to listen to..."
        />
        <div className="tool-actions">
          <button
            className="primary-button"
            onClick={speak}
            disabled={!selectedVoice || !text.trim()}
          >
            <Play size={17} /> Play voice
          </button>
          <button
            className="secondary-button"
            onClick={textToSpeechService.pause}
          >
            <Pause size={16} /> Pause
          </button>
          <button
            className="secondary-button"
            onClick={textToSpeechService.stop}
          >
            <Square size={14} /> Stop
          </button>
          <button
            className="secondary-button"
            onClick={() => download("silencio-text.txt", text)}
            disabled={!text.trim()}
          >
            <Download size={15} /> Download text
          </button>
          <button
            className="secondary-button"
            onClick={() => download("silencio-subtitles.srt", generateSubtitleText(text, "srt"))}
            disabled={!text.trim()}
          >
            <Download size={15} /> Generate SRT
          </button>
          <button
            className="secondary-button"
            onClick={() => download("silencio-subtitles.vtt", generateSubtitleText(text, "vtt"))}
            disabled={!text.trim()}
          >
            <Download size={15} /> Generate VTT
          </button>
          <button
            className="secondary-button"
            onClick={() => onEditWithAI(text)}
            disabled={!text.trim()}
          >
            <BrainCircuit size={15} /> Edit with AI tools
          </button>
        </div>
        <div className="notice">
          Browser voices can play locally, but native speech synthesis does not
          expose the generated audio as a downloadable file. Connect a
          server-side TTS provider later to enable real audio export.
        </div>
      </section>
      <section className="settings-card">
        <div className="block-title">
          <div>
            <span className="eyebrow">Voice preview</span>
            <h3>Playback controls</h3>
          </div>
          <Volume2 size={18} />
        </div>
        {!voices.length && (
          <div className="notice">
            No voices are available yet. Your browser may load voices shortly.
          </div>
        )}
        <label>
          Language
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
          >
            {languages.map((item) => (
              <option key={item.code} value={item.code}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Voice
          <select
            value={voice}
            onChange={(event) => setVoice(event.target.value)}
          >
            <option value="">
              Best available{" "}
              {languages.find((item) => item.code === language)?.label} voice
            </option>
            {languageVoices.map((item) => (
              <option value={item.name} key={`${item.name}-${item.lang}`}>
                {item.name} · {item.lang}
              </option>
            ))}
          </select>
        </label>
        {voices.length > 0 && !languageVoices.length && (
          <div className="notice">
            This device has no installed{" "}
            {languages.find((item) => item.code === language)?.label} voice.
            Install a voice pack or choose another language; Silencio will not
            pretend an English voice is the selected language.
          </div>
        )}
        <Range
          label="Speed"
          value={rate}
          min={0.5}
          max={2}
          step={0.1}
          setValue={setRate}
        />
        <Range
          label="Pitch"
          value={pitch}
          min={0}
          max={2}
          step={0.1}
          setValue={setPitch}
        />
      </section>
    </div>
  );
}
function Range({
  label,
  value,
  min,
  max,
  step,
  setValue,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  setValue: (value: number) => void;
}) {
  return (
    <label className="range-label">
      <span>
        {label}
        <b>{value.toFixed(1)}</b>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => setValue(Number(event.target.value))}
      />
    </label>
  );
}

function Recordings({
  recordings,
  setRecordings,
  recordActivity,
}: {
  recordings: Recording[];
  setRecordings: (items: Recording[]) => void;
  recordActivity: (type: ActivityEntry["type"], message: string) => void;
}) {
  const [query, setQuery] = useState("");
  const visible = recordings.filter((item) =>
    item.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="library">
      <div className="library-toolbar">
        <div>
          <span className="eyebrow">Local library</span>
          <h2>Recordings</h2>
        </div>
        <div className="search-wrap">
          <Search size={16} />
          <input
            placeholder="Search recordings"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>
      {visible.length ? (
        <div className="library-grid">
          {visible.map((item) => (
            <article className="library-card" key={item.id}>
              <div className="card-top">
                <span className="file-icon">
                  <FileAudio size={20} />
                </span>
                <button
                  className="icon-button"
                  aria-label="Delete recording"
                  onClick={() =>
                    storageService
                      .deleteRecording(item.id)
                      .then(() => {
                        setRecordings(
                          recordings.filter(
                            (recording) => recording.id !== item.id,
                          ),
                        );
                        recordActivity("recording", `Deleted recording: ${item.name}`);
                      })
                  }
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <h3>{item.name}</h3>
              <p>
                {new Date(item.createdAt).toLocaleDateString()} ·{" "}
                {item.language}
              </p>
              <div className="card-wave">
                <Waveform />
              </div>
              <AudioPlayer recording={item} />
              <div className="card-footer">
                <span>{formatTime(item.duration)}</span>
                <span>{(item.size / 1024).toFixed(0)} KB</span>
                <span className="support-badge supported">
                  {item.transcriptionStatus === "complete"
                    ? "Transcribed"
                    : "Raw audio"}
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          icon={FileAudio}
          title="No recordings yet"
          text="Your local recordings will appear here."
        />
      )}
    </div>
  );
}
function HistoryPage({
  transcripts,
  setTranscripts,
  recordActivity,
}: {
  transcripts: Transcript[];
  setTranscripts: Dispatch<SetStateAction<Transcript[]>>;
  recordActivity: (type: ActivityEntry["type"], message: string) => void;
}) {
  return (
    <div className="library">
      <div className="library-toolbar">
        <div>
          <span className="eyebrow">Your words</span>
          <h2>Transcript history</h2>
        </div>
        <span className="support-badge supported">
          {transcripts.length} saved
        </span>
      </div>
      {transcripts.length ? (
        <div className="history-list">
          {transcripts.map((item) => (
            <article className="history-item" key={item.id}>
              <span className="file-icon">
                <FileText size={18} />
              </span>
              <span>
                <strong>{item.title}</strong>
                <small>
                  {new Date(item.createdAt).toLocaleDateString()} ·{" "}
                  {item.text.trim().split(/\s+/).filter(Boolean).length} words
                </small>
                <p>{item.text.slice(0, 150) || "Empty transcript"}</p>
              </span>
              <button
                className="icon-button"
                onClick={() =>
                  storageService
                    .deleteTranscript(item.id)
                    .then(() => {
                      setTranscripts(
                        transcripts.filter(
                          (transcript) => transcript.id !== item.id,
                        ),
                      );
                      recordActivity("transcript", `Deleted transcript: ${item.title}`);
                    })
                }
              >
                <Trash2 size={15} />
              </button>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          icon={FileText}
          title="No transcripts yet"
          text="Save a recording with live transcription to see it here."
        />
      )}
    </div>
  );
}

function ProjectsPage({
  projects,
  setProjects,
  recordActivity,
}: {
  projects: Project[];
  setProjects: Dispatch<SetStateAction<Project[]>>;
  recordActivity: (type: ActivityEntry["type"], message: string) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const createProject = () => {
    const next = {
      id: uid(),
      name: name.trim() || `Project ${projects.length + 1}`,
      description: description.trim() || "Local project workspace",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      favorite: false,
    };
    setProjects((current) => [next, ...current]);
    storageService.saveProject(next).catch(() => undefined);
    recordActivity("project", `Created project: ${next.name}`);
    setName("");
    setDescription("");
  };
  return (
    <div className="library">
      <div className="library-toolbar">
        <div>
          <span className="eyebrow">Local workspace</span>
          <h2>Projects</h2>
        </div>
        <button className="primary-button compact" onClick={createProject}>
          New project
        </button>
      </div>
      <div className="settings-grid">
        <section className="settings-card">
          <h3>Create project</h3>
          <label>
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
        </section>
        <section className="settings-card">
          <h3>Projects</h3>
          {projects.length ? (
            <div className="history-list">
              {projects.map((project) => (
                <article className="history-item" key={project.id}>
                  <span className="file-icon">
                    <Folder size={16} />
                  </span>
                  <span>
                    <strong>{project.name}</strong>
                    <small>
                      {new Date(project.createdAt).toLocaleDateString()}
                    </small>
                    <p>{project.description}</p>
                  </span>
                  <button
                    className="icon-button"
                    onClick={() => {
                      setProjects((current) => current.filter((item) => item.id !== project.id));
                      storageService.deleteProject(project.id).catch(() => undefined);
                      recordActivity("project", `Deleted project: ${project.name}`);
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <p className="muted">No local projects yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function AudioConverterPage() {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [outputFormat, setOutputFormat] = useState<"wav" | "webm">("wav");
  const [convertedUrl, setConvertedUrl] = useState<string | null>(null);
  const [status, setStatus] = useState("Choose a local audio file to convert.");
  const convertFile = async () => {
    if (!sourceFile) return;
    if (outputFormat !== "wav") {
      setStatus("This browser build supports WAV conversion locally. Other formats require a dedicated encoder or server-side conversion.");
      return;
    }
    try {
      const arrayBuffer = await sourceFile.arrayBuffer();
      const audioContext = new AudioContext();
      const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));
      const wavBlob = audioBufferToWav(decoded);
      const url = URL.createObjectURL(wavBlob);
      setConvertedUrl(url);
      setStatus("Conversion complete. WAV output is ready for preview and download.");
    } catch (error) {
      setStatus(`Conversion unavailable: ${(error as Error).message}`);
      setConvertedUrl(null);
    }
  };

  const audioBufferToWav = (audioBuffer: AudioBuffer) => {
    const channels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length * channels * 2;
    const buffer = new ArrayBuffer(44 + length);
    const view = new DataView(buffer);
    const writeString = (offset: number, text: string) => {
      for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
    };
    writeString(0, "RIFF");
    view.setUint32(4, 36 + length, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * channels * 2, true);
    view.setUint16(32, channels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, length, true);
    let offset = 44;
    const channelData = Array.from({ length: channels }, (_, index) => audioBuffer.getChannelData(index));
    for (let i = 0; i < audioBuffer.length; i += 1) {
      for (let channel = 0; channel < channels; channel += 1) {
        const sample = Math.max(-1, Math.min(1, channelData[channel][i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
        offset += 2;
      }
    }
    return new Blob([buffer], { type: "audio/wav" });
  };

  return (
    <div className="tool-layout">
      <section className="tool-main">
        <div className="tool-title">
          <span className="eyebrow">Audio conversion</span>
          <h2>Convert local audio files.</h2>
        </div>
        <input
          type="file"
          accept="audio/*"
          onChange={(event) => setSourceFile(event.target.files?.[0] ?? null)}
        />
        <label>
          Output format
          <select value={outputFormat} onChange={(event) => setOutputFormat(event.target.value as "wav" | "webm")}>
            <option value="wav">WAV (local conversion)</option>
            <option value="webm">WebM (limited / browser-dependent)</option>
          </select>
        </label>
        <div className="tool-actions">
          <button className="primary-button" onClick={convertFile} disabled={!sourceFile}>
            Convert file
          </button>
          {convertedUrl && (
            <a className="secondary-button" href={convertedUrl} download="converted-audio.wav">
              Download result
            </a>
          )}
        </div>
        <p className="notice">{status}</p>
        {convertedUrl && (
          <audio controls src={convertedUrl} style={{ width: "100%" }} />
        )}
      </section>
    </div>
  );
}

function ExportCenterPage({
  exportRecords,
  setExportRecords,
}: {
  exportRecords: ExportRecord[];
  setExportRecords: Dispatch<SetStateAction<ExportRecord[]>>;
}) {
  return (
    <div className="library">
      <div className="library-toolbar">
        <div>
          <span className="eyebrow">Downloads</span>
          <h2>Export center</h2>
        </div>
        <span className="support-badge supported">{exportRecords.length} recent</span>
      </div>
      {exportRecords.length ? (
        <div className="history-list">
          {exportRecords.map((item) => (
            <article className="history-item" key={item.id}>
              <span className="file-icon">
                <Download size={16} />
              </span>
              <span>
                <strong>{item.name}</strong>
                <small>
                  {item.format} · {new Date(item.createdAt).toLocaleDateString()} · {item.status}
                </small>
                <p>{item.type} export · {Math.max(0, item.size)} bytes</p>
              </span>
              <button
                className="icon-button"
                onClick={() => setExportRecords((current) => current.filter((entry) => entry.id !== item.id))}
              >
                <Trash2 size={15} />
              </button>
            </article>
          ))}
        </div>
      ) : (
        <Empty icon={Download} title="No exports yet" text="Your recent downloads and exports will appear here." />
      )}
    </div>
  );
}

function StoragePage({
  recordings,
  transcripts,
  projects,
  songs,
  setRecordings,
  setTranscripts,
  setProjects,
  setSongs,
  setActivities,
  setExportRecords,
}: {
  recordings: Recording[];
  transcripts: Transcript[];
  projects: Project[];
  songs: SongProject[];
  setRecordings: Dispatch<SetStateAction<Recording[]>>;
  setTranscripts: Dispatch<SetStateAction<Transcript[]>>;
  setProjects: Dispatch<SetStateAction<Project[]>>;
  setSongs: Dispatch<SetStateAction<SongProject[]>>;
  setActivities: Dispatch<SetStateAction<ActivityEntry[]>>;
  setExportRecords: Dispatch<SetStateAction<ExportRecord[]>>;
}) {
  const totalBytes = recordings.reduce((sum, item) => sum + item.size, 0) + transcripts.reduce((sum, item) => sum + item.text.length * 2, 0);
  return (
    <div className="library">
      <div className="library-toolbar">
        <div>
          <span className="eyebrow">Browser storage</span>
          <h2>Storage management</h2>
        </div>
        <span className="support-badge supported">{(totalBytes / 1024 / 1024).toFixed(2)} MB used</span>
      </div>
      <div className="stats-grid">
        <Stat icon={FileAudio} label="Recordings" value={String(recordings.length).padStart(2, "0")} trend="In IndexedDB" />
        <Stat icon={FileText} label="Transcripts" value={String(transcripts.length).padStart(2, "0")} trend="Saved locally" />
        <Stat icon={Folder} label="Projects" value={String(projects.length).padStart(2, "0")} trend="Folders and workspaces" />
        <Stat icon={Waves} label="Songs" value={String(songs.length).padStart(2, "0")} trend="Song Studio" />
        <Stat icon={Database} label="Browser" value="Local" trend="IndexedDB only" />
      </div>
      <div className="settings-grid">
        <section className="settings-card">
          <h3>Destructive actions</h3>
          <button className="danger-button" onClick={() => { if (window.confirm("Clear all recordings?")) { storageService.clearRecordings().catch(() => undefined); setRecordings([]); } }}>Clear recordings</button>
          <button className="danger-button" onClick={() => { if (window.confirm("Clear all transcripts?")) { storageService.clearTranscripts().catch(() => undefined); setTranscripts([]); } }}>Clear transcripts</button>
          <button className="danger-button" onClick={() => { if (window.confirm("Clear all projects?")) { storageService.clearProjects().catch(() => undefined); setProjects([]); } }}>Clear projects</button>
          <button className="danger-button" onClick={() => { if (window.confirm("Clear all songs?")) { storageService.clearSongs().catch(() => undefined); setSongs([]); } }}>Clear songs</button>
          <button className="danger-button" onClick={() => { if (window.confirm("Clear all export history?")) { storageService.clearExports().catch(() => undefined); setExportRecords([]); } }}>Clear exports</button>
          <button className="danger-button" onClick={() => { if (window.confirm("Clear all activity log?")) { storageService.clearActivities().catch(() => undefined); setActivities([]); } }}>Clear activity</button>
        </section>
        <section className="settings-card">
          <h3>Backup</h3>
          <button className="secondary-button" onClick={async () => { const backup = await storageService.exportBackup(); const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'silencio-backup.json'; link.click(); URL.revokeObjectURL(url); }}>Export backup</button>
          <p className="muted">Local backup uses IndexedDB data and browser-only storage when available.</p>
        </section>
      </div>
    </div>
  );
}

function VoiceEffectsPage() {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [status, setStatus] = useState("Choose a local audio file to process.");
  const [settings, setSettings] = useState({
    gain: 1.1,
    bass: 0,
    treble: 0,
    echo: 0.1,
    lowPass: 18000,
    highPass: 20,
  });

  useEffect(() => {
    return () => {
      if (processedUrl) URL.revokeObjectURL(processedUrl);
    };
  }, [processedUrl]);

  const updateSetting = <K extends keyof typeof settings>(
    key: K,
    value: (typeof settings)[K],
  ) => setSettings((current) => ({ ...current, [key]: value }));

  const renderToWav = (audioBuffer: AudioBuffer) => {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1;
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numberOfChannels * bytesPerSample;
    const dataLength = audioBuffer.length * blockAlign;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);

    const writeString = (offset: number, text: string) => {
      for (let i = 0; i < text.length; i += 1) {
        view.setUint8(offset + i, text.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, "data");
    view.setUint32(40, dataLength, true);

    let offset = 44;
    const channelData = Array.from({ length: numberOfChannels }, (_, index) =>
      audioBuffer.getChannelData(index),
    );

    for (let i = 0; i < audioBuffer.length; i += 1) {
      for (let channel = 0; channel < numberOfChannels; channel += 1) {
        const value = Math.max(-1, Math.min(1, channelData[channel][i]));
        view.setInt16(offset, value < 0 ? value * 0x8000 : value * 0x7fff, true);
        offset += 2;
      }
    }

    return new Blob([buffer], { type: "audio/wav" });
  };

  const applyEffects = async () => {
    if (!sourceFile) {
      setStatus("Please choose an audio file to process.");
      return;
    }

    try {
      const audioContext = new AudioContext();
      const arrayBuffer = await sourceFile.arrayBuffer();
      const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));

      const offlineContext = new OfflineAudioContext(
        decoded.numberOfChannels,
        decoded.length,
        decoded.sampleRate,
      );

      const source = offlineContext.createBufferSource();
      source.buffer = decoded;

      const gainNode = offlineContext.createGain();
      gainNode.gain.value = settings.gain;

      const bassNode = offlineContext.createBiquadFilter();
      bassNode.type = "lowshelf";
      bassNode.frequency.value = 200;
      bassNode.gain.value = settings.bass;

      const trebleNode = offlineContext.createBiquadFilter();
      trebleNode.type = "highshelf";
      trebleNode.frequency.value = 3000;
      trebleNode.gain.value = settings.treble;

      const lowPassNode = offlineContext.createBiquadFilter();
      lowPassNode.type = "lowpass";
      lowPassNode.frequency.value = settings.lowPass;
      lowPassNode.Q.value = 0.5;

      const highPassNode = offlineContext.createBiquadFilter();
      highPassNode.type = "highpass";
      highPassNode.frequency.value = settings.highPass;
      highPassNode.Q.value = 0.5;

      const delayNode = offlineContext.createDelay(1.5);
      delayNode.delayTime.value = 0.18;
      const feedbackNode = offlineContext.createGain();
      feedbackNode.gain.value = settings.echo;
      const echoMix = offlineContext.createGain();
      echoMix.gain.value = settings.echo;

      const convolver = offlineContext.createConvolver();
      const impulse = offlineContext.createBuffer(
        1,
        offlineContext.sampleRate * 2,
        offlineContext.sampleRate,
      );
      const impulseData = impulse.getChannelData(0);
      for (let i = 0; i < impulseData.length; i += 1) {
        impulseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / impulseData.length, 2);
      }
      convolver.buffer = impulse;
      const reverbGain = offlineContext.createGain();
      reverbGain.gain.value = settings.echo > 0 ? settings.echo * 0.5 : 0;

      source.connect(bassNode);
      bassNode.connect(trebleNode);
      trebleNode.connect(highPassNode);
      highPassNode.connect(lowPassNode);
      lowPassNode.connect(gainNode);
      gainNode.connect(offlineContext.destination);

      gainNode.connect(delayNode);
      delayNode.connect(feedbackNode);
      feedbackNode.connect(delayNode);
      delayNode.connect(echoMix);
      echoMix.connect(offlineContext.destination);

      gainNode.connect(convolver);
      convolver.connect(reverbGain);
      reverbGain.connect(offlineContext.destination);

      source.start(0);
      const rendered = await offlineContext.startRendering();
      const wavBlob = renderToWav(rendered);
      const url = URL.createObjectURL(wavBlob);
      setProcessedUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return url;
      });
      setStatus("Effects applied successfully. Preview and download the processed WAV output.");
      await audioContext.close();
    } catch (error) {
      setStatus(`Audio processing unavailable: ${(error as Error).message}`);
    }
  };

  const previewUrl = processedUrl ?? (sourceFile ? URL.createObjectURL(sourceFile) : "");

  return (
    <div className="tool-layout">
      <section className="tool-main">
        <div className="tool-title">
          <span className="eyebrow">Voice effects studio</span>
          <h2>Shape the tone of your recording.</h2>
          <p>
            This process uses browser-native Web Audio APIs and exports a real WAV file when supported.
          </p>
        </div>
        <input
          type="file"
          accept="audio/*,video/*"
          onChange={(event) => setSourceFile(event.target.files?.[0] ?? null)}
        />
        <div className="tool-actions">
          <button className="primary-button" onClick={applyEffects} disabled={!sourceFile}>
            <Volume2 size={16} /> Apply effects
          </button>
          {processedUrl && (
            <a className="secondary-button" href={processedUrl} download="silencio-processed.wav">
              <Download size={15} /> Download WAV
            </a>
          )}
        </div>
        <p className="notice">{status}</p>
        {previewUrl && (
          <audio controls src={previewUrl} style={{ width: "100%" }} />
        )}
      </section>
      <section className="settings-card">
        <div className="block-title">
          <div>
            <span className="eyebrow">Processing</span>
            <h3>Effect controls</h3>
          </div>
          <Volume2 size={18} />
        </div>
        <Range label="Volume" value={settings.gain} min={0.4} max={1.8} step={0.1} setValue={(value) => updateSetting("gain", value)} />
        <Range label="Bass" value={settings.bass} min={-12} max={12} step={1} setValue={(value) => updateSetting("bass", value)} />
        <Range label="Treble" value={settings.treble} min={-12} max={12} step={1} setValue={(value) => updateSetting("treble", value)} />
        <Range label="Echo" value={settings.echo} min={0} max={0.8} step={0.05} setValue={(value) => updateSetting("echo", value)} />
        <Range label="Low pass" value={settings.lowPass} min={500} max={20000} step={100} setValue={(value) => updateSetting("lowPass", value)} />
        <Range label="High pass" value={settings.highPass} min={20} max={4000} step={20} setValue={(value) => updateSetting("highPass", value)} />
      </section>
    </div>
  );
}

function AITools({ initialText = "" }: { initialText?: string }) {
  const [text, setText] = useState(initialText);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const run = async (action: AIAction) => {
    setLoading(true);
    try {
      setResult(await aiService.process(text, action));
    } catch {
      setResult("Add some transcript text before processing.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="ai-layout">
      <section className="ai-column">
        <span className="eyebrow">Original transcript</span>
        <h2>Keep the raw signal.</h2>
        <textarea
          className="large-input"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Paste or write a transcript to process..."
        />
      </section>
      <section className="ai-column result-column">
        <div className="result-head">
          <div>
            <span className="eyebrow">AI result</span>
            <h2>Shape the meaning.</h2>
          </div>
          <span className="demo-badge">Demo mode</span>
        </div>
        <div className="result-box">
          {loading ? (
            <div className="loading">
              <span className="spinner" /> Processing...
            </div>
          ) : (
            result || (
              <span className="muted">
                Choose an action to generate a separate result.
              </span>
            )
          )}
        </div>
        <div className="ai-actions">
          {(
            [
              "summarize",
              "key-points",
              "notes",
              "grammar",
              "actions",
              "explain",
            ] as AIAction[]
          ).map((action) => (
            <button
              key={action}
              className="secondary-button"
              onClick={() => run(action)}
            >
              <BrainCircuit size={14} /> {action.replace("-", " ")}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function SongStudioPage({
  songs,
  setSongs,
  recordActivity,
}: {
  songs: SongProject[];
  setSongs: Dispatch<SetStateAction<SongProject[]>>;
  recordActivity: (type: ActivityEntry["type"], message: string) => void;
}) {
  const [draftTitle, setDraftTitle] = useState("My song");
  const [draftArtist, setDraftArtist] = useState("Independent artist");
  const [draftGenre, setDraftGenre] = useState("Alternative");
  const [draftMood, setDraftMood] = useState("cinematic");
  const [draftLanguage, setDraftLanguage] = useState("English");
  const [draftAudience, setDraftAudience] = useState("independent listeners");
  const [draftDuration, setDraftDuration] = useState(120);
  const [draftSpokenWords, setDraftSpokenWords] = useState("");
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [editorLyrics, setEditorLyrics] = useState("");
  const [editorNotes, setEditorNotes] = useState("");
  const [editorSubtitles, setEditorSubtitles] = useState("");
  const [editorSections, setEditorSections] = useState<SongSection[]>([]);
  const [editorTracks, setEditorTracks] = useState<SongTrack[]>([]);
  const [isVocalRecording, setIsVocalRecording] = useState(false);
  const vocalRecorder = useRef<MediaRecorder | null>(null);
  const vocalChunks = useRef<Blob[]>([]);
  const [draftIdea, setDraftIdea] = useState(
    "A late-night introspective anthem with warm vocals, floating chords, and a spacious chorus.",
  );

  const createSong = () => {
    const title = draftTitle.trim() || `Song ${songs.length + 1}`;
    const artist = draftArtist.trim() || "Independent artist";
    const idea = draftIdea.trim() || "A story waiting to be sung.";
    const hook = `${title}, we are still becoming`; 
    const spokenWords = draftSpokenWords.trim() || "Speak your truth slowly; let the room make space for it.";
    const generatedLyrics = `[Spoken Word]\n${spokenWords}\n\n[Verse 1]\nI carried the quiet through the neon glow\nFound a little truth in the aftershow\nEvery open door had a different name\nBut the pulse in my chest stayed the same\n\n[Pre-Chorus]\nIf the night gets heavy, let it roll\nThere is a bright line running through the soul\n\n[Chorus]\n${hook}\nTurn the dark into a place we know\n${hook}\nLet the honest rhythm take control\n\n[Verse 2]\nWe were making maps from a borrowed flame\nLearning how to lose without losing our aim\nNow the room is wide and the sound is clear\nI can hear the future getting near\n\n[Bridge]\n${spokenWords}\n\n[Outro]\n${hook}`;
    const languageCode = draftLanguage === "English" ? "en-US" : draftLanguage === "Swahili" ? "sw-TZ" : "pt-PT";
    const next: SongProject = {
      id: uid(),
      title,
      artistName: artist,
      genre: draftGenre,
      mood: draftMood,
      language: languageCode,
      description: `${draftMood} ${draftGenre.toLowerCase()} song for ${draftAudience}.`,
      lyrics: generatedLyrics,
      idea,
      targetDuration: draftDuration,
      audience: draftAudience,
      songStructure: [
        {
          id: uid(),
          name: "Intro",
          type: "intro",
          text: idea,
          start: 0,
          end: 8,
          duration: 8,
          color: "#7c3aed",
          collapsed: false,
        },
        {
          id: uid(),
          name: "Verse 1",
          type: "verse",
          text: "Build the story with specific images and a clear emotional turn.",
          start: 8,
          end: 32,
          duration: 24,
          color: "#22c55e",
          collapsed: false,
        },
        {
          id: uid(),
          name: "Chorus",
          type: "chorus",
          text: hook,
          start: 32,
          end: 56,
          duration: 24,
          color: "#f59e0b",
          collapsed: false,
        },
      ],
      tracks: [
        {
          id: uid(),
          name: "Lead vocal",
          type: "lead-vocal",
          volume: 100,
          pan: 0,
          muted: false,
          solo: true,
          loop: false,
          fadeIn: 0,
          fadeOut: 0,
        },
        {
          id: uid(),
          name: "Background music",
          type: "background-music",
          volume: 75,
          pan: 0,
          muted: false,
          solo: false,
          loop: true,
          fadeIn: 0.5,
          fadeOut: 0.5,
        },
      ],
      takes: [],
      subtitles: "WEBVTT\n\n00:00.000 --> 00:04.000\nIntro hook",
      metadata: {
        title,
        artist,
        album: "",
        genre: draftGenre,
        language: languageCode,
        year: new Date().getFullYear().toString(),
        description: `${draftMood} song generated locally from the creative brief.`,
        composer: "",
        songwriter: "",
      },
      notes: `Generated from the concept: ${idea}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "draft",
      currentStep: "idea",
      versionName: "Generated draft v1",
    };

    setSongs((current) => [next, ...current]);
    storageService.saveSongProject(next).catch(() => undefined);
    recordActivity("song", `Created song project: ${next.title}`);
  };

  const removeSong = (id: string) => {
    const song = songs.find((item) => item.id === id);
    if (previewUrls[id]) URL.revokeObjectURL(previewUrls[id]);
    setPreviewUrls((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setSongs((current) => current.filter((item) => item.id !== id));
    storageService.deleteSongProject(id).catch(() => undefined);
    if (song) recordActivity("song", `Deleted song project: ${song.title}`);
  };

  const openSong = (song: SongProject) => {
    setSelectedSongId(song.id);
    setEditorLyrics(song.lyrics);
    setEditorNotes(song.notes);
    setEditorSubtitles(song.subtitles);
    setEditorSections(song.songStructure);
    setEditorTracks(song.tracks);
  };

  const selectedSong = songs.find((song) => song.id === selectedSongId);
  const saveSongEditor = () => {
    if (!selectedSong) return;
    const updated = {
      ...selectedSong,
      lyrics: editorLyrics,
      notes: editorNotes,
      subtitles: editorSubtitles,
      songStructure: editorSections,
      tracks: editorTracks,
      updatedAt: new Date().toISOString(),
      status: "in-progress" as const,
      currentStep: "edit" as const,
    };
    setSongs((current) => current.map((song) => song.id === updated.id ? updated : song));
    storageService.saveSongProject(updated).catch(() => undefined);
    recordActivity("song", `Updated song project: ${updated.title}`);
  };

  const importMusic = (file: File) => {
    if (!selectedSong) return;
    const url = URL.createObjectURL(file);
    setEditorTracks((current) => [
      ...current,
      { id: uid(), name: file.name, type: "background-music", volume: 75, pan: 0, muted: false, solo: false, url, fileName: file.name, loop: false, fadeIn: 0, fadeOut: 0 },
    ]);
  };

  const startVocalRecording = async () => {
    if (!selectedSong) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      vocalChunks.current = [];
      recorder.ondataavailable = (event) => event.data.size && vocalChunks.current.push(event.data);
      recorder.onstop = () => {
        const blob = new Blob(vocalChunks.current, { type: recorder.mimeType || "audio/webm" });
        const url = URL.createObjectURL(blob);
        setEditorTracks((current) => [...current, { id: uid(), name: "Vocal take", type: "lead-vocal", volume: 100, pan: 0, muted: false, solo: false, url, fileName: "vocal-take.webm", loop: false, fadeIn: 0, fadeOut: 0 }]);
        stream.getTracks().forEach((track) => track.stop());
      };
      vocalRecorder.current = recorder;
      recorder.start();
      setIsVocalRecording(true);
    } catch {
      recordActivity("song", "Microphone access was unavailable for the vocal take.");
    }
  };

  const stopVocalRecording = () => {
    vocalRecorder.current?.stop();
    setIsVocalRecording(false);
  };

  const previewSong = (song: SongProject) => {
    const existing = previewUrls[song.id];
    if (existing) return;
    const url = URL.createObjectURL(renderSongInstrumental(song));
    setPreviewUrls((current) => ({ ...current, [song.id]: url }));
  };

  return (
    <div className="library">
      <div className="library-toolbar">
        <div>
          <span className="eyebrow">Creative production</span>
          <h2>Song Studio</h2>
        </div>
        <span className="support-badge supported">{songs.length} song briefs</span>
      </div>

      <div className="settings-grid">
        <section className="settings-card">
          <h3>Start a new song</h3>
          <label>
            Song title
            <input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} />
          </label>
          <label>
            Artist
            <input value={draftArtist} onChange={(event) => setDraftArtist(event.target.value)} />
          </label>
          <label>
            Genre
            <select value={draftGenre} onChange={(event) => setDraftGenre(event.target.value)}>
              <option>Alternative</option>
              <option>Afrobeat</option>
              <option>Pop</option>
              <option>Hip-hop</option>
              <option>R&B</option>
              <option>Electronic</option>
            </select>
          </label>
          <label>
            Mood
            <select value={draftMood} onChange={(event) => setDraftMood(event.target.value)}>
              <option value="cinematic">Cinematic</option>
              <option value="uplifting">Uplifting</option>
              <option value="moody">Moody</option>
              <option value="dreamy">Dreamy</option>
              <option value="energetic">Energetic</option>
            </select>
          </label>
          <label>
            Language
            <select value={draftLanguage} onChange={(event) => setDraftLanguage(event.target.value)}>
              <option>English</option>
              <option>Swahili</option>
              <option>Portuguese</option>
            </select>
          </label>
          <label>
            Audience
            <input value={draftAudience} onChange={(event) => setDraftAudience(event.target.value)} />
          </label>
          <label>
            Song length
            <select value={draftDuration} onChange={(event) => setDraftDuration(Number(event.target.value))}>
              <option value={30}>30 seconds</option>
              <option value={60}>1 minute</option>
              <option value={120}>2 minutes</option>
              <option value={180}>3 minutes</option>
              <option value={240}>4 minutes</option>
              <option value={300}>5 minutes</option>
            </select>
          </label>
          <label>
            Creative idea
            <textarea
              value={draftIdea}
              onChange={(event) => setDraftIdea(event.target.value)}
              rows={5}
            />
          </label>
          <label>
            Words to speak or sing
            <textarea
              value={draftSpokenWords}
              onChange={(event) => setDraftSpokenWords(event.target.value)}
              placeholder="Enter the exact words you want featured in the spoken-word section..."
              rows={4}
            />
          </label>
          <button className="primary-button" onClick={createSong}>Generate song draft</button>
        </section>

        <section className="settings-card">
          <h3>Production workflow</h3>
          <div className="workflow-list">
            {[
              "Idea + concept",
              "Lyrics and script",
              "Structure builder",
              "Vocal takes",
              "Music import",
              "Mix and subtitle sync",
              "Export and versioning",
            ].map((step) => (
              <div className="workflow-item" key={step}>
                <span className="status-dot green" />
                <span>{step}</span>
              </div>
            ))}
          </div>
          <div className="notice">
            This generates an editable local song draft from your brief. It does not generate audio, imitate a real singer, or claim to be an AI music provider.
          </div>
        </section>
      </div>

      {selectedSong && (
        <section className="song-editor settings-card">
          <div className="library-toolbar">
            <div>
              <span className="eyebrow">Song workspace</span>
              <h3>{selectedSong.title}</h3>
            </div>
            <div className="tool-actions">
              <button className="secondary-button" onClick={() => setSelectedSongId(null)}>Close</button>
              <button className="primary-button" onClick={saveSongEditor}><Check size={15} /> Save project</button>
            </div>
          </div>
          <div className="song-editor-grid">
            <label>
              Lyrics and spoken words
              <textarea className="transcript-editor" value={editorLyrics} onChange={(event) => setEditorLyrics(event.target.value)} />
            </label>
            <label>
              Subtitles (SRT or VTT)
              <textarea className="transcript-editor" value={editorSubtitles} onChange={(event) => setEditorSubtitles(event.target.value)} />
            </label>
            <label>
              Notes and production direction
              <textarea className="transcript-editor" value={editorNotes} onChange={(event) => setEditorNotes(event.target.value)} />
            </label>
          </div>
          <div className="song-section-list">
            <div className="block-title"><h3>Structure timeline</h3><span className="support-badge supported">{editorSections.length} sections</span></div>
            {editorSections.map((section, index) => (
              <div className="song-section-row" key={section.id}>
                <span className="file-icon"><Waves size={15} /></span>
                <input value={section.name} onChange={(event) => setEditorSections((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} />
                <input type="number" min="1" value={section.duration} aria-label={`${section.name} duration in seconds`} onChange={(event) => setEditorSections((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, duration: Number(event.target.value), end: item.start + Number(event.target.value) } : item))} />
                <span className="muted">sec</span>
              </div>
            ))}
          </div>
          <div className="song-track-list">
            <div className="block-title"><h3>Vocals and music</h3><span className="support-badge">Local files only</span></div>
            <div className="tool-actions">
              <button className={isVocalRecording ? "danger-button" : "secondary-button"} onClick={isVocalRecording ? stopVocalRecording : startVocalRecording}>
                {isVocalRecording ? <><Square size={15} /> Stop vocal take</> : <><Mic size={15} /> Record vocal take</>}
              </button>
              <label className="secondary-button">
                <FileAudio size={15} /> Import music
                <input type="file" accept="audio/*" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) importMusic(file); }} />
              </label>
            </div>
            {editorTracks.map((track) => (
              <div className="song-track-row" key={track.id}>
                <strong>{track.name}</strong>
                <span className="muted">{track.type}</span>
                <Range label="Volume" value={track.volume / 100} min={0} max={1} step={0.05} setValue={(value) => setEditorTracks((current) => current.map((item) => item.id === track.id ? { ...item, volume: Math.round(value * 100) } : item))} />
                {track.url && <audio controls preload="metadata" src={track.url} aria-label={`Play ${track.name}`} />}
              </div>
            ))}
          </div>
          <button className="secondary-button" onClick={() => download(`${selectedSong.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "song"}-project.json`, JSON.stringify({ ...selectedSong, lyrics: editorLyrics, notes: editorNotes, subtitles: editorSubtitles, songStructure: editorSections, tracks: editorTracks }, null, 2))}>
            <Download size={15} /> Export project JSON
          </button>
        </section>
      )}

      <div className="library-grid song-project-grid">
        {songs.length ? (
          songs.map((song) => (
            <article className="library-card" key={song.id}>
              <div className="card-top">
                <span className="file-icon">
                  <Waves size={20} />
                </span>
                <button className="icon-button" aria-label="Delete song" onClick={() => removeSong(song.id)}>
                  <Trash2 size={15} />
                </button>
              </div>
              <h3>{song.title}</h3>
              <p>{song.artistName} · {song.mood}</p>
              <div className="card-wave">
                <Waveform />
              </div>
              <div className="card-footer">
                <span>{song.status}</span>
                <span>{song.currentStep}</span>
              </div>
              <button className="secondary-button" onClick={() => openSong(song)}><FileText size={15} /> Open editor</button>
              <p className="muted">{song.idea.slice(0, 120)}{song.idea.length > 120 ? "…" : ""}</p>
              <button className="secondary-button" onClick={() => previewSong(song)}>
                <Play size={15} /> {previewUrls[song.id] ? "Ready to play" : "Generate preview"}
              </button>
              {previewUrls[song.id] && (
                <audio className="song-preview" controls preload="metadata" src={previewUrls[song.id]} aria-label={`Play ${song.title}`} />
              )}
              <button
                className="secondary-button"
                onClick={() => downloadBlob(`${song.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "song"}-instrumental.wav`, renderSongInstrumental(song))}
              >
                <Download size={15} /> Download instrumental WAV
              </button>
            </article>
          ))
        ) : (
          <div className="settings-card" style={{ gridColumn: "1 / -1" }}>
            <h3>No song projects yet</h3>
            <p className="muted">Create your first local song brief to start the production workflow.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Translation() {
  const [source, setSource] = useState("");
  const [result, setResult] = useState("");
  return (
    <div className="translation-page">
      <div className="tool-title">
        <span className="eyebrow">Language bridge</span>
        <h2>Translate with intention.</h2>
        <p>
          Translation is ready for a server-side provider when you connect one.
        </p>
      </div>
      <div className="translation-grid">
        <div>
          <label>
            From
            <select>
              <option>English</option>
              <option>Swahili</option>
              <option>French</option>
            </select>
          </label>
          <textarea
            className="large-input"
            value={source}
            onChange={(event) => setSource(event.target.value)}
            placeholder="Original text"
          />
        </div>
        <div>
          <label>
            To
            <select>
              <option>Swahili</option>
              <option>English</option>
              <option>French</option>
            </select>
          </label>
          <div className="translated-box">
            {result || (
              <span className="muted">
                Your translated text will appear here.
              </span>
            )}
          </div>
        </div>
      </div>
      <button
        className="primary-button"
        onClick={() =>
          setResult(
            source
              ? "[Integration ready] Connect a translation provider to translate this text."
              : "Add source text first.",
          )
        }
      >
        Translate
      </button>
    </div>
  );
}
function SettingsPage({
  settings,
  saveSettings,
}: {
  settings: UserSettings;
  saveSettings: (settings: UserSettings) => void;
}) {
  const update = <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K],
  ) => saveSettings({ ...settings, [key]: value });
  return (
    <div className="settings-page">
      <div className="tool-title">
        <span className="eyebrow">Preferences</span>
        <h2>Make it yours.</h2>
        <p>Settings stay on this device. Cloud sync is not enabled.</p>
      </div>
      <div className="settings-grid">
        <section className="settings-card">
          <h3>Appearance</h3>
          <label>
            Theme
            <select
              value={settings.theme}
              onChange={(event) =>
                update("theme", event.target.value as UserSettings["theme"])
              }
            >
              <option value="dark">Dark mode</option>
              <option value="light">Light mode</option>
            </select>
          </label>
          <label>
            Interface size
            <select
              value={settings.fontSize}
              onChange={(event) =>
                update(
                  "fontSize",
                  event.target.value as UserSettings["fontSize"],
                )
              }
            >
              <option value="small">Compact</option>
              <option value="medium">Comfortable</option>
              <option value="large">Large</option>
            </select>
          </label>
        </section>
        <section className="settings-card">
          <h3>Recording input</h3>
          <Toggle
            label="Noise suppression"
            checked={settings.noiseSuppression}
            setChecked={(value) => update("noiseSuppression", value)}
          />
          <Toggle
            label="Echo cancellation"
            checked={settings.echoCancellation}
            setChecked={(value) => update("echoCancellation", value)}
          />
          <Toggle
            label="Automatic gain"
            checked={settings.autoGainControl}
            setChecked={(value) => update("autoGainControl", value)}
          />
          <p className="settings-note">
            Browser and device support varies. These hints are passed to the
            microphone stream.
          </p>
        </section>
        <section className="settings-card">
          <h3>Transcription</h3>
          <label>
            Recognition language
            <select
              value={settings.language}
              onChange={(event) => update("language", event.target.value)}
            >
              {languages.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <Toggle
            label="Continuous recognition"
            checked={settings.continuous}
            setChecked={(value) => update("continuous", value)}
          />
          <Toggle
            label="Interim results"
            checked={settings.interimResults}
            setChecked={(value) => update("interimResults", value)}
          />
        </section>
        <section className="settings-card">
          <h3>Privacy & capabilities</h3>
          <p className="settings-note">
            Microphone access requires your permission. Audio remains on this
            device unless you explicitly connect a cloud service. A normal
            browser cannot capture protected internal Android audio from another
            app.
          </p>
          <div className="capability">
            <span className="status-dot green" />
            MediaRecorder{" "}
            {typeof MediaRecorder !== "undefined" ? "available" : "unavailable"}
          </div>
          <div className="capability">
            <span
              className={
                getRecognition() ? "status-dot green" : "status-dot red"
              }
            />
            Speech recognition{" "}
            {getRecognition() ? "available" : "not supported here"}
          </div>
          <div className="capability">
            <span className="status-dot green" />
            IndexedDB local storage available
          </div>
        </section>
      </div>
    </div>
  );
}
function Toggle({
  label,
  checked,
  setChecked,
}: {
  label: string;
  checked: boolean;
  setChecked: (value: boolean) => void;
}) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => setChecked(event.target.checked)}
      />
      <i />
    </label>
  );
}

export default App;
