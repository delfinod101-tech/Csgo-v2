import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  OAuthProvider,
  User,
  getAuth,
  linkWithPopup,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import firebaseConfig from '@/firebase-applet-config.json';
import {
  AuthProviderKind,
  BannerId,
  FriendRecord,
  HitEffectId,
  KillEffectId,
  PlayerProfile,
  PublicPlayerInfo,
  SkinId,
} from '@/src/types/game';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

export function subscribeAuth(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, cb);
}

export function detectProviderFromUser(user: User | null): AuthProviderKind {
  if (!user || user.isAnonymous) return 'guest';
  const ids = user.providerData.map((p) => p.providerId);
  if (ids.includes('apple.com')) return 'apple';
  if (ids.includes('google.com')) return 'google';
  return 'guest';
}

export async function signInGuestSession(): Promise<{
  ok: boolean;
  user: User | null;
  localGuestOnly: boolean;
}> {
  if (auth.currentUser) {
    return { ok: true, user: auth.currentUser, localGuestOnly: false };
  }
  try {
    const cred = await signInAnonymously(auth);
    return { ok: true, user: cred.user, localGuestOnly: false };
  } catch {
    // Anonymous provider may not be toggled in Firebase Console; local + WS guest session stays 100% playable.
    return { ok: true, user: null, localGuestOnly: true };
  }
}

export async function signInOrLinkGoogle(): Promise<{
  ok: boolean;
  user?: User;
  message?: string;
}> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    if (auth.currentUser && auth.currentUser.isAnonymous) {
      try {
        const res = await linkWithPopup(auth.currentUser, provider);
        return { ok: true, user: res.user };
      } catch (linkErr: unknown) {
        const code = (linkErr as { code?: string })?.code ?? '';
        if (code === 'auth/credential-already-in-use' || code === 'auth/email-already-in-use') {
          const res = await signInWithPopup(auth, provider);
          return { ok: true, user: res.user };
        }
        throw linkErr;
      }
    }
    const res = await signInWithPopup(auth, provider);
    return { ok: true, user: res.user };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code ?? '';
    if (code === 'auth/popup-closed-by-user') {
      return { ok: false, message: 'Login com Google cancelado.' };
    }
    if (code === 'auth/popup-blocked') {
      return { ok: false, message: 'Pop-up bloqueado pelo navegador. Permita pop-ups e tente novamente.' };
    }
    return { ok: false, message: 'Não foi possível vincular a conta Google agora.' };
  }
}

export async function signInOrLinkApple(): Promise<{
  ok: boolean;
  user?: User;
  message?: string;
}> {
  const provider = new OAuthProvider('apple.com');
  provider.addScope('email');
  provider.addScope('name');
  try {
    if (auth.currentUser && auth.currentUser.isAnonymous) {
      try {
        const res = await linkWithPopup(auth.currentUser, provider);
        return { ok: true, user: res.user };
      } catch (linkErr: unknown) {
        const code = (linkErr as { code?: string })?.code ?? '';
        if (code === 'auth/credential-already-in-use') {
          const res = await signInWithPopup(auth, provider);
          return { ok: true, user: res.user };
        }
        throw linkErr;
      }
    }
    const res = await signInWithPopup(auth, provider);
    return { ok: true, user: res.user };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code ?? '';
    if (code === 'auth/popup-closed-by-user') {
      return { ok: false, message: 'Login Apple cancelado.' };
    }
    if (code === 'auth/operation-not-allowed' || code === 'auth/unauthorized-domain') {
      return {
        ok: false,
        message:
          'Ative o provedor Apple (iOS) no Console do Firebase (Authentication > Sign-in method) com seu Service ID da Apple.',
      };
    }
    return {
      ok: false,
      message: 'Conta Apple/iOS requer configuração de Service ID no Console do Firebase.',
    };
  }
}

export async function signOutFirebase(): Promise<void> {
  try {
    await signOut(auth);
  } catch {
    // ignore
  }
}

function sanitizeDisplayName(name: string, shortId: string): string {
  const cleaned = name.trim().replace(/\s+/g, ' ').slice(0, 16);
  return cleaned.length >= 2 ? cleaned : `Operador${shortId.slice(-4)}`;
}

export async function syncProfileToFirestore(profile: PlayerProfile): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  if (!/^STK-[0-9]{6}$/.test(profile.shortId)) return;

  const safeName = sanitizeDisplayName(profile.displayName, profile.shortId);
  const provider = detectProviderFromUser(user);

  const dirPath = `playerDirectory/${profile.shortId}`;
  try {
    const dirRef = doc(db, 'playerDirectory', profile.shortId);
    const existingDir = await getDoc(dirRef);
    if (existingDir.exists() && existingDir.data().uid !== user.uid) {
      return;
    }
    const createdAtValue = existingDir.exists()
      ? existingDir.data().createdAt
      : serverTimestamp();

    await setDoc(dirRef, {
      uid: user.uid,
      shortId: profile.shortId,
      displayName: safeName,
      bannerId: profile.bannerId,
      authProvider: provider,
      kills: Math.max(0, Math.floor(profile.kills)),
      deaths: Math.max(0, Math.floor(profile.deaths)),
      wins: Math.max(0, Math.floor(profile.wins)),
      matchesPlayed: Math.max(0, Math.floor(profile.matchesPlayed)),
      score: Math.max(0, Math.floor(profile.score)),
      createdAt: createdAtValue,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, dirPath);
  }

  const accPath = `players/${user.uid}/private/account`;
  try {
    const accRef = doc(db, 'players', user.uid, 'private', 'account');
    const existingAcc = await getDoc(accRef);
    const createdAtValue = existingAcc.exists()
      ? existingAcc.data().createdAt
      : serverTimestamp();

    const safeSkins = profile.unlockedSkins.length > 0 ? profile.unlockedSkins.slice(0, 32) : ['m4-tactical'];
    const safeHitFx = profile.unlockedHitFx.length > 0 ? profile.unlockedHitFx.slice(0, 32) : ['spark'];
    const safeKillFx = profile.unlockedKillFx.length > 0 ? profile.unlockedKillFx.slice(0, 32) : ['shockwave'];

    await setDoc(accRef, {
      uid: user.uid,
      shortId: profile.shortId,
      credits: Math.max(0, Math.floor(profile.credits)),
      equippedSkin: profile.equippedSkin,
      equippedHitFx: profile.equippedHitFx,
      equippedKillFx: profile.equippedKillFx,
      unlockedSkins: safeSkins,
      unlockedHitFx: safeHitFx,
      unlockedKillFx: safeKillFx,
      casesOpened: Math.max(0, Math.floor(profile.casesOpened)),
      createdAt: createdAtValue,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, accPath);
  }
}

export async function loadAccountFromFirestore(
  uid: string,
  fallback: PlayerProfile
): Promise<PlayerProfile | null> {
  const accPath = `players/${uid}/private/account`;
  try {
    const accSnap = await getDoc(doc(db, 'players', uid, 'private', 'account'));
    if (!accSnap.exists()) return null;
    const acc = accSnap.data();
    const shortId = typeof acc.shortId === 'string' && /^STK-[0-9]{6}$/.test(acc.shortId)
      ? acc.shortId
      : fallback.shortId;

    const dirSnap = /^STK-[0-9]{6}$/.test(shortId)
      ? await getDoc(doc(db, 'playerDirectory', shortId))
      : null;
    const dir = dirSnap?.exists() ? dirSnap.data() : {};

    return {
      uid,
      shortId,
      displayName: typeof dir.displayName === 'string' ? dir.displayName : fallback.displayName,
      bannerId: (dir.bannerId as BannerId) || fallback.bannerId,
      authProvider: (dir.authProvider as AuthProviderKind) || fallback.authProvider,
      credits: typeof acc.credits === 'number' ? acc.credits : fallback.credits,
      equippedSkin: (acc.equippedSkin as SkinId) || fallback.equippedSkin,
      equippedHitFx: (acc.equippedHitFx as HitEffectId) || fallback.equippedHitFx,
      equippedKillFx: (acc.equippedKillFx as KillEffectId) || fallback.equippedKillFx,
      unlockedSkins: Array.isArray(acc.unlockedSkins) ? (acc.unlockedSkins as SkinId[]) : fallback.unlockedSkins,
      unlockedHitFx: Array.isArray(acc.unlockedHitFx) ? (acc.unlockedHitFx as HitEffectId[]) : fallback.unlockedHitFx,
      unlockedKillFx: Array.isArray(acc.unlockedKillFx) ? (acc.unlockedKillFx as KillEffectId[]) : fallback.unlockedKillFx,
      casesOpened: typeof acc.casesOpened === 'number' ? acc.casesOpened : fallback.casesOpened,
      kills: typeof dir.kills === 'number' ? dir.kills : fallback.kills,
      deaths: typeof dir.deaths === 'number' ? dir.deaths : fallback.deaths,
      wins: typeof dir.wins === 'number' ? dir.wins : fallback.wins,
      matchesPlayed: typeof dir.matchesPlayed === 'number' ? dir.matchesPlayed : fallback.matchesPlayed,
      score: typeof dir.score === 'number' ? dir.score : fallback.score,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, accPath);
  }
}

export async function lookupDirectoryByShortId(
  shortId: string
): Promise<PublicPlayerInfo | null> {
  const normalized = shortId.trim().toUpperCase();
  if (!/^STK-[0-9]{6}$/.test(normalized)) return null;
  const path = `playerDirectory/${normalized}`;
  try {
    const snap = await getDoc(doc(db, 'playerDirectory', normalized));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
      uid: String(d.uid),
      shortId: String(d.shortId),
      displayName: String(d.displayName),
      bannerId: (d.bannerId as BannerId) || 'mirage-gold',
      authProvider: (d.authProvider as AuthProviderKind) || 'guest',
      kills: Number(d.kills ?? 0),
      deaths: Number(d.deaths ?? 0),
      wins: Number(d.wins ?? 0),
      matchesPlayed: Number(d.matchesPlayed ?? 0),
      score: Number(d.score ?? 0),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function fetchFirestoreLeaderboard(maxCount = 25): Promise<PublicPlayerInfo[]> {
  const path = 'playerDirectory';
  try {
    const q = query(
      collection(db, 'playerDirectory'),
      where('score', '>=', 0),
      orderBy('score', 'desc'),
      limit(maxCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => {
      const d = docSnap.data();
      return {
        uid: String(d.uid),
        shortId: String(d.shortId),
        displayName: String(d.displayName),
        bannerId: (d.bannerId as BannerId) || 'mirage-gold',
        authProvider: (d.authProvider as AuthProviderKind) || 'guest',
        kills: Number(d.kills ?? 0),
        deaths: Number(d.deaths ?? 0),
        wins: Number(d.wins ?? 0),
        matchesPlayed: Number(d.matchesPlayed ?? 0),
        score: Number(d.score ?? 0),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveFriendToFirestore(friend: FriendRecord): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  if (!/^STK-[0-9]{6}$/.test(friend.friendShortId)) return;
  const path = `players/${user.uid}/friends/${friend.friendUid}`;
  try {
    const friendRef = doc(db, 'players', user.uid, 'friends', friend.friendUid);
    const existingFriend = await getDoc(friendRef);
    if (existingFriend.exists()) return;
    await setDoc(friendRef, {
      ownerUid: user.uid,
      friendUid: friend.friendUid,
      friendShortId: friend.friendShortId,
      friendName: sanitizeDisplayName(friend.friendName, friend.friendShortId),
      friendBannerId: friend.friendBannerId,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function removeFriendFromFirestore(friendUid: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const path = `players/${user.uid}/friends/${friendUid}`;
  try {
    await deleteDoc(doc(db, 'players', user.uid, 'friends', friendUid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
