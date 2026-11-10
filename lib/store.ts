"use client";

import { useSyncExternalStore } from "react";
import { collection, doc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { firebase } from "@/lib/firebase";
import { readEntry, readGroup, readLog, readMeeting, readVote } from "@/lib/read";
import { entryChanges } from "@/lib/ledger";
import { groupChanges } from "@/lib/group";
import type { Entry, Group, LogItem, Meeting, Profile, Vote } from "@/lib/types";

/*
  The app's live copy of your stokvel, kept up to date by Firestore.

  connect(uid) listens to your profile (users/{uid}): your name and which groups you're in.
  For the group you're looking at, it then listens to the group itself, its money book
  (entries), its history (log), its meetings and its votes. Whenever anyone changes something,
  Firestore sends the new version within a moment, every screen re-draws, and a message pops up
  ("Thabo recorded your R 500,00 for November 2026").

  Changes you make show straight away, even offline: Firestore saves them on the phone first
  ("pending") and sends them when the connection is back.
*/

export type Toast = { id: number; text: string };

export type AppState = {
  uid: string | null;
  status: "loading" | "noGroup" | "ready";
  profile: Profile;
  group: Group | null;
  entries: Entry[];
  log: LogItem[];
  meetings: Meeting[];
  votes: Vote[];
  pending: boolean; // changes saved on this phone but not yet sent
  online: boolean;
  toasts: Toast[];
  problem: string | null;
};

const emptyProfile: Profile = { name: "", groups: [], current: null };
const emptyGroupParts = { group: null, entries: [], log: [], meetings: [], votes: [] };

let state: AppState = {
  uid: null,
  status: "loading",
  profile: emptyProfile,
  ...emptyGroupParts,
  pending: false,
  online: true,
  toasts: [],
  problem: null,
};

const listeners = new Set<() => void>();
function set(change: Partial<AppState>) {
  state = { ...state, ...change };
  listeners.forEach((l) => l());
}

let stopProfile: Unsubscribe | null = null;
let stops: Unsubscribe[] = [];
let watching: string | null = null;
let firstEntries = true;
const pendingParts = new Map<string, boolean>();
let toastId = 0;
let startingName = "";

function setPending(part: string, value: boolean) {
  pendingParts.set(part, value);
  set({ pending: [...pendingParts.values()].some(Boolean) });
}

export function addToast(text: string) {
  const toast = { id: ++toastId, text };
  set({ toasts: [...state.toasts, toast].slice(-3) });
  setTimeout(() => dismissToast(toast.id), 4500);
}

export function dismissToast(id: number) {
  set({ toasts: state.toasts.filter((t) => t.id !== id) });
}

export function reportProblem(problem: string | null) {
  set({ problem });
}

function stopWatchingGroup() {
  clearTimeout(retryTimer);
  stops.forEach((stop) => stop());
  stops = [];
  watching = null;
  firstEntries = true;
  pendingParts.clear();
}

/*
  Right after you start or join a group, Google's servers can take a moment to know you're in it,
  and refuse to show it. The app quietly tries again a few times before giving up (lostGroup).
*/
const RETRY_DELAYS = [400, 800, 1600, 3200];
let retries = 0;
let retryTimer: ReturnType<typeof setTimeout> | undefined;

function retryLater(id: string) {
  if (retries >= RETRY_DELAYS.length) return false;
  const delay = RETRY_DELAYS[retries++];
  clearTimeout(retryTimer);
  retryTimer = setTimeout(() => {
    if (watching !== id) return;
    watching = null;
    watchGroup(id, true);
  }, delay);
  return true;
}

/** You were removed, or the group was deleted: say so, and move to your next group */
function lostGroup(id: string) {
  const name = state.group?.id === id ? state.group.name : "that group";
  stopWatchingGroup();
  set({ ...emptyGroupParts, status: "noGroup" });
  addToast(`You're no longer in ${name}.`);
  // Imported here, not at the top, because actions.ts imports this file
  import("@/lib/actions").then(({ forgetGroup }) => forgetGroup(id));
}

/** Listens to one of the group's lists (entries, log, meetings, votes) */
function watchList<T>(id: string, name: string, read: (id: string, d: Record<string, unknown>) => T, apply: (items: T[], fromServer: boolean) => void) {
  return onSnapshot(
    collection(firebase().db, "groups", id, name),
    { includeMetadataChanges: true },
    (snap) => {
      setPending(name, snap.metadata.hasPendingWrites);
      apply(
        snap.docs.map((d) => read(d.id, d.data())),
        !snap.metadata.hasPendingWrites,
      );
    },
    () => apply([], false),
  );
}

function watchParts(id: string) {
  stops.push(
    watchList(id, "entries", readEntry, (entries, fromServer) => {
      if (!firstEntries && fromServer && state.uid && state.group) {
        for (const text of entryChanges(state.entries, entries, state.group, state.uid)) addToast(text);
      }
      firstEntries = false;
      set({ entries: entries.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt) });
    }),
    watchList(id, "log", readLog, (log) => set({ log: log.sort((a, b) => b.at - a.at) })),
    watchList(id, "meetings", readMeeting, (meetings) => set({ meetings: meetings.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt) })),
    watchList(id, "votes", readVote, (votes) => set({ votes: votes.sort((a, b) => Number(a.closed) - Number(b.closed) || b.createdAt - a.createdAt) })),
  );
}

function watchGroup(id: string, retrying = false) {
  if (watching === id) return;
  stopWatchingGroup();
  watching = id;
  if (!retrying) retries = 0;
  set({ ...emptyGroupParts, status: "loading" });
  let partsStarted = false;

  stops.push(
    onSnapshot(
      doc(firebase().db, "groups", id),
      { includeMetadataChanges: true },
      (snap) => {
        setPending("group", snap.metadata.hasPendingWrites);
        const data = snap.data();
        if (!data || !state.uid || !Array.isArray(data.memberIds) || !data.memberIds.includes(state.uid)) {
          // Only the server's answer counts: a copy saved on this phone may simply be out of date
          if (!snap.metadata.fromCache) lostGroup(id);
          return;
        }
        retries = 0;
        const next = readGroup(id, data);
        if (state.uid && state.group?.id === id) {
          for (const text of groupChanges(state.group, next, state.uid)) addToast(text);
        }
        set({ group: next, status: "ready" });
        if (!partsStarted) {
          partsStarted = true;
          watchParts(id);
        }
      },
      () => {
        if (!retryLater(id)) lostGroup(id);
      },
    ),
  );
}

const onOnline = () => set({ online: navigator.onLine });

export function connect(uid: string, name: string) {
  if (state.uid === uid) return;
  disconnect();
  startingName = name;
  set({ uid, status: "loading", online: navigator.onLine });
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOnline);

  stopProfile = onSnapshot(
    doc(firebase().db, "users", uid),
    { includeMetadataChanges: true },
    (snap) => {
      setPending("profile", snap.metadata.hasPendingWrites);
      const saved = snap.data() as Partial<Profile> | undefined;
      const groups = Array.isArray(saved?.groups) ? saved.groups.filter((g): g is string => typeof g === "string") : [];
      const profile: Profile = { name: saved?.name || startingName, groups, current: saved?.current ?? null };
      const current = profile.current && groups.includes(profile.current) ? profile.current : groups[0] ?? null;
      set({ profile: { ...profile, current } });
      if (current) watchGroup(current);
      else {
        stopWatchingGroup();
        set({ ...emptyGroupParts, status: "noGroup" });
      }
    },
    () => set({ status: "noGroup", problem: "Couldn't load your profile. Check your connection and refresh." }),
  );
}

export function disconnect() {
  stopProfile?.();
  stopProfile = null;
  stopWatchingGroup();
  if (typeof window !== "undefined") {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOnline);
  }
  set({ uid: null, status: "loading", profile: emptyProfile, ...emptyGroupParts, pending: false, toasts: [], problem: null });
}

export function getApp() {
  return state;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useApp(): AppState {
  return useSyncExternalStore(subscribe, getApp, getApp);
}
