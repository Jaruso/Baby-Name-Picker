import { getApp, getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  setPersistence,
  signInAnonymously,
} from "firebase/auth";
import {
  get,
  getDatabase,
  off,
  onDisconnect,
  onValue,
  ref,
  remove,
  set,
  update,
} from "firebase/database";
import type { Choice, NameFilter, NameOption, Room } from "../types";
import { fetchNameBatch } from "./names";
import { createRoomCode } from "./utils";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean);

const app = isFirebaseConfigured
  ? getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

const auth = app ? getAuth(app) : null;
const database = app ? getDatabase(app) : null;
let authPromise: Promise<string> | null = null;

async function ensureUser(): Promise<string> {
  if (!auth) throw new Error("Firebase is not configured.");
  if (auth.currentUser) {
    await setPersistence(auth, browserLocalPersistence);
    return auth.currentUser.uid;
  }
  if (!authPromise) {
    authPromise = setPersistence(auth, browserLocalPersistence)
      .then(() => signInAnonymously(auth))
      .then(({ user }) => user.uid)
      .finally(() => {
        authPromise = null;
      });
  }
  return authPromise;
}

async function markPresent(code: string, uid: string): Promise<void> {
  if (!database) return;
  const presenceRef = ref(database, `rooms/${code}/presence/${uid}`);
  await onDisconnect(presenceRef).remove();
  await set(presenceRef, true);
}

export async function createLiveRoom(
  nickname: string,
  filter: NameFilter,
): Promise<{ room: Room; uid: string }> {
  if (!database) throw new Error("Firebase is not configured.");
  const uid = await ensureUser();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = createRoomCode();
    const roomRef = ref(database, `rooms/${code}`);

    const deck = await fetchNameBatch(filter, code);
    const names = Object.fromEntries(deck.names.map((name) => [name.id, name]));
    const now = Date.now();
    const room: Room = {
      code,
      createdBy: uid,
      createdAt: now,
      expiresAt: now + 23 * 60 * 60 * 1000,
      filter,
      source: deck.source,
      names,
      order: deck.names.map((name) => name.id),
      nextPage: deck.nextPage,
      exhausted: deck.exhausted,
      members: { [uid]: { name: nickname, joinedAt: now } },
      presence: { [uid]: true },
      decisions: {},
    };
    try {
      // The create-only database rule is the collision check. Reading an unused
      // code first would be rejected because nonexistent rooms are not readable.
      await set(roomRef, room);
      await markPresent(code, uid);
      return { room, uid };
    } catch (error) {
      if (attempt === 4) throw error;
    }
  }

  throw new Error("Could not reserve a room code. Please try again.");
}

export async function appendNamesToLiveRoom(
  room: Room,
  uid: string,
): Promise<{ names: NameOption[]; nextPage: number; exhausted: boolean }> {
  if (!database) throw new Error("Firebase is not configured.");
  if (room.createdBy !== uid) return { names: [], nextPage: room.nextPage ?? 2, exhausted: false };

  const page = room.nextPage ?? 2;
  const batch = await fetchNameBatch(
    room.filter,
    room.code,
    page,
    Object.values(room.names).map(({ name }) => name),
  );

  if (batch.names.length) {
    const roomPath = `rooms/${room.code}`;
    const writes: Record<string, NameOption | string | number | boolean> = {};
    batch.names.forEach((name, index) => {
      writes[`names/${name.id}`] = name;
      writes[`order/${room.order.length + index}`] = name.id;
    });
    writes.nextPage = batch.nextPage;
    writes.exhausted = batch.exhausted;
    await update(ref(database, roomPath), writes);
  } else {
    await update(ref(database, `rooms/${room.code}`), {
      nextPage: batch.nextPage,
      exhausted: true,
    });
  }

  return batch;
}

export async function joinLiveRoom(
  code: string,
  nickname: string,
): Promise<{ room: Room; uid: string }> {
  if (!database) throw new Error("Firebase is not configured.");
  const uid = await ensureUser();
  const roomRef = ref(database, `rooms/${code}`);
  const snapshot = await get(roomRef);
  if (!snapshot.exists()) throw new Error("That room was not found or has expired.");
  const room = snapshot.val() as Room;
  if (room.expiresAt <= Date.now()) throw new Error("That room has expired.");

  const members = room.members ?? {};
  if (!members[uid] && Object.keys(members).length >= 2) {
    throw new Error("That room already has two people in it.");
  }

  await update(ref(database, `rooms/${code}/members/${uid}`), {
    name: nickname,
    joinedAt: members[uid]?.joinedAt ?? Date.now(),
  });
  await markPresent(code, uid);
  return { room: { ...room, members: { ...members, [uid]: { name: nickname, joinedAt: Date.now() } } }, uid };
}

export function subscribeToRoom(
  code: string,
  onRoom: (room: Room | null) => void,
  onError: (error: Error) => void,
): () => void {
  if (!database) return () => undefined;
  const roomRef = ref(database, `rooms/${code}`);
  onValue(
    roomRef,
    (snapshot) => onRoom(snapshot.exists() ? (snapshot.val() as Room) : null),
    onError,
  );
  return () => off(roomRef);
}

export async function saveChoice(
  code: string,
  uid: string,
  nameId: string,
  choice: Choice,
): Promise<void> {
  if (!database) return;
  await set(ref(database, `rooms/${code}/decisions/${uid}/${nameId}`), choice);
}

export async function removeChoice(code: string, uid: string, nameId: string): Promise<void> {
  if (!database) return;
  await remove(ref(database, `rooms/${code}/decisions/${uid}/${nameId}`));
}

export async function leaveLiveRoom(code: string, uid: string): Promise<void> {
  if (!database) return;
  // Keep membership in place until the other protected session data is gone.
  await remove(ref(database, `rooms/${code}/presence/${uid}`));
  await remove(ref(database, `rooms/${code}/decisions/${uid}`));
  await remove(ref(database, `rooms/${code}/members/${uid}`));
}

export async function endLiveRoom(code: string): Promise<void> {
  if (!database) return;
  await remove(ref(database, `rooms/${code}`));
}
