import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Archive,
  ArrowRight,
  BrainCircuit,
  Check,
  ChevronRight,
  CircleHelp,
  Clipboard,
  Download,
  FileAudio,
  FileText,
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
  Page,
  Recording,
  RecordingState,
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
            <Recordings recordings={recordings} setRecordings={setRecordings} />
          )}{" "}
          {page === "history" && (
            <HistoryPage
              transcripts={transcripts}
              setTranscripts={setTranscripts}
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
  setPage,
}: {
  recordings: Recording[];
  transcripts: Transcript[];
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
          {recordings.length === 0 ? (
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
function download(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/plain" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
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
}: {
  recordings: Recording[];
  setRecordings: (items: Recording[]) => void;
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
                      .then(() =>
                        setRecordings(
                          recordings.filter(
                            (recording) => recording.id !== item.id,
                          ),
                        ),
                      )
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
}: {
  transcripts: Transcript[];
  setTranscripts: (items: Transcript[]) => void;
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
                    .then(() =>
                      setTranscripts(
                        transcripts.filter(
                          (transcript) => transcript.id !== item.id,
                        ),
                      ),
                    )
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
