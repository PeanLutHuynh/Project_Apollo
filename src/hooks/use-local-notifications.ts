"use client";

import { useEffect, useState } from "react";

export type LocalNotification = {
  id: string;
  title: string;
  description: string;
  createdAt: number;
  read: boolean;
};

type NotificationState = {
  items: LocalNotification[];
};

const STORAGE_KEY = "apollo-local-notifications";
const MAX_ITEMS = 20;

let memoryState: NotificationState = { items: [] };
const listeners: Array<(state: NotificationState) => void> = [];
let initialized = false;

function notify() {
  for (const listener of listeners) {
    listener(memoryState);
  }
}

function persist() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryState.items));
}

function ensureInitialized() {
  if (initialized || typeof window === "undefined") {
    return;
  }

  initialized = true;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return;
  }

  try {
    const parsed = JSON.parse(stored) as LocalNotification[];
    if (Array.isArray(parsed)) {
      memoryState = {
        items: parsed
          .filter((item) => item && typeof item.id === "string")
          .slice(0, MAX_ITEMS),
      };
    }
  } catch {
    memoryState = { items: [] };
  }
}

function dispatch(nextState: NotificationState) {
  memoryState = nextState;
  persist();
  notify();
}

export function addLocalNotification(title: string, description: string) {
  ensureInitialized();

  const nextItem: LocalNotification = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    description,
    createdAt: Date.now(),
    read: false,
  };

  dispatch({
    items: [nextItem, ...memoryState.items].slice(0, MAX_ITEMS),
  });
}

export function useLocalNotifications() {
  ensureInitialized();

  const [state, setState] = useState<NotificationState>(memoryState);

  useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index >= 0) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  function markAllRead() {
    dispatch({
      items: memoryState.items.map((item) => ({ ...item, read: true })),
    });
  }

  function clearAll() {
    dispatch({ items: [] });
  }

  const unreadCount = state.items.filter((item) => !item.read).length;

  return {
    items: state.items,
    unreadCount,
    markAllRead,
    clearAll,
  };
}
