import { create } from "zustand";
import type { AppNotification } from "../types";

const MAX_NOTIFICATIONS = 50;

type NotificationState = {
  notifications: AppNotification[];
  add: (
    notification: Omit<AppNotification, "id" | "createdAt" | "read"> &
      Partial<Pick<AppNotification, "id" | "createdAt">>,
  ) => string;
  markRead: (id: string) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
  clear: () => void;
};

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],

  add: (notification) => {
    const id = notification.id ?? crypto.randomUUID();
    set((state) => ({
      notifications: [
        {
          ...notification,
          id,
          createdAt: notification.createdAt ?? Date.now(),
          read: false,
        },
        ...state.notifications.filter((item) => item.id !== id),
      ].slice(0, MAX_NOTIFICATIONS),
    }));
    return id;
  },

  markRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((item) =>
        item.id === id ? { ...item, read: true } : item,
      ),
    })),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((item) => ({
        ...item,
        read: true,
      })),
    })),

  remove: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((item) => item.id !== id),
    })),

  clear: () => set({ notifications: [] }),
}));

export const selectUnreadCount = (state: NotificationState) =>
  state.notifications.filter((item) => !item.read).length;
