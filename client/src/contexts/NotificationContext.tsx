import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api, type Notification } from "../lib/api";
import { connectSocket, disconnectSocket } from "../lib/socket";
import { useAuth } from "./AuthContext";

interface Toast {
  id: string;
  title: string;
  message: string;
  issueId?: string;
  tone: "info" | "success" | "error";
}

interface NotificationContextType {
  unread: number;
  refreshUnread: () => Promise<void>;
  setUnread: (n: number) => void;
  toast: (t: Omit<Toast, "id">) => void;
}

const Ctx = createContext<NotificationContextType | undefined>(undefined);

export function useNotifications() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, isAuthenticated, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev.slice(-2), { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 5000);
  }, []);

  const refreshUnread = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setUnread((await api.notifications()).unread);
    } catch {
      /* ignore */
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      disconnectSocket();
      setUnread(0);
      return;
    }
    refreshUnread();
    const socket = connectSocket(token);
    socket.on("notification", (n: Notification) => {
      setUnread((u) => u + 1);
      toast({ title: n.title, message: n.message, issueId: n.issue ? String(n.issue) : undefined, tone: "info" });
      if (n.type === "reward") refreshUser().catch(() => undefined);
    });
    return () => {
      socket.off("notification");
    };
  }, [isAuthenticated, token, refreshUnread, refreshUser, toast]);

  return (
    <Ctx.Provider value={{ unread, refreshUnread, setUnread, toast }}>
      {children}
      <div className="fixed top-3 inset-x-3 md:inset-x-auto md:right-4 md:w-96 z-[1200] space-y-2 pointer-events-none" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`pointer-events-auto flex gap-3 items-start rounded-xl p-3 shadow-lg border bg-white dark:bg-gray-800 ${
                t.tone === "error" ? "border-red-300 dark:border-red-700" : t.tone === "success" ? "border-green-300 dark:border-green-700" : "border-gray-200 dark:border-gray-700"
              }`}
            >
              <Bell size={18} className="mt-0.5 text-primary-600 dark:text-primary-400 shrink-0" />
              <button
                className="flex-1 text-left"
                onClick={() => {
                  if (t.issueId) navigate(`/issues/${t.issueId}`);
                  setToasts((prev) => prev.filter((x) => x.id !== t.id));
                }}
              >
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{t.title}</p>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">{t.message}</p>
              </button>
              <button
                aria-label="Dismiss"
                className="text-gray-400 hover:text-gray-600"
                onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              >
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
};
