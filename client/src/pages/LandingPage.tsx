import React, { lazy, Suspense, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Camera, MapPin, ShieldCheck, Wrench, Bell, Trophy, MessageCircle, Moon, Sun, Menu, X, ArrowRight, Building2,
  BarChart3, Timer, Users, Map as MapIcon, Route, FileSpreadsheet, Lock, Smartphone, CheckCircle2, ChevronDown,
  Copy, EyeOff, Inbox, Landmark, Sparkles, LayoutDashboard,
} from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { api, type MapIssue } from "../lib/api";
import { fetchPublicStats, type PublicStats } from "../lib/system";
import { CATEGORY_EMOJI, timeAgo } from "../lib/format";
import { DEFAULT_CENTER } from "../lib/geo";
import { SystemStatusButton } from "../components/SystemStatus";
import type { Category } from "../lib/api";

const IssueMap = lazy(() => import("../components/IssueMap"));
const ADMIN_URL = import.meta.env.VITE_ADMIN_URL || "http://localhost:5174";

const NAV = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#government", label: "For government" },
  { href: "#impact", label: "Live impact" },
  { href: "#faq", label: "FAQ" },
];

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.5 },
};

const Container: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 ${className}`}>{children}</div>
);

const SectionHead: React.FC<{ eyebrow: string; title: string; text?: string }> = ({ eyebrow, title, text }) => (
  <motion.div {...reveal} className="max-w-2xl mx-auto text-center mb-10 sm:mb-14">
    <p className="text-sm font-semibold text-primary-700 dark:text-primary-400 tracking-wide uppercase">{eyebrow}</p>
    <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">{title}</h2>
    {text && <p className="mt-4 text-base sm:text-lg text-gray-600 dark:text-gray-300">{text}</p>}
  </motion.div>
);

// ---------- hero device mockup (pure CSS, no images) ----------

const PhoneMockup: React.FC = () => (
  <div className="relative mx-auto w-[260px] sm:w-[290px]">
    <div className="absolute -inset-10 bg-gradient-to-tr from-primary-300/40 via-sky-300/30 to-amber-200/30 dark:from-primary-700/30 dark:via-sky-700/20 dark:to-transparent blur-3xl rounded-full" aria-hidden />
    <div className="relative rounded-[2.5rem] border-[10px] border-gray-900 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 shadow-2xl overflow-hidden" aria-label="FixMyCity app preview" role="img">
      <div className="h-6 flex justify-center items-center bg-gray-900 dark:bg-gray-700">
        <div className="w-16 h-1.5 rounded-full bg-gray-700 dark:bg-gray-600" />
      </div>
      <div className="p-3 space-y-2.5 text-left">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-gray-900 dark:text-white">Report #A7F3C2</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200 font-semibold">In Progress</span>
        </div>
        <div className="h-28 rounded-xl bg-gradient-to-br from-stone-400 via-stone-500 to-stone-700 relative overflow-hidden">
          <div className="absolute left-6 top-10 w-20 h-9 rounded-[50%] bg-stone-800/80 shadow-inner" />
          <div className="absolute right-3 bottom-2 text-[9px] text-white/90 bg-black/40 px-1.5 py-0.5 rounded">📍 Saheed Nagar</div>
        </div>
        <p className="text-[12px] font-semibold text-gray-900 dark:text-white leading-tight">Deep pothole near the bus stop</p>
        <div className="flex gap-1.5 flex-wrap">
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200">High urgency</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">✓ 3 neighbours confirmed</span>
        </div>
        <ol className="space-y-1.5 pt-1">
          {[
            ["#f59e0b", "Reported", "9:12 AM"],
            ["#0ea5e9", "Verified · routed to PWD", "10:40 AM"],
            ["#6366f1", "Crew assigned", "2:05 PM"],
          ].map(([c, t, time]) => (
            <li key={t} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c }} />
              <span className="text-[10px] text-gray-700 dark:text-gray-200 flex-1">{t}</span>
              <span className="text-[9px] text-gray-400">{time}</span>
            </li>
          ))}
        </ol>
        <div className="flex gap-2 pt-1">
          <div className="flex-1 text-center text-[10px] font-semibold py-1.5 rounded-lg bg-primary-600 text-white">👍 I see this too · 12</div>
        </div>
      </div>
    </div>
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.6 }}
      className="absolute -right-6 sm:-right-16 top-10 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 px-3 py-2 flex items-center gap-2"
    >
      <Bell size={16} className="text-primary-600" aria-hidden />
      <div>
        <p className="text-[11px] font-semibold text-gray-900 dark:text-white">Report verified</p>
        <p className="text-[10px] text-gray-500 dark:text-gray-400">+10 points earned</p>
      </div>
    </motion.div>
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.9 }}
      className="absolute -left-6 sm:-left-20 top-28 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 px-3 py-2 flex items-center gap-2"
    >
      <Building2 size={16} className="text-sky-600" aria-hidden />
      <div>
        <p className="text-[11px] font-semibold text-gray-900 dark:text-white">Auto-routed</p>
        <p className="text-[10px] text-gray-500 dark:text-gray-400">Roads &amp; Infrastructure</p>
      </div>
    </motion.div>
  </div>
);

// ---------- data ----------

const PROBLEMS = [
  {
    icon: Inbox,
    problem: "Complaints disappear",
    detail: "Calls, letters and generic portals give no ticket, no status and no closure. Citizens stop reporting.",
    fix: "Every report gets a public timeline and live notifications from submission to fix.",
  },
  {
    icon: EyeOff,
    problem: "No proof, vague locations",
    detail: "\"Near the market\" doesn't get a crew to the right spot. Officials can't verify what they can't see.",
    fix: "Geotagged photos/videos and a GPS pin are captured at the scene, in under a minute.",
  },
  {
    icon: Copy,
    problem: "Duplicates & no accountability",
    detail: "Ten people report the same pothole; nobody knows which department owns it or how long it has been open.",
    fix: "50 m duplicate detection, automatic department routing, and SLA timers visible to everyone.",
  },
];

const STEPS = [
  { icon: Camera, title: "Snap", text: "Take a photo or video of the problem straight from the app." },
  { icon: MapPin, title: "Pin", text: "GPS fills in the exact spot, address and ward. Drag to adjust." },
  { icon: ShieldCheck, title: "Verify", text: "Neighbours confirm it; officials verify and route it to the right department." },
  { icon: Wrench, title: "Resolve", text: "The crew fixes it, you get notified, and you confirm it's really done." },
];

const CITIZEN_FEATURES = [
  { icon: Camera, title: "Photo & video evidence", text: "Up to 5 files per report, captured from the camera." },
  { icon: MapIcon, title: "Live issue map", text: "See what's already reported around you before you report." },
  { icon: Copy, title: "No duplicate reports", text: "Similar issues within 50 m are shown first, so you can upvote instead." },
  { icon: ShieldCheck, title: "Crowd verification", text: "Confirm reports near you; 3 confirmations fast-track a report." },
  { icon: Bell, title: "Real-time updates", text: "Instant in-app alerts and email the moment the status changes." },
  { icon: Trophy, title: "Points & leaderboard", text: "Earn reputation for verified reports and climb the city leaderboard." },
  { icon: MessageCircle, title: "Smart assistant", text: "Ask how to report, check your reports, or get a category suggestion." },
  { icon: Moon, title: "Any device, light or dark", text: "Mobile-first design that works on phones, tablets and desktops." },
];

const AUTHORITY_FEATURES = [
  { icon: LayoutDashboard, title: "Command center", text: "City-wide live dashboard: open issues, SLA breaches, trends." },
  { icon: ShieldCheck, title: "Verification queue", text: "Most-upvoted first, with duplicate and community-verified flags." },
  { icon: Route, title: "Auto-routing & assignment", text: "Category → department automatically; assign field workers in one click." },
  { icon: Timer, title: "SLA tracking", text: "Critical in 24 h, high in 3 days. Breaches are surfaced, not hidden." },
  { icon: MapIcon, title: "Hotspot map", text: "Clusters of recurring problems show where infrastructure is failing." },
  { icon: BarChart3, title: "Ward & department analytics", text: "Resolution rates, average fix times and citizen satisfaction." },
  { icon: Users, title: "Role-based access", text: "Admins see the city; staff see only their department's queue." },
  { icon: FileSpreadsheet, title: "Export & audit trail", text: "CSV/JSON exports and a full timeline for every action taken." },
];

const GOV_BENEFITS = [
  { icon: Timer, title: "Faster resolution", text: "Precise location + photo proof means crews go once, to the right spot, with the right equipment." },
  { icon: BarChart3, title: "Data-driven budgeting", text: "Ward hotspots and category trends show where repair budgets actually need to go." },
  { icon: Landmark, title: "Public trust & transparency", text: "Citizens see progress in real time; satisfaction feedback closes the loop." },
  { icon: Smartphone, title: "Zero hardware rollout", text: "Runs in any browser. No app-store install, no on-premise servers to maintain." },
];

const FAQ = [
  { q: "Is FixMyCity free for citizens?", a: "Yes. Citizens sign up with a mobile number and email and can report, track, upvote and verify issues at no cost." },
  { q: "What kinds of problems can I report?", a: "Potholes and damaged roads, garbage and sanitation, streetlights, electrical hazards, water supply and leaks, drainage and open manholes, traffic and parking, trees, parks and pollution, and anything else civic." },
  { q: "How do you stop fake or spam reports?", a: "Reports carry photo/GPS evidence, nearby citizens confirm or dispute them, officials verify before dispatching crews, and reports rejected as spam cost the reporter points." },
  { q: "What happens if the same issue is reported twice?", a: "Before submitting, the app shows open issues of the same category within 50 m and suggests upvoting. If a duplicate still comes in, it is linked to the original so officials handle them together." },
  { q: "Who sees my phone number and email?", a: "Only municipal officials handling your report. Public views show your report, not your contact details." },
  { q: "How does a city or department get onboarded?", a: "Admins create departments, map categories to them and add staff accounts from the command center. No installation is needed; it runs in the browser." },
  { q: "The site says the server is asleep. What does that mean?", a: "The demo runs on free cloud hosting that sleeps after 15 minutes without traffic. Press “Wake / restart server” in System status; it boots in about 30–60 seconds." },
];

// ---------- page ----------

const LandingPage: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [tab, setTab] = useState<"citizens" | "authorities">("citizens");
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [statsError, setStatsError] = useState(false);
  const [pins, setPins] = useState<MapIssue[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    fetchPublicStats()
      .then(setStats)
      .catch(() => setStatsError(true));
    api.mapIssues({ status: "pending,verified,in-progress,resolved" }).then(setPins).catch(() => undefined);
  }, []);

  const primaryCta = isAuthenticated ? "/report" : "/signup";
  const t = stats?.totals;
  const statItems = [
    { label: "Issues reported", value: t ? t.reports.toLocaleString("en-IN") : "—" },
    { label: "Resolution rate", value: t ? `${t.resolutionRate}%` : "—" },
    { label: "Avg. time to fix", value: t?.avgResolutionHours != null ? (t.avgResolutionHours < 48 ? `${t.avgResolutionHours} h` : `${Math.round(t.avgResolutionHours / 24)} days`) : "—" },
    { label: "Active citizens", value: t ? t.citizens.toLocaleString("en-IN") : "—" },
  ];
  const maxCat = Math.max(1, ...(stats?.byCategory.map((c) => c.count) ?? [1]));

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 overflow-x-hidden">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[2000] bg-white text-gray-900 px-3 py-2 rounded">
        Skip to content
      </a>

      {/* ---------- header ---------- */}
      <header className="sticky top-0 z-[1000] bg-white/80 dark:bg-gray-950/80 backdrop-blur border-b border-gray-200/70 dark:border-gray-800">
        <Container className="h-16 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg shrink-0" aria-label="FixMyCity home">
            <img src="/icon.svg" alt="" className="w-8 h-8" />
            <span>
              Fix<span className="text-primary-600 dark:text-primary-400">MyCity</span>
            </span>
          </Link>
          <nav className="hidden lg:flex items-center gap-1 ml-6" aria-label="Sections">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800">
                {n.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <SystemStatusButton compact className="sm:hidden" />
            <SystemStatusButton className="hidden sm:inline-flex" />
            <button onClick={toggleTheme} aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"} className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            {isAuthenticated ? (
              <Link to="/" className="hidden sm:inline-flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2 rounded-lg">
                Open app <ArrowRight size={16} />
              </Link>
            ) : (
              <>
                <Link to="/login" className="hidden md:inline-flex text-sm font-medium px-3 py-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">
                  Sign in
                </Link>
                <Link to="/signup" className="hidden sm:inline-flex bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2 rounded-lg">
                  Get started
                </Link>
              </>
            )}
            <button onClick={() => setMenuOpen((v) => !v)} className="lg:hidden p-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Menu" aria-expanded={menuOpen}>
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </Container>
        {menuOpen && (
          <div className="lg:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
            <Container className="py-3 flex flex-col">
              {NAV.map((n) => (
                <a key={n.href} href={n.href} onClick={() => setMenuOpen(false)} className="py-2.5 text-base font-medium text-gray-700 dark:text-gray-200">
                  {n.label}
                </a>
              ))}
              <div className="grid grid-cols-2 gap-2 pt-3">
                {isAuthenticated ? (
                  <Link to="/" className="col-span-2 text-center bg-primary-600 text-white font-semibold py-2.5 rounded-lg">
                    Open app
                  </Link>
                ) : (
                  <>
                    <Link to="/login" className="text-center border border-gray-300 dark:border-gray-700 font-medium py-2.5 rounded-lg">
                      Sign in
                    </Link>
                    <Link to="/signup" className="text-center bg-primary-600 text-white font-semibold py-2.5 rounded-lg">
                      Get started
                    </Link>
                  </>
                )}
              </div>
            </Container>
          </div>
        )}
      </header>

      <main id="main">
        {/* ---------- hero ---------- */}
        <section className="relative">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary-50 via-white to-white dark:from-primary-950/40 dark:via-gray-950 dark:to-gray-950" aria-hidden />
          <Container className="pt-12 sm:pt-20 pb-16 sm:pb-24 grid lg:grid-cols-2 gap-14 lg:gap-8 items-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center lg:text-left">
              <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium px-3 py-1 rounded-full bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200">
                <Sparkles size={14} aria-hidden /> Smart India Hackathon 2025 · Bhubaneswar pilot
              </span>
              <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]">
                See it. Snap it.
                <br />
                <span className="text-primary-600 dark:text-primary-400">Get it fixed.</span>
              </h1>
              <p className="mt-5 text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-xl mx-auto lg:mx-0">
                FixMyCity connects citizens and municipal teams in one transparent loop: geotagged reports, neighbour verification, automatic routing to the right department, and real-time updates until the problem is solved.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <button onClick={() => navigate(primaryCta)} className="inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-3.5 rounded-xl shadow-lg shadow-primary-600/25 text-base">
                  <Camera size={20} aria-hidden /> Report an issue
                </button>
                <a href={ADMIN_URL} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold px-6 py-3.5 rounded-xl text-base">
                  <Landmark size={20} aria-hidden /> For authorities
                </a>
              </div>
              <dl className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 max-w-xl mx-auto lg:mx-0">
                {statItems.map((s) => (
                  <div key={s.label} className="text-center lg:text-left">
                    <dt className="text-xs text-gray-500 dark:text-gray-400 order-2">{s.label}</dt>
                    <dd className={`text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white ${!stats && !statsError ? "animate-pulse" : ""}`}>{s.value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                {stats ? "Live numbers from the platform." : statsError ? "Live numbers unavailable: the server may be asleep. Use System status to wake it." : "Loading live numbers…"}
              </p>
            </motion.div>
            <PhoneMockup />
          </Container>
        </section>

        {/* ---------- problem ---------- */}
        <section className="py-16 sm:py-24 bg-gray-50 dark:bg-gray-900/50">
          <Container>
            <SectionHead eyebrow="Why it matters" title="Civic complaints shouldn't vanish into a void" text="Most cities already have complaint channels. What they lack is evidence, routing and accountability. That's the gap FixMyCity closes." />
            <div className="grid md:grid-cols-3 gap-5">
              {PROBLEMS.map((p, i) => (
                <motion.article key={p.problem} {...reveal} transition={{ duration: 0.5, delay: i * 0.1 }} className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 flex flex-col">
                  <div className="w-11 h-11 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center">
                    <p.icon size={22} aria-hidden />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{p.problem}</h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 flex-1">{p.detail}</p>
                  <p className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 text-sm text-gray-800 dark:text-gray-200 flex gap-2">
                    <CheckCircle2 size={18} className="text-primary-600 dark:text-primary-400 shrink-0 mt-0.5" aria-hidden />
                    {p.fix}
                  </p>
                </motion.article>
              ))}
            </div>
          </Container>
        </section>

        {/* ---------- how it works ---------- */}
        <section id="how" className="py-16 sm:py-24 scroll-mt-16">
          <Container>
            <SectionHead eyebrow="How it works" title="From pothole to patched, in four steps" text="Reporting takes under a minute. Everything after that is visible to the citizen who reported it." />
            <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 relative">
              {STEPS.map((s, i) => (
                <motion.li key={s.title} {...reveal} transition={{ duration: 0.5, delay: i * 0.1 }} className="relative bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
                  <span className="absolute top-5 right-5 text-5xl font-black text-gray-100 dark:text-gray-800 select-none" aria-hidden>
                    {i + 1}
                  </span>
                  <div className="w-12 h-12 rounded-xl bg-primary-600 text-white flex items-center justify-center shadow-lg shadow-primary-600/20">
                    <s.icon size={24} aria-hidden />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">
                    <span className="sr-only">Step {i + 1}: </span>
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{s.text}</p>
                </motion.li>
              ))}
            </ol>
          </Container>
        </section>

        {/* ---------- features ---------- */}
        <section id="features" className="py-16 sm:py-24 bg-gray-50 dark:bg-gray-900/50 scroll-mt-16">
          <Container>
            <SectionHead eyebrow="Features" title="Built for both sides of the problem" />
            <div className="flex justify-center mb-8">
              <div className="inline-flex p-1 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800" role="tablist">
                {(["citizens", "authorities"] as const).map((k) => (
                  <button
                    key={k}
                    role="tab"
                    aria-selected={tab === k}
                    onClick={() => setTab(k)}
                    className={`px-4 sm:px-6 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === k ? "bg-primary-600 text-white" : "text-gray-600 dark:text-gray-300"}`}
                  >
                    {k === "citizens" ? "For citizens" : "For authorities"}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4" role="tabpanel">
              {(tab === "citizens" ? CITIZEN_FEATURES : AUTHORITY_FEATURES).map((f, i) => (
                <motion.div key={`${tab}-${f.title}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800">
                  <f.icon size={22} className="text-primary-600 dark:text-primary-400" aria-hidden />
                  <h3 className="mt-3 font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400">{f.text}</p>
                </motion.div>
              ))}
            </div>
            <div className="mt-8 text-center">
              {tab === "citizens" ? (
                <button onClick={() => navigate(primaryCta)} className="inline-flex items-center gap-2 text-primary-700 dark:text-primary-400 font-semibold">
                  Start reporting <ArrowRight size={16} />
                </button>
              ) : (
                <a href={ADMIN_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-primary-700 dark:text-primary-400 font-semibold">
                  Open the command center <ArrowRight size={16} />
                </a>
              )}
            </div>
          </Container>
        </section>

        {/* ---------- live impact ---------- */}
        <section id="impact" className="py-16 sm:py-24 scroll-mt-16">
          <Container>
            <SectionHead eyebrow="Live impact" title="What's happening in the city right now" text="Real data from the platform: every pin is a citizen report, colour-coded by its current status." />
            <div className="grid lg:grid-cols-5 gap-5">
              <motion.div {...reveal} className="lg:col-span-3 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900 min-h-[320px]">
                <Suspense fallback={<div className="h-[420px] animate-pulse" />}>
                  <IssueMap issues={pins} center={DEFAULT_CENTER} zoom={12} className="h-[320px] sm:h-[420px] lg:h-full !rounded-none" interactive />
                </Suspense>
              </motion.div>
              <motion.div {...reveal} className="lg:col-span-2 flex flex-col gap-5">
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800">
                  <h3 className="font-semibold">Recently fixed</h3>
                  {!stats ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">{statsError ? "Waiting for the server…" : "Loading…"}</p>
                  ) : stats.recentResolved.length === 0 ? (
                    <p className="text-sm text-gray-500 mt-3">Nothing resolved yet.</p>
                  ) : (
                    <ul className="mt-3 divide-y divide-gray-100 dark:divide-gray-800">
                      {stats.recentResolved.slice(0, 5).map((r) => (
                        <li key={r.id} className="py-2.5 flex items-start gap-3">
                          <span className="text-xl" aria-hidden>
                            {CATEGORY_EMOJI[r.category as Category] ?? "📍"}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{r.title}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {r.ward ?? "—"} · {r.department?.code ?? ""} · fixed {timeAgo(r.resolvedAt)}
                              {r.hoursToResolve != null ? ` in ${r.hoursToResolve < 48 ? `${r.hoursToResolve} h` : `${Math.round(r.hoursToResolve / 24)} d`}` : ""}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800">
                  <h3 className="font-semibold">Reports by category</h3>
                  <ul className="mt-3 space-y-2.5">
                    {(stats?.byCategory ?? []).slice(0, 6).map((c) => (
                      <li key={c.category}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700 dark:text-gray-300">{c.label}</span>
                          <span className="font-medium tabular-nums">{c.count}</span>
                        </div>
                        <div className="h-2 rounded bg-primary-50 dark:bg-gray-800">
                          <div className="h-2 rounded bg-primary-600" style={{ width: `${(c.count / maxCat) * 100}%` }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            </div>
            {t && (
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  ["Open right now", t.open],
                  ["Community-verified", t.communityVerified],
                  ["Departments onboard", t.departments],
                  ["Wards covered", t.wards],
                ].map(([l, v]) => (
                  <div key={l} className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4 text-center">
                    <p className="text-2xl font-bold">{Number(v).toLocaleString("en-IN")}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{l}</p>
                  </div>
                ))}
              </div>
            )}
          </Container>
        </section>

        {/* ---------- government ---------- */}
        <section id="government" className="py-16 sm:py-24 bg-gray-900 dark:bg-black text-white scroll-mt-16">
          <Container>
            <motion.div {...reveal} className="max-w-2xl mx-auto text-center mb-12">
              <p className="text-sm font-semibold text-primary-400 tracking-wide uppercase">For municipal bodies</p>
              <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">A command center your departments will actually use</h2>
              <p className="mt-4 text-lg text-gray-300">Turn scattered complaints into a verified, routed, measurable work queue, and show citizens the results.</p>
            </motion.div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {GOV_BENEFITS.map((b, i) => (
                <motion.div key={b.title} {...reveal} transition={{ duration: 0.5, delay: i * 0.08 }} className="rounded-2xl p-6 bg-white/5 border border-white/10">
                  <b.icon size={24} className="text-primary-400" aria-hidden />
                  <h3 className="mt-4 font-semibold text-lg">{b.title}</h3>
                  <p className="mt-2 text-sm text-gray-300">{b.text}</p>
                </motion.div>
              ))}
            </div>
            <div className="mt-12 grid lg:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-xl font-semibold">Go live in four steps</h3>
                <ol className="mt-5 space-y-4">
                  {[
                    ["Set up departments", "Create departments and map each issue category to the team that owns it."],
                    ["Add staff", "Invite admins and field officers; staff only see their department's queue."],
                    ["Announce to citizens", "Share the link or a QR code. No app-store install required."],
                    ["Track & improve", "Use SLA, ward and satisfaction analytics in weekly review meetings."],
                  ].map(([title, text], i) => (
                    <li key={title} className="flex gap-4">
                      <span className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-sm font-bold shrink-0">{i + 1}</span>
                      <div>
                        <p className="font-medium">{title}</p>
                        <p className="text-sm text-gray-400">{text}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/10 p-6 sm:p-8">
                <Lock size={24} className="text-primary-400" aria-hidden />
                <h3 className="mt-3 text-xl font-semibold">Secure by design</h3>
                <ul className="mt-4 space-y-2.5 text-sm text-gray-300">
                  {[
                    "Role-based access: citizen, department staff, administrator",
                    "Hashed passwords, signed tokens, rate-limited endpoints",
                    "Citizen contact details hidden from the public",
                    "Full audit timeline on every report",
                    "Cloud-hosted: MongoDB Atlas, Cloudinary media, transactional email",
                  ].map((x) => (
                    <li key={x} className="flex gap-2">
                      <CheckCircle2 size={18} className="text-primary-400 shrink-0" aria-hidden /> {x}
                    </li>
                  ))}
                </ul>
                <a href={ADMIN_URL} target="_blank" rel="noreferrer" className="mt-6 inline-flex w-full sm:w-auto items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-semibold px-6 py-3 rounded-xl">
                  <LayoutDashboard size={18} aria-hidden /> Open command center
                </a>
              </div>
            </div>
          </Container>
        </section>

        {/* ---------- FAQ ---------- */}
        <section id="faq" className="py-16 sm:py-24 scroll-mt-16">
          <Container className="max-w-3xl">
            <SectionHead eyebrow="FAQ" title="Questions, answered" />
            <div className="divide-y divide-gray-200 dark:divide-gray-800 border-y border-gray-200 dark:border-gray-800">
              {FAQ.map((f, i) => (
                <div key={f.q}>
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)} aria-expanded={openFaq === i} className="w-full flex items-center justify-between gap-4 py-4 text-left font-medium">
                    {f.q}
                    <ChevronDown size={18} className={`shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`} aria-hidden />
                  </button>
                  {openFaq === i && <p className="pb-4 text-gray-600 dark:text-gray-400">{f.a}</p>}
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* ---------- CTA ---------- */}
        <section className="pb-16 sm:pb-24">
          <Container>
            <motion.div {...reveal} className="rounded-3xl bg-gradient-to-br from-primary-600 to-emerald-700 text-white p-8 sm:p-12 text-center">
              <h2 className="text-3xl sm:text-4xl font-bold">Your street. Your report. Your city.</h2>
              <p className="mt-3 text-primary-100 text-lg max-w-xl mx-auto">Join the citizens and officials making Bhubaneswar's streets safer, cleaner and better lit.</p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <button onClick={() => navigate(primaryCta)} className="bg-white text-primary-800 font-semibold px-6 py-3.5 rounded-xl hover:bg-primary-50">
                  {isAuthenticated ? "Report an issue" : "Create free account"}
                </button>
                <a href={ADMIN_URL} target="_blank" rel="noreferrer" className="border border-white/40 font-semibold px-6 py-3.5 rounded-xl hover:bg-white/10">
                  Official login
                </a>
              </div>
            </motion.div>
          </Container>
        </section>
      </main>

      {/* ---------- footer ---------- */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-10">
        <Container className="grid gap-8 md:grid-cols-4 text-sm">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 font-bold text-lg">
              <img src="/icon.svg" alt="" className="w-7 h-7" /> FixMyCity
            </div>
            <p className="mt-3 text-gray-600 dark:text-gray-400 max-w-sm">Civic issue reporting and resolution platform, built for Smart India Internal Hackathon 2025.</p>
            <p className="mt-3 text-gray-500 dark:text-gray-500">Team: Sagar Swain, Saanvi Sahoo · Mentors: Aditya Narayan Das, Sumanta Sahoo</p>
          </div>
          <div>
            <p className="font-semibold mb-3">Platform</p>
            <ul className="space-y-2 text-gray-600 dark:text-gray-400">
              <li><Link to={primaryCta} className="hover:text-gray-900 dark:hover:text-white">Report an issue</Link></li>
              <li><Link to="/login" className="hover:text-gray-900 dark:hover:text-white">Citizen sign in</Link></li>
              <li><a href={ADMIN_URL} className="hover:text-gray-900 dark:hover:text-white">Command center</a></li>
              <li><Link to="/status" className="hover:text-gray-900 dark:hover:text-white">System status</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-3">Project</p>
            <ul className="space-y-2 text-gray-600 dark:text-gray-400">
              <li><a href="https://github.com/SagarSwain05/FixMyCity" target="_blank" rel="noreferrer" className="hover:text-gray-900 dark:hover:text-white">Source code (GitHub)</a></li>
              <li><a href="#how" className="hover:text-gray-900 dark:hover:text-white">How it works</a></li>
              <li><a href="#faq" className="hover:text-gray-900 dark:hover:text-white">FAQ</a></li>
            </ul>
            <SystemStatusButton className="mt-4" />
          </div>
        </Container>
        <Container className="mt-8 text-xs text-gray-500">© {new Date().getFullYear()} FixMyCity · MIT License · Map data © OpenStreetMap contributors</Container>
      </footer>
    </div>
  );
};

export default LandingPage;
