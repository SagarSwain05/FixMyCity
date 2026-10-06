import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Camera, ImagePlus, LocateFixed, X, AlertTriangle, CheckCircle2, ThumbsUp, Loader2, Video } from "lucide-react";
import { motion } from "framer-motion";
import { api, type Category, type Issue, type Urgency } from "../lib/api";
import { CATEGORIES, CATEGORY_EMOJI, URGENCY_LABEL, timeAgo } from "../lib/format";
import { DEFAULT_CENTER, distanceMeters, formatDistance, getCurrentPosition, reverseGeocode, type LatLng } from "../lib/geo";
import LocationPicker from "../components/LocationPicker";
import { PageHeader, StatusBadge, btnPrimary, btnSecondary, inputClass } from "../components/ui";
import { useAuth } from "../contexts/AuthContext";

const MAX_FILES = 5;
const MAX_BYTES = 15 * 1024 * 1024;

const TITLE_SUGGESTIONS: Record<Category, string> = {
  roads: "Pothole on the road",
  sanitation: "Garbage not collected",
  streetlights: "Streetlight not working",
  electricity: "Electrical hazard",
  water: "Water leakage",
  drainage: "Blocked drain / open manhole",
  traffic: "Traffic signal / parking problem",
  environment: "Environmental issue",
  other: "",
};

interface Preview {
  file: File;
  url: string;
}

const Section: React.FC<{ step: number; title: string; children: React.ReactNode; hint?: string }> = ({ step, title, hint, children }) => (
  <section className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
    <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
      <span className="w-6 h-6 rounded-full bg-primary-600 text-white text-xs flex items-center justify-center">{step}</span>
      {title}
    </h2>
    {hint && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-8">{hint}</p>}
    <div className="mt-3">{children}</div>
  </section>
);

const ReportIssuePage: React.FC = () => {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [params] = useSearchParams();
  const initialCategory = CATEGORIES.some((c) => c.value === params.get("category")) ? (params.get("category") as Category) : null;

  const [files, setFiles] = useState<Preview[]>([]);
  const [category, setCategory] = useState<Category | null>(initialCategory);
  const [title, setTitle] = useState(initialCategory ? TITLE_SUGGESTIONS[initialCategory] : "");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("medium");
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [address, setAddress] = useState("");
  const [ward, setWard] = useState<string | undefined>();
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<Issue[]>([]);
  const [dupAcknowledged, setDupAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Issue | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const geocodeSeq = useRef(0);

  const setLocation = useCallback(async (p: LatLng) => {
    setCoords(p);
    const seq = ++geocodeSeq.current;
    const r = await reverseGeocode(p);
    if (seq !== geocodeSeq.current) return; // a newer pin position won
    setAddress(r.address);
    setWard(r.ward);
  }, []);

  const locate = useCallback(async () => {
    setLocating(true);
    setLocError(null);
    try {
      await setLocation(await getCurrentPosition());
    } catch (e) {
      setLocError((e as Error).message);
      if (!coords) setCoords(DEFAULT_CENTER);
    } finally {
      setLocating(false);
    }
  }, [setLocation, coords]);

  // Pull GPS as soon as the form opens so the photo is tagged with where it was taken.
  useEffect(() => {
    locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => files.forEach((f) => URL.revokeObjectURL(f.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Deduplication check whenever location or category changes.
  useEffect(() => {
    if (!coords || !category) return;
    setDupAcknowledged(false);
    const t = setTimeout(() => {
      api
        .nearby(coords.lat, coords.lng, category)
        .then((r) => setDuplicates(r.items))
        .catch(() => setDuplicates([]));
    }, 400);
    return () => clearTimeout(t);
  }, [coords, category]);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setError(null);
    const incoming = Array.from(list).filter((f) => {
      if (f.size > MAX_BYTES) {
        setError(`${f.name} is larger than 15 MB`);
        return false;
      }
      return f.type.startsWith("image/") || f.type.startsWith("video/");
    });
    setFiles((prev) => [...prev, ...incoming.map((file) => ({ file, url: URL.createObjectURL(file) }))].slice(0, MAX_FILES));
  };

  const removeFile = (i: number) =>
    setFiles((prev) => {
      URL.revokeObjectURL(prev[i].url);
      return prev.filter((_, idx) => idx !== i);
    });

  const pickCategory = (c: Category) => {
    if (!title || Object.values(TITLE_SUGGESTIONS).includes(title)) setTitle(TITLE_SUGGESTIONS[c]);
    setCategory(c);
  };

  const upvoteExisting = async (issue: Issue) => {
    try {
      if (!issue.hasUpvoted && !issue.isOwner) await api.upvote(issue.id);
      navigate(`/issues/${issue.id}`);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!category) return setError("Choose a category");
    if (title.trim().length < 3) return setError("Add a short title (at least 3 characters)");
    if (!coords) return setError("Set the location of the problem");
    if (duplicates.length && !dupAcknowledged) return setError("A similar issue already exists nearby. Upvote it, or confirm yours is different.");
    setSubmitting(true);
    try {
      const issue = await api.createIssue({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        urgency,
        location: address || undefined,
        ward,
        coordinates: coords,
        files: files.map((f) => f.file),
      });
      setCreated(issue);
      refreshUser().catch(() => undefined);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (created) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto text-center bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 mt-6">
        <CheckCircle2 size={56} className="mx-auto text-primary-600" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mt-4">Report submitted!</h1>
        <p className="text-gray-600 dark:text-gray-300 text-sm mt-2">
          You earned <b>+5 points</b>. It was routed to <b>{created.assignedDepartment?.name || "the city"}</b>. You'll get another <b>+10</b> when officials verify it.
        </p>
        {created.possibleDuplicateOf && (
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-3">It was linked to a similar report nearby so officials can handle them together.</p>
        )}
        <div className="flex gap-2 mt-6">
          <Link to={`/issues/${created.id}`} className={`${btnPrimary} flex-1`}>
            Track report
          </Link>
          <button onClick={() => navigate("/")} className={`${btnSecondary} flex-1`}>
            Done
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 max-w-2xl mx-auto">
      <PageHeader title="Report an issue" subtitle="Photo, location and a short description help officials act fast." />

      <Section step={1} title="Add photos or video" hint="Clear proof gets verified faster. Up to 5 files, 15 MB each.">
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {files.map((f, i) => (
            <div key={f.url} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
              {f.file.type.startsWith("video/") ? (
                <video src={f.url} className="w-full h-full object-cover" muted />
              ) : (
                <img src={f.url} alt={`Attachment ${i + 1}`} className="w-full h-full object-cover" />
              )}
              {f.file.type.startsWith("video/") && <Video size={16} className="absolute bottom-1 left-1 text-white drop-shadow" />}
              <button type="button" onClick={() => removeFile(i)} aria-label="Remove file" className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1">
                <X size={14} />
              </button>
            </div>
          ))}
          {files.length < MAX_FILES && (
            <>
              <button type="button" onClick={() => cameraRef.current?.click()} className="aspect-square rounded-lg border-2 border-dashed border-primary-400 text-primary-700 dark:text-primary-400 flex flex-col items-center justify-center text-xs font-medium gap-1 hover:bg-primary-50 dark:hover:bg-primary-900/20">
                <Camera size={22} /> Camera
              </button>
              <button type="button" onClick={() => galleryRef.current?.click()} className="aspect-square rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 flex flex-col items-center justify-center text-xs font-medium gap-1 hover:bg-gray-50 dark:hover:bg-gray-700">
                <ImagePlus size={22} /> Gallery
              </button>
            </>
          )}
        </div>
        <input ref={cameraRef} type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={(e) => (addFiles(e.target.files), (e.target.value = ""))} />
        <input ref={galleryRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => (addFiles(e.target.files), (e.target.value = ""))} />
      </Section>

      <Section step={2} title="Where is it?" hint="We used your GPS. Tap the map or drag the pin to adjust.">
        <div className="flex gap-2 mb-3">
          <button type="button" onClick={locate} disabled={locating} className={`${btnSecondary} text-sm py-2`}>
            {locating ? <Loader2 size={16} className="animate-spin" /> : <LocateFixed size={16} />} Use my location
          </button>
          {ward && <span className="self-center text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">Ward: {ward}</span>}
        </div>
        {locError && <p className="text-xs text-amber-700 dark:text-amber-300 mb-2">{locError}</p>}
        {coords ? <LocationPicker value={coords} onChange={setLocation} radius={50} /> : <div className="h-56 rounded-xl bg-gray-100 dark:bg-gray-700 animate-pulse" />}
        <label htmlFor="address" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mt-3 mb-1">
          Address / landmark
        </label>
        <input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Near City Hospital, Saheed Nagar" className={inputClass} />
      </Section>

      <Section step={3} title="What's the problem?">
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map((c) => (
            <button
              type="button"
              key={c.value}
              onClick={() => pickCategory(c.value)}
              aria-pressed={category === c.value}
              className={`p-2.5 rounded-xl border-2 text-center transition-colors ${
                category === c.value ? "border-primary-600 bg-primary-50 dark:bg-primary-900/30" : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="text-2xl">{CATEGORY_EMOJI[c.value]}</div>
              <div className="text-xs font-medium text-gray-800 dark:text-gray-100 mt-1 leading-tight">{c.label}</div>
            </button>
          ))}
        </div>

        {duplicates.length > 0 && (
          <div className="mt-4 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-3">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-2">
              <AlertTriangle size={16} /> Similar {duplicates.length > 1 ? `issues (${duplicates.length})` : "issue"} already reported within 50 m
            </p>
            <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">Upvoting an existing report gets it fixed faster than a new one.</p>
            <div className="mt-2 space-y-2">
              {duplicates.map((d) => (
                <div key={d.id} className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg p-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{d.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {coords && d.coordinates ? `${formatDistance(distanceMeters(coords, d.coordinates))} away · ` : ""}
                      {timeAgo(d.createdAt)} · 👍 {d.upvoteCount}
                    </p>
                  </div>
                  <StatusBadge status={d.status} />
                  <button type="button" onClick={() => upvoteExisting(d)} className="inline-flex items-center gap-1 text-xs font-semibold bg-primary-600 text-white px-2.5 py-1.5 rounded-lg">
                    <ThumbsUp size={12} /> Upvote
                  </button>
                </div>
              ))}
            </div>
            <label className="flex items-center gap-2 mt-3 text-xs text-gray-700 dark:text-gray-200">
              <input type="checkbox" checked={dupAcknowledged} onChange={(e) => setDupAcknowledged(e.target.checked)} className="rounded" />
              Mine is a different problem, report it anyway
            </label>
          </div>
        )}

        <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mt-4 mb-1">
          Title
        </label>
        <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} required placeholder="e.g. Deep pothole near bus stop" className={inputClass} />
        <label htmlFor="desc" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mt-3 mb-1">
          Details <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={2000} placeholder="What's wrong and how is it affecting people?" className={`${inputClass} resize-none`} />
      </Section>

      <Section step={4} title="How urgent is it?">
        <div className="grid grid-cols-4 gap-2">
          {(["low", "medium", "high", "critical"] as Urgency[]).map((u) => (
            <button
              type="button"
              key={u}
              onClick={() => setUrgency(u)}
              aria-pressed={urgency === u}
              className={`py-2.5 rounded-lg border-2 text-sm font-medium ${
                urgency === u
                  ? u === "critical"
                    ? "border-red-600 bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-200"
                    : "border-primary-600 bg-primary-50 text-primary-800 dark:bg-primary-900/30 dark:text-primary-200"
                  : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200"
              }`}
            >
              {URGENCY_LABEL[u]}
            </button>
          ))}
        </div>
        {urgency === "critical" && <p className="text-xs text-red-700 dark:text-red-300 mt-2">If anyone is in danger, call 112 first.</p>}
      </Section>

      {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">{error}</p>}
      <button type="submit" disabled={submitting} className={`${btnPrimary} w-full py-3.5 text-base`}>
        {submitting ? (
          <>
            <Loader2 size={18} className="animate-spin" /> Uploading…
          </>
        ) : (
          "Submit report"
        )}
      </button>
    </form>
  );
};

export default ReportIssuePage;
