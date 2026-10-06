import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Plus, MapPin, ArrowRight, FileText, CheckCircle2, Trophy, Inbox } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import { api, type Issue, type MapIssue, type RewardsSummary } from "../lib/api";
import { usePosition } from "../lib/usePosition";
import { distanceMeters, formatDistance } from "../lib/geo";
import IssueCard from "../components/IssueCard";
import IssueMap from "../components/IssueMap";
import VerifyNearbyCard from "../components/VerifyNearbyCard";
import { EmptyState, ErrorBanner, Spinner } from "../components/ui";

type Tab = "nearby" | "latest" | "popular";
const TABS: Array<{ id: Tab; label: string }> = [
  { id: "nearby", label: "Near me" },
  { id: "latest", label: "Latest" },
  { id: "popular", label: "Most upvoted" },
];

const HomePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { position, center, isFallback } = usePosition();
  const [tab, setTab] = useState<Tab>("nearby");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [mapIssues, setMapIssues] = useState<MapIssue[]>([]);
  const [queue, setQueue] = useState<Issue[]>([]);
  const [summary, setSummary] = useState<RewardsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params =
        tab === "nearby"
          ? { lat: center.lat, lng: center.lng, radius: 5000, status: "open", limit: 20 }
          : tab === "popular"
            ? { sort: "upvotes" as const, limit: 20 }
            : { limit: 20 };
      setIssues((await api.listIssues(params)).items);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [tab, center.lat, center.lng]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  useEffect(() => {
    api.mapIssues({ status: "pending,verified,in-progress" }).then(setMapIssues).catch(() => undefined);
    api.rewards().then(setSummary).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (position) api.verifyQueue(position.lat, position.lng).then(setQueue).catch(() => undefined);
  }, [position]);

  const upvote = async (issue: Issue) => {
    try {
      const r = await api.upvote(issue.id);
      setIssues((list) => list.map((i) => (i.id === issue.id ? { ...i, hasUpvoted: r.upvoted, upvoteCount: r.upvoteCount } : i)));
    } catch {
      /* ignore */
    }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const nearbyPins = mapIssues.filter((i) => distanceMeters(center, i.coordinates) < 5000);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {greeting}, {user?.fullName.split(" ")[0]} 👋
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm mt-0.5">Spotted a problem in your area? Report it in under a minute.</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: FileText, label: "My reports", value: summary?.stats.reports, to: "/my-reports" },
          { icon: CheckCircle2, label: "Resolved", value: summary?.stats.resolved, to: "/my-reports?status=resolved" },
          { icon: Trophy, label: summary?.rank ? `Rank #${summary.rank}` : "Points", value: summary?.points ?? user?.points, to: "/rewards" },
        ].map(({ icon: Icon, label, value, to }) => (
          <Link key={label} to={to} className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 hover:border-primary-300">
            <Icon size={18} className="text-primary-600 dark:text-primary-400" />
            <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{value ?? "–"}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
          </Link>
        ))}
      </div>

      <button
        onClick={() => navigate("/report")}
        className="md:hidden w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3.5 rounded-xl shadow-md shadow-primary-600/20"
      >
        <Plus size={20} /> Report an issue
      </button>

      {position && queue.length > 0 && (
        <VerifyNearbyCard issues={queue} position={position} onDone={(id) => setQueue((q) => q.filter((i) => i.id !== id))} />
      )}

      {/* Map preview */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between p-4 pb-3">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Open issues around you</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
              <MapPin size={12} /> {isFallback ? "Showing city centre (location off)" : "Within 5 km of you"} · {nearbyPins.length} open
            </p>
          </div>
          <Link to="/map" className="text-sm font-medium text-primary-700 dark:text-primary-400 flex items-center gap-1">
            Full map <ArrowRight size={14} />
          </Link>
        </div>
        <IssueMap issues={nearbyPins} center={center} user={position} radius={5000} zoom={13} className="h-56" onSelect={(i) => navigate(`/issues/${i.id}`)} />
      </section>

      {/* Feed */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Community reports</h2>
        </div>
        <div className="flex gap-2 mb-4 overflow-x-auto" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
                tab === t.id ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900" : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {error && <ErrorBanner message={error} onRetry={loadFeed} />}
        {loading ? (
          <Spinner />
        ) : issues.length === 0 && !error ? (
          <EmptyState icon={<Inbox size={32} />} title="No reports here yet" text="Be the first to report a problem in your area." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {issues.map((i) => (
              <IssueCard
                key={i.id}
                issue={i}
                onClick={() => navigate(`/issues/${i.id}`)}
                onUpvote={() => upvote(i)}
                distance={position && i.coordinates ? formatDistance(distanceMeters(position, i.coordinates)) : undefined}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default HomePage;
