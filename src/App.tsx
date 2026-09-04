import {
  Check,
  ChevronRight,
  Copy,
  Heart,
  History,
  LogOut,
  Undo2,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useMotionValue, useTransform } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Choice, NameFilter, NameOption, Room } from "./types";
import {
  createLiveRoom,
  appendNamesToLiveRoom,
  endLiveRoom,
  isFirebaseConfigured,
  joinLiveRoom,
  leaveLiveRoom,
  removeChoice,
  saveChoice,
  subscribeToRoom,
} from "./lib/firebase";
import { fetchNameBatch } from "./lib/names";
import {
  clearActiveSession,
  type ActiveSession,
  readActiveSession,
  saveActiveSession,
} from "./lib/activeSession";
import { forgetPass, latestAvailablePass, rememberPass } from "./lib/passHistory";
import { inviteUrl, matchIds, normalizeRoomCode, originLabel, unmatchedLikeIds } from "./lib/utils";

type HomeMode = "create" | "join";

function passHistoryKey(code: string, uid: string): string {
  return `baby-name-picker-passes:${code}:${uid}`;
}

function readPassHistory(code: string, uid: string): string[] {
  try {
    const value = JSON.parse(sessionStorage.getItem(passHistoryKey(code, uid)) ?? "[]");
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string").slice(-3) : [];
  } catch {
    return [];
  }
}

function writePassHistory(code: string, uid: string, history: string[]): void {
  sessionStorage.setItem(passHistoryKey(code, uid), JSON.stringify(history));
}

function createDemoRoom(names: NameOption[], filter: NameFilter, source: Room["source"]): Room {
  const partnerChoices = demoPartnerChoices(names);
  const now = Date.now();

  return {
    code: "DEMO42",
    createdBy: "you",
    createdAt: now,
    expiresAt: now + 24 * 60 * 60 * 1000,
    filter,
    source,
    names: Object.fromEntries(names.map((name) => [name.id, name])),
    order: names.map((name) => name.id),
    nextPage: 2,
    exhausted: false,
    members: {
      you: { name: "You", joinedAt: now },
      partner: { name: "Alex (demo)", joinedAt: now },
    },
    presence: { you: true, partner: true },
    decisions: { partner: partnerChoices },
  };
}

function demoPartnerChoices(names: NameOption[]): Record<string, Choice> {
  return Object.fromEntries(
    names
      .filter((name) =>
        [...name.name].reduce((total, character) => total + character.charCodeAt(0), 0) % 3 !== 0,
      )
      .map((name) => [name.id, "like" as const]),
  );
}

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <span />
      <span />
    </span>
  );
}

interface HomeProps {
  busy: boolean;
  error: string;
  initialCode: string;
  resumeSession: ActiveSession | null;
  onCreate: (nickname: string, filter: NameFilter) => Promise<void>;
  onJoin: (nickname: string, code: string) => Promise<void>;
  onResume: () => void;
}

function Home({ busy, error, initialCode, resumeSession, onCreate, onJoin, onResume }: HomeProps) {
  const [mode, setMode] = useState<HomeMode>(initialCode ? "join" : "create");
  const [nickname, setNickname] = useState(
    () => sessionStorage.getItem("baby-name-picker-name") ?? resumeSession?.nickname ?? "",
  );
  const [code, setCode] = useState(initialCode);
  const [filter, setFilter] = useState<NameFilter>("all");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!nickname.trim()) return;
    sessionStorage.setItem("baby-name-picker-name", nickname.trim());
    if (mode === "create") await onCreate(nickname.trim(), filter);
    else await onJoin(nickname.trim(), normalizeRoomCode(code));
  };

  return (
    <main className="welcome-shell">
      <header className="welcome-nav">
        <a className="wordmark" href="./" aria-label="Baby Name Picker home">
          <BrandMark />
          <span>Baby Name Picker</span>
        </a>
        <span className={`backend-note ${isFirebaseConfigured ? "is-live" : ""}`}>
          <span /> {isFirebaseConfigured ? "Live rooms ready" : "Local preview"}
        </span>
      </header>

      <section className="welcome-hero">
        <div className="welcome-copy">
          <p className="eyebrow">Baby names, decided together</p>
          <h1>Find the name you both <em>circle.</em></h1>
          <p className="intro">
            Swipe privately through the same list. You’ll only see a name when you both keep it.
          </p>

          {resumeSession && isFirebaseConfigured && !initialCode && (
            <motion.button
              type="button"
              className="resume-session"
              onClick={onResume}
              disabled={busy}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <History size={17} strokeWidth={1.7} />
              <span>
                <small>Continue where you left off</small>
                <strong>Resume room {resumeSession.code}</strong>
              </span>
              <ChevronRight size={18} />
            </motion.button>
          )}

          <form className="session-form" onSubmit={submit}>
            <div className="mode-switch" role="tablist" aria-label="Choose a session action">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "create"}
                className={mode === "create" ? "active" : ""}
                onClick={() => setMode("create")}
              >
                Start a room
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "join"}
                className={mode === "join" ? "active" : ""}
                onClick={() => setMode("join")}
              >
                Join a room
              </button>
            </div>

            <label className="field-label" htmlFor="nickname">What should your partner call you?</label>
            <input
              id="nickname"
              value={nickname}
              maxLength={28}
              autoComplete="nickname"
              placeholder="Your first name"
              onChange={(event) => setNickname(event.target.value)}
              required
            />

            {mode === "create" ? (
              <fieldset className="filter-field">
                <legend>Names to browse</legend>
                <div>
                  {(["all", "female", "male"] as const).map((value) => (
                    <label key={value} className={filter === value ? "selected" : ""}>
                      <input
                        type="radio"
                        name="filter"
                        value={value}
                        checked={filter === value}
                        onChange={() => setFilter(value)}
                      />
                      {value === "all" ? "A mix" : value === "female" ? "Girls" : "Boys"}
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : (
              <>
                <label className="field-label room-code-label" htmlFor="room-code">Six-character room code</label>
                <input
                  id="room-code"
                  className="room-code-input"
                  value={code}
                  inputMode="text"
                  autoCapitalize="characters"
                  autoComplete="off"
                  placeholder="ABC123"
                  minLength={6}
                  maxLength={6}
                  onChange={(event) => setCode(normalizeRoomCode(event.target.value))}
                  required
                />
              </>
            )}

            {error && <p className="form-error" role="alert">{error}</p>}
            {mode === "join" && !isFirebaseConfigured && (
              <p className="form-hint">Connect Firebase to join from another device. Setup is documented in the README.</p>
            )}

            <button
              className="primary-action"
              type="submit"
              disabled={busy || !nickname.trim() || (mode === "join" && (!isFirebaseConfigured || code.length !== 6))}
            >
              {busy ? <span className="loader" aria-label="Loading" /> : mode === "create" ? (isFirebaseConfigured ? "Create room" : "Try the demo") : "Join room"}
              {!busy && <ChevronRight size={19} strokeWidth={1.8} />}
            </button>
          </form>
        </div>

        <div className="hero-deck" aria-label="Example baby name cards">
          <div className="orbit-copy" aria-hidden="true">PASS IN PRIVATE · MATCH TOGETHER · PASS IN PRIVATE · MATCH TOGETHER · </div>
          <div className="sample-card sample-card-back"><span>Elio</span></div>
          <div className="sample-card sample-card-mid"><span>Jude</span></div>
          <div className="sample-card sample-card-front">
            <span className="sample-index">Name 24</span>
            <span className="sample-name">Mara</span>
            <span className="sample-origin">A name with roots in many places</span>
            <svg className="hand-circle" viewBox="0 0 310 150" fill="none" aria-hidden="true">
              <path d="M291 81c-4 39-68 65-143 60C74 137 15 112 18 73 22 31 89 8 164 13c77 5 132 28 127 68Z" />
            </svg>
          </div>
        </div>
      </section>

      <footer className="welcome-footer">
        <span>Two people · one private shortlist</span>
        <span>Names from Random User Generator</span>
      </footer>
    </main>
  );
}

interface NameCardProps {
  name: NameOption;
  index: number;
  onChoose: (choice: Choice) => void;
}

function NameCard({ name, index, onChoose }: NameCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-240, 0, 240], [-9, 0, 9]);
  const keepOpacity = useTransform(x, [20, 110], [0, 1]);
  const passOpacity = useTransform(x, [-110, -20], [1, 0]);

  return (
    <motion.article
      className="name-card"
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.85}
      onDragEnd={(_, info) => {
        if (info.offset.x > 90 || info.velocity.x > 650) onChoose("like");
        else if (info.offset.x < -90 || info.velocity.x < -650) onChoose("pass");
      }}
      initial={{ opacity: 0, y: 28, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 0, scale: 0.94, transition: { duration: 0.18 } }}
      transition={{ type: "spring", stiffness: 340, damping: 30 }}
      whileTap={{ cursor: "grabbing" }}
    >
      <motion.span className="swipe-stamp keep-stamp" style={{ opacity: keepOpacity }}>keep</motion.span>
      <motion.span className="swipe-stamp pass-stamp" style={{ opacity: passOpacity }}>pass</motion.span>
      <div className="card-meta">
        <span>Name {String(index + 1).padStart(2, "0")}</span>
        <span>{name.gender === "female" ? "Girl" : "Boy"}</span>
      </div>
      <div className="name-center">
        <h2 className={name.name.length >= 11 ? "very-long-name" : name.name.length >= 9 ? "long-name" : ""}>{name.name}</h2>
        <p>Found in {originLabel(name.origin)}</p>
      </div>
      <p className="drag-note">Drag the card, or use the buttons below</p>
    </motion.article>
  );
}

interface RoomViewProps {
  room: Room;
  uid: string;
  demo: boolean;
  isLoadingMore: boolean;
  streamError: string;
  recentPassCount: number;
  onChoose: (nameId: string, choice: Choice) => void;
  onBack: () => void;
  onExit: (endForEveryone: boolean) => Promise<void>;
}

function RoomView({ room, uid, demo, isLoadingMore, streamError, recentPassCount, onChoose, onBack, onExit }: RoomViewProps) {
  const [copied, setCopied] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const [celebration, setCelebration] = useState<NameOption | null>(null);
  const observedMatches = useRef<string[] | null>(null);

  const myDecisions = room.decisions?.[uid] ?? {};
  const remainingIds = room.order.filter((id) => !myDecisions[id]);
  const currentId = remainingIds[0];
  const current = currentId ? room.names[currentId] : null;
  const nextNames = remainingIds.slice(1, 3).map((id) => room.names[id]);
  const matches = useMemo(() => matchIds(room), [room]);
  const unmatchedLikes = useMemo(() => unmatchedLikeIds(room, uid), [room, uid]);
  const memberIds = Object.keys(room.members ?? {});
  const onlineCount = Object.keys(room.presence ?? {}).length;
  const isCreator = room.createdBy === uid;
  const completed = room.order.length - remainingIds.length;

  useEffect(() => {
    if (observedMatches.current === null) {
      observedMatches.current = matches;
      return;
    }
    const newMatch = matches.find((id) => !observedMatches.current?.includes(id));
    observedMatches.current = matches;
    if (newMatch) setCelebration(room.names[newMatch]);
  }, [matches, room.names]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (!current || celebration || showExit) return;
      if (event.key === "ArrowLeft") onChoose(current.id, "pass");
      if (event.key === "ArrowRight") onChoose(current.id, "like");
      if (event.key === "Backspace" && recentPassCount) {
        event.preventDefault();
        onBack();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [celebration, current, onBack, onChoose, recentPassCount, showExit]);

  const copyInvite = async () => {
    if (demo) return;
    await navigator.clipboard.writeText(inviteUrl(room.code));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <main className="room-shell">
      <header className="room-nav">
        <a className="wordmark" href="./" onClick={(event) => { event.preventDefault(); setShowExit(true); }}>
          <BrandMark />
          <span>Baby Name Picker</span>
        </a>
        <div className="room-nav-actions">
          <span className="online-state"><i /> {onlineCount} online</span>
          <button className="icon-action" type="button" aria-label="Leave room" data-tooltip="Leave room" onClick={() => setShowExit(true)}>
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {demo && (
        <div className="demo-banner">
          <span><strong>Demo room.</strong> Alex’s sample picks are already in.</span>
          <span>Add Firebase to invite a real partner.</span>
        </div>
      )}

      <section className="room-workspace">
        <aside className="session-panel">
          <div>
            <p className="eyebrow">Your shared room</p>
            <button className="room-code" type="button" onClick={copyInvite} disabled={demo}>
              {room.code}
              {demo ? null : copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
            <p className="room-help">
              {memberIds.length < 2
                ? "Send the invite link to your partner. Your choices stay hidden."
                : `You and ${room.members[memberIds.find((id) => id !== uid) ?? uid]?.name} are choosing independently.`}
            </p>
          </div>

          <section className="pending-picks" aria-labelledby="pending-picks-title">
            <div className="pending-picks-heading">
              <div>
                <p className="eyebrow">Your private shortlist</p>
                <h2 id="pending-picks-title">Names you kept</h2>
              </div>
              <span>{unmatchedLikes.length}</span>
            </div>

            {unmatchedLikes.length ? (
              <ol className="pending-pick-list">
                <AnimatePresence initial={false}>
                  {unmatchedLikes.map((id) => (
                    <motion.li
                      key={id}
                      layout
                      initial={{ opacity: 0, y: 7 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -7 }}
                      transition={{ duration: 0.18 }}
                    >
                      <strong>{room.names[id].name}</strong>
                      <span>Waiting</span>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ol>
            ) : (
              <p className="pending-picks-empty">
                Names you keep will wait here until they become a match.
              </p>
            )}
          </section>

          <div className="session-progress">
            <div className="progress-label">
              <span>Names reviewed</span>
              <strong>{completed}</strong>
            </div>
            <p>
              {remainingIds.length} ready
              {isLoadingMore ? " · finding more…" : " · no repeats"}
            </p>
            {streamError && <p className="stream-error">{streamError}</p>}
          </div>

          <div className="privacy-note">
            <Users size={17} />
            <p><strong>No peeking.</strong> Individual likes and passes are never shown to the other person.</p>
          </div>
        </aside>

        <section className="deck-panel" aria-live="polite">
          {current ? (
            <>
              <div className="deck-stage">
                {nextNames.map((name, index) => (
                  <div className={`card-shadow card-shadow-${index + 1}`} key={name.id} aria-hidden="true" />
                ))}
                <AnimatePresence mode="popLayout">
                  <NameCard
                    key={current.id}
                    name={current}
                    index={room.order.indexOf(current.id)}
                    onChoose={(choice) => onChoose(current.id, choice)}
                  />
                </AnimatePresence>
              </div>
              <div className="decision-actions">
                <button type="button" className="decision-button pass-button" onClick={() => onChoose(current.id, "pass")}>
                  <X size={24} strokeWidth={1.7} />
                  <span>Pass</span>
                  <kbd>←</kbd>
                </button>
                <button type="button" className="decision-button keep-button" onClick={() => onChoose(current.id, "like")}>
                  <Heart size={22} strokeWidth={1.7} />
                  <span>Keep</span>
                  <kbd>→</kbd>
                </button>
              </div>
            </>
          ) : !room.exhausted ? (
            <div className="finished-state stream-waiting">
              <span className="finished-mark"><span className="loader" /></span>
              <p className="eyebrow">The stream is replenishing</p>
              <h2>{isCreator ? "Finding names you haven’t seen." : "Waiting for more names."}</h2>
              <p>{isCreator ? "New names will appear here automatically." : "Keep this page open while the room creator adds the next batch."}</p>
            </div>
          ) : (
            <div className="finished-state">
              <span className="finished-mark"><Check size={30} /></span>
              <p className="eyebrow">Every available name reviewed</p>
              <h2>{matches.length ? "You found a few worth saying twice." : "Now, let the names settle."}</h2>
              <p>The app skipped every repeat and reached the end of its current English-name collection.</p>
              <button type="button" onClick={() => setShowExit(true)}>Finish session <ChevronRight size={17} /></button>
            </div>
          )}
          <button
            type="button"
            className="back-action"
            disabled={!recentPassCount}
            onClick={onBack}
            aria-label={recentPassCount ? `Go back to a recent pass. ${recentPassCount} available.` : "No recent passes to revisit"}
          >
            <Undo2 size={15} strokeWidth={1.8} />
            <span>Back</span>
            <small>{recentPassCount ? `${recentPassCount} recent` : "last 3 passes"}</small>
            <kbd>⌫</kbd>
          </button>
        </section>

        <aside className="matches-panel">
          <div className="matches-heading">
            <div>
              <p className="eyebrow">Names you both kept</p>
              <h2>Your matches</h2>
            </div>
            <span>{matches.length}</span>
          </div>

          {matches.length ? (
            <ol className="match-list">
              {matches.map((id, index) => (
                <motion.li key={id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{room.names[id].name}</strong>
                  <Heart size={15} fill="currentColor" />
                </motion.li>
              ))}
            </ol>
          ) : (
            <div className="empty-matches">
              <span className="empty-heart"><Heart size={23} /></span>
              <p>Mutual favorites will appear here—never individual picks.</p>
            </div>
          )}

          <p className="source-line">
            Deck from {room.source === "randomuser" ? "Random User Generator" : "the offline collection"}
          </p>
        </aside>
      </section>

      <AnimatePresence>
        {celebration && (
          <motion.div className="celebration" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="celebration-ring" initial={{ scale: 0.3, rotate: -12 }} animate={{ scale: 1, rotate: 2 }} transition={{ type: "spring", stiffness: 190, damping: 18 }} />
            <motion.div className="celebration-copy" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.12 }}>
              <Heart size={26} fill="currentColor" />
              <p>It’s a match</p>
              <h2>{celebration.name}</h2>
              <button type="button" onClick={() => setCelebration(null)}>Keep going <ChevronRight size={18} /></button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showExit && (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => setShowExit(false)}>
            <motion.div className="exit-dialog" role="dialog" aria-modal="true" aria-labelledby="exit-title" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }} onMouseDown={(event) => event.stopPropagation()}>
              <button className="dialog-close" type="button" aria-label="Close dialog" onClick={() => setShowExit(false)}><X size={19} /></button>
              <p className="eyebrow">Before you go</p>
              <h2 id="exit-title">{isCreator ? "End this session?" : "Leave this session?"}</h2>
              <p>{isCreator ? "Ending removes the room and its choices for both people." : "Leaving removes your choices from this room."}</p>
              <div className="dialog-actions">
                <button type="button" className="secondary-action" onClick={() => setShowExit(false)}>Keep choosing</button>
                <button type="button" className="danger-action" onClick={() => onExit(isCreator)}>{isCreator ? "End for everyone" : "Leave room"}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function App() {
  const initialCode = normalizeRoomCode(new URLSearchParams(window.location.search).get("room") ?? "");
  const [room, setRoom] = useState<Room | null>(null);
  const [uid, setUid] = useState("");
  const [demo, setDemo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [streamError, setStreamError] = useState("");
  const [passHistory, setPassHistory] = useState<string[]>([]);
  const [resumeSession, setResumeSession] = useState<ActiveSession | null>(() => readActiveSession());
  const requestedPages = useRef(new Set<string>());
  const roomCode = room?.code;

  useEffect(() => {
    if (!roomCode || demo) return;
    return subscribeToRoom(
      roomCode,
      (nextRoom) => {
        if (!nextRoom) {
          clearActiveSession();
          setResumeSession(null);
          setRoom(null);
          setUid("");
          setError("That session has ended.");
          window.history.replaceState({}, "", window.location.pathname);
          return;
        }
        setRoom(nextRoom);
      },
      () => setError("The room lost its connection. Check your network and try again."),
    );
  }, [demo, roomCode]);

  useEffect(() => {
    if (!roomCode || !uid) {
      setPassHistory([]);
      return;
    }
    setPassHistory(readPassHistory(roomCode, uid));
  }, [roomCode, uid]);

  useEffect(() => {
    if (!room || !uid || room.exhausted || room.createdBy !== uid) return;

    const mostReviewed = Math.max(
      0,
      ...Object.values(room.decisions ?? {}).map((choices) => Object.keys(choices).length),
    );
    const namesReadyForFastestPerson = room.order.length - mostReviewed;
    if (namesReadyForFastestPerson > 12) return;

    const page = room.nextPage ?? 2;
    const requestKey = `${room.code}:${page}`;
    if (requestedPages.current.has(requestKey)) return;
    requestedPages.current.add(requestKey);
    setIsLoadingMore(true);
    setStreamError("");

    const replenish = async () => {
      try {
        if (demo) {
          const batch = await fetchNameBatch(
            room.filter,
            room.code,
            page,
            Object.values(room.names).map(({ name }) => name),
          );
          const partnerChoices = demoPartnerChoices(batch.names);
          setRoom((currentRoom) => currentRoom ? {
            ...currentRoom,
            names: {
              ...currentRoom.names,
              ...Object.fromEntries(batch.names.map((name) => [name.id, name])),
            },
            order: [...currentRoom.order, ...batch.names.map((name) => name.id)],
            nextPage: batch.nextPage,
            exhausted: batch.exhausted,
            decisions: {
              ...currentRoom.decisions,
              partner: { ...currentRoom.decisions?.partner, ...partnerChoices },
            },
          } : currentRoom);
        } else {
          await appendNamesToLiveRoom(room, uid);
        }
      } catch {
        requestedPages.current.delete(requestKey);
        setStreamError("More names could not be loaded. We’ll try again.");
      } finally {
        setIsLoadingMore(false);
      }
    };

    void replenish();
  }, [demo, room, uid]);

  const handleCreate = async (nickname: string, filter: NameFilter) => {
    setBusy(true);
    setError("");
    setStreamError("");
    try {
      if (isFirebaseConfigured) {
        const result = await createLiveRoom(nickname, filter);
        const savedSession = { code: result.room.code, nickname };
        saveActiveSession(savedSession);
        setResumeSession(savedSession);
        setRoom(result.room);
        setUid(result.uid);
        setDemo(false);
        window.history.replaceState({}, "", `?room=${result.room.code}`);
      } else {
        const deck = await fetchNameBatch(filter, "demo42");
        setRoom({
          ...createDemoRoom(deck.names, filter, deck.source),
          nextPage: deck.nextPage,
          exhausted: deck.exhausted,
        });
        setUid("you");
        setDemo(true);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create the room.");
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async (nickname: string, code: string) => {
    setBusy(true);
    setError("");
    setStreamError("");
    try {
      const result = await joinLiveRoom(code, nickname);
      const savedSession = { code: result.room.code, nickname };
      saveActiveSession(savedSession);
      setResumeSession(savedSession);
      setRoom(result.room);
      setUid(result.uid);
      setDemo(false);
      window.history.replaceState({}, "", `?room=${code}`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not join the room.";
      if (resumeSession?.code === code && /not found|expired/i.test(message)) {
        clearActiveSession();
        setResumeSession(null);
      }
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const handleChoose = useCallback((nameId: string, choice: Choice) => {
    if (!room || !uid) return;
    setPassHistory((currentHistory) => {
      const nextHistory = choice === "pass"
        ? rememberPass(currentHistory, nameId)
        : forgetPass(currentHistory, nameId);
      writePassHistory(room.code, uid, nextHistory);
      return nextHistory;
    });
    setRoom((currentRoom) => currentRoom ? ({
      ...currentRoom,
      decisions: {
        ...currentRoom.decisions,
        [uid]: { ...currentRoom.decisions?.[uid], [nameId]: choice },
      },
    }) : currentRoom);
    if (!demo) {
      void saveChoice(room.code, uid, nameId, choice).catch(() => {
        setError("That choice did not sync. Please check your connection.");
      });
    }
  }, [demo, room, uid]);

  const handleBack = useCallback(() => {
    if (!room || !uid) return;
    const nameId = latestAvailablePass(
      passHistory,
      (id) => Boolean(room.names[id] && room.decisions?.[uid]?.[id] === "pass"),
    );

    if (!nameId) {
      setPassHistory([]);
      writePassHistory(room.code, uid, []);
      return;
    }

    const nextHistory = forgetPass(passHistory, nameId);
    setPassHistory(nextHistory);
    writePassHistory(room.code, uid, nextHistory);
    setRoom((currentRoom) => {
      if (!currentRoom) return currentRoom;
      const nextChoices = { ...currentRoom.decisions?.[uid] };
      delete nextChoices[nameId];
      return {
        ...currentRoom,
        decisions: { ...currentRoom.decisions, [uid]: nextChoices },
      };
    });

    if (!demo) {
      void removeChoice(room.code, uid, nameId).catch(() => {
        setError("That name could not be restored. Please check your connection.");
      });
    }
  }, [demo, passHistory, room, uid]);

  const handleExit = async (endForEveryone: boolean) => {
    if (room && !demo) {
      if (endForEveryone) await endLiveRoom(room.code);
      else await leaveLiveRoom(room.code, uid);
    }
    setRoom(null);
    setUid("");
    setDemo(false);
    setError("");
    setPassHistory([]);
    clearActiveSession();
    setResumeSession(null);
    window.history.replaceState({}, "", window.location.pathname);
  };

  if (!room || !uid) {
    return (
      <Home
        busy={busy}
        error={error}
        initialCode={initialCode}
        resumeSession={resumeSession}
        onCreate={handleCreate}
        onJoin={handleJoin}
        onResume={() => {
          if (resumeSession) void handleJoin(resumeSession.nickname, resumeSession.code);
        }}
      />
    );
  }

  return (
    <RoomView
      room={room}
      uid={uid}
      demo={demo}
      isLoadingMore={isLoadingMore}
      streamError={streamError}
      recentPassCount={passHistory.length}
      onChoose={handleChoose}
      onBack={handleBack}
      onExit={handleExit}
    />
  );
}

export default App;
