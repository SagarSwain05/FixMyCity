import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Trash2, Gift, ClipboardCheck, Users, Info, Wrench } from "lucide-react";
import { api, type Notification } from "../lib/api";
import { timeAgo } from "../lib/format";
import { useNotifications } from "../contexts/NotificationContext";
import { EmptyState, ErrorBanner, PageHeader, Spinner } from "../components/ui";

const ICONS: Record<Notification["type"], React.ElementType> = {
  status: Wrench,
  assignment: ClipboardCheck,
  verification: ClipboardCheck,
  reward: Gift,
  feedback: ClipboardCheck,
  community: Users,
  system: Info,
};

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { setUnread } = useNotifications();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api
      .notifications()
      .then((r) => {
        setItems(r.items);
        setUnread(r.unread);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [setUnread]);

  useEffect(load, [load]);

  const open = async (n: Notification) => {
    if (!n.read) {
      api.markRead(n._id).catch(() => undefined);
      setItems((list) => list.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
      setUnread(Math.max(0, items.filter((x) => !x.read).length - 1));
    }
    if (n.issue) navigate(`/issues/${n.issue._id}`);
  };

  const readAll = async () => {
    await api.markAllRead();
    setItems((list) => list.map((x) => ({ ...x, read: true })));
    setUnread(0);
  };

  const remove = async (n: Notification) => {
    await api.deleteNotification(n._id);
    setItems((list) => list.filter((x) => x._id !== n._id));
    if (!n.read) setUnread(Math.max(0, items.filter((x) => !x.read).length - 1));
  };

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title="Notifications"
        subtitle="Live updates on your reports"
        right={
          items.some((n) => !n.read) ? (
            <button onClick={readAll} className="text-sm font-medium text-primary-700 dark:text-primary-400 flex items-center gap-1">
              <CheckCheck size={16} /> Mark all read
            </button>
          ) : undefined
        }
      />
      {error && <ErrorBanner message={error} onRetry={load} />}
      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState icon={<Bell size={32} />} title="You're all caught up" text="We'll notify you the moment an official updates one of your reports." />
      ) : (
        <ul className="space-y-2">
          {items.map((n) => {
            const Icon = ICONS[n.type] || Bell;
            return (
              <li key={n._id} className={`flex gap-3 p-3.5 rounded-xl border ${n.read ? "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700" : "bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800"}`}>
                <div className={`p-2 rounded-lg h-fit ${n.type === "reward" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200"}`}>
                  <Icon size={18} />
                </div>
                <button onClick={() => open(n)} className="flex-1 text-left min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    {n.title}
                    {!n.read && <span className="w-2 h-2 rounded-full bg-primary-600" aria-label="unread" />}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                </button>
                <button onClick={() => remove(n)} aria-label="Delete notification" className="text-gray-400 hover:text-red-600 self-start p-1">
                  <Trash2 size={16} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default NotificationsPage;
