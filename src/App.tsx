import {
  Check,
  ChevronRight,
  Copy,
  Heart,
  LogOut,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useMotionValue, useTransform } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Choice, NameFilter, NameOption, Room } from "./types";
import {
  createLiveRoom,
  endLiveRoom,
  isFirebaseConfigured,
  joinLiveRoom,
  leaveLiveRoom,
  saveChoice,
  subscribeToRoom,
} from "./lib/firebase";
import { fetchNameDeck } from "./lib/names";
import { inviteUrl, matchIds, normalizeRoomCode, originLabel } from "./lib/utils";

type HomeMode = "create" | "join";

function createDemoRoom(names: NameOption[], filter: NameFilter, source: Room["source"]): Room {
  const partnerChoices = Object.fromEntries(
    names
      .filter((name) =>
        [...name.name].reduce((total, character) => total + character.charCodeAt(0), 0) % 3 !== 0,
      )
      .map((name) => [name.id, "like" as const]),
  );
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
    members: {
      you: { name: "You", joinedAt: now },
      partner: { name: "Alex (demo)", joinedAt: now },
    },
    presence: { you: true, partner: true },
    decisions: { partner: partnerChoices },
  };
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
  onCreate: (nickname: string, filter: NameFilter) => Promise<void>;
  onJoin: (nickname: string, code: string) => Promise<void>;
}

function Home({ busy, error, initialCode, onCreate, onJoin }: HomeProps) {
  const [mode, setMode] = useState<HomeMode>(initialCode ? "join" : "create");
  const [nickname, setNickname] = useState(() => sessionStorage.getItem("baby-name-picker-name") ?? "");
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
            <span className="sample-index">24 / 60</span>
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
  total: number;
  onChoose: (choice: Choice) => void;
}

function NameCard({ name, index, total, onChoose }: NameCardProps) {
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
        <span>{String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
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
  onChoose: (nameId: string, choice: Choice) => void;
  onExit: (endForEveryone: boolean) => Promise<void>;
}

function RoomView({ room, uid, demo, onChoose, onExit }: RoomViewProps) {
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
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [celebration, current, onChoose, showExit]);

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

          <div className="session-progress">
            <div className="progress-label">
              <span>Your progress</span>
              <strong>{Math.round((completed / room.order.length) * 100)}%</strong>
            </div>
            <div className="progress-track"><span style={{ width: `${(completed / room.order.length) * 100}%` }} /></div>
            <p>{completed} decided · {remainingIds.length} left</p>
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
                    total={room.order.length}
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
          ) : (
            <div className="finished-state">
              <span className="finished-mark"><Check size={30} /></span>
              <p className="eyebrow">Your list is complete</p>
              <h2>{matches.length ? "You found a few worth saying twice." : "Now, let the names settle."}</h2>
              <p>{memberIds.length < 2 ? "Invite your partner to find your shared favorites." : "You can leave this page open while your partner finishes."}</p>
              <button type="button" onClick={() => setShowExit(true)}>Finish session <ChevronRight size={17} /></button>
            </div>
          )}
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
  const roomCode = room?.code;

  useEffect(() => {
    if (!roomCode || demo) return;
    return subscribeToRoom(
      roomCode,
      (nextRoom) => {
        if (!nextRoom) {
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

  const handleCreate = async (nickname: string, filter: NameFilter) => {
    setBusy(true);
    setError("");
    try {
      if (isFirebaseConfigured) {
        const result = await createLiveRoom(nickname, filter);
        setRoom(result.room);
        setUid(result.uid);
        setDemo(false);
        window.history.replaceState({}, "", `?room=${result.room.code}`);
      } else {
        const deck = await fetchNameDeck(filter, "demo42");
        setRoom(createDemoRoom(deck.names, filter, deck.source));
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
    try {
      const result = await joinLiveRoom(code, nickname);
      setRoom(result.room);
      setUid(result.uid);
      setDemo(false);
      window.history.replaceState({}, "", `?room=${code}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not join the room.");
    } finally {
      setBusy(false);
    }
  };

  const handleChoose = useCallback((nameId: string, choice: Choice) => {
    if (!room || !uid) return;
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

  const handleExit = async (endForEveryone: boolean) => {
    if (room && !demo) {
      if (endForEveryone) await endLiveRoom(room.code);
      else await leaveLiveRoom(room.code, uid);
    }
    setRoom(null);
    setUid("");
    setDemo(false);
    setError("");
    window.history.replaceState({}, "", window.location.pathname);
  };

  if (!room || !uid) {
    return <Home busy={busy} error={error} initialCode={initialCode} onCreate={handleCreate} onJoin={handleJoin} />;
  }

  return <RoomView room={room} uid={uid} demo={demo} onChoose={handleChoose} onExit={handleExit} />;
}

export default App;
