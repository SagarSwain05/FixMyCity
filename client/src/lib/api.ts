export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(/\/$/, "");

// ---------- types ----------

export type Role = "citizen" | "staff" | "admin";
export type IssueStatus = "pending" | "verified" | "in-progress" | "resolved" | "closed" | "rejected";
export type Urgency = "low" | "medium" | "high" | "critical";
export type Category =
  | "roads"
  | "sanitation"
  | "streetlights"
  | "electricity"
  | "water"
  | "drainage"
  | "traffic"
  | "environment"
  | "other";

export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface User {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  role: Role;
  address: Address;
  avatarUrl: string | null;
  points: number;
  emailNotifications: boolean;
  createdAt: string;
}

export interface Attachment {
  url: string;
  filename: string;
  mimetype: string;
  size: number;
}

export interface TimelineEntry {
  status: IssueStatus;
  note?: string;
  byName?: string;
  at: string;
}

export interface Issue {
  id: string;
  title: string;
  description?: string;
  category: Category;
  categoryLabel: string;
  status: IssueStatus;
  urgency: Urgency;
  location?: string;
  ward?: string;
  coordinates?: { lat: number; lng: number };
  reporter?: { name?: string };
  reporterUser?: { _id: string; fullName: string; avatarUrl?: string } | null;
  attachments: Attachment[];
  assignedDepartment?: { _id: string; name: string; code: string; color: string } | null;
  assignedTo?: { _id: string; fullName: string } | null;
  upvoteCount: number;
  hasUpvoted: boolean;
  communityConfirmations: number;
  communityDisputes: number;
  communityVerified: boolean;
  myVerification: "confirm" | "dispute" | null;
  isOwner: boolean;
  possibleDuplicateOf?: { _id: string; title: string; status: IssueStatus } | string | null;
  duplicateCount: number;
  rejectionReason?: string;
  resolutionNote?: string;
  verifiedAt?: string;
  resolvedAt?: string;
  feedback?: { satisfied: boolean; rating?: number; comment?: string; at: string };
  timeline: TimelineEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface MapIssue {
  id: string;
  title: string;
  category: Category;
  categoryLabel: string;
  status: IssueStatus;
  urgency: Urgency;
  coordinates: { lat: number; lng: number };
  location?: string;
  ward?: string;
  upvoteCount: number;
  communityVerified: boolean;
  createdAt: string;
  thumbnail: string | null;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}

export interface Notification {
  _id: string;
  id: string;
  type: "status" | "assignment" | "verification" | "reward" | "feedback" | "community" | "system";
  title: string;
  message: string;
  issue?: { _id: string; title: string; status: IssueStatus } | null;
  read: boolean;
  createdAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  city: string;
  avatarUrl: string | null;
  points: number;
  reports: number;
  resolved: number;
  isCurrentUser?: boolean;
}

export interface RewardsSummary {
  points: number;
  rank: number;
  city: string;
  stats: { reports: number; resolved: number; verified: number; communityChecks: number };
  leaderboard: LeaderboardEntry[];
  achievements: Array<{ icon: string; title: string; description: string; earned: boolean }>;
}

export interface RewardTransaction {
  _id: string;
  points: number;
  reason: string;
  createdAt: string;
}

export interface Meta {
  categories: Array<{ value: Category; label: string }>;
  duplicateRadiusMeters: number;
}

export interface ChatReply {
  reply: string;
  suggestions: string[];
  action?: { type: "navigate"; to: string; label: string };
}

// ---------- token storage ----------

const TOKEN_KEY = "fmc.token";

export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* storage unavailable */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage unavailable */
    }
  },
};

// ---------- fetch wrapper ----------

export class ApiError extends Error {
  status: number;
  fieldErrors?: Array<{ field: string; message: string }>;
  constructor(message: string, status: number, fieldErrors?: Array<{ field: string; message: string }>) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = tokenStore.get();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api${path}`, { ...init, headers });
  } catch {
    throw new ApiError("Cannot reach the server. Check your connection.", 0);
  }
  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const body = isJson ? await res.json() : null;
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized?.();
    throw new ApiError(body?.message || `Request failed (${res.status})`, res.status, body?.errors);
  }
  return body as T;
}

const json = (data: unknown) => JSON.stringify(data);
const qs = (params: Record<string, string | number | boolean | undefined | null>) => {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") s.set(k, String(v));
  const str = s.toString();
  return str ? `?${str}` : "";
};

// ---------- endpoints ----------

export const api = {
  // auth
  login: (identifier: string, password: string) =>
    request<{ data: { accessToken: string; user: User } }>("/auth/login", {
      method: "POST",
      body: json({ identifier, password }),
    }),
  signup: (data: { fullName: string; phone: string; email: string; password: string; address: Partial<Address> }) =>
    request<{ data: { accessToken: string; user: User } }>("/auth/signup", { method: "POST", body: json(data) }),
  me: () => request<User>("/auth/me"),

  // profile
  updateProfile: (data: Partial<Pick<User, "fullName" | "email" | "emailNotifications">> & { address?: Partial<Address> }) =>
    request<{ data: User }>("/profile", { method: "PUT", body: json(data) }),
  uploadAvatar: (file: File) => {
    const fd = new FormData();
    fd.append("avatar", file);
    return request<{ data: User }>("/profile/avatar", { method: "POST", body: fd });
  },
  changePassword: (currentPassword: string, newPassword: string) =>
    request("/profile/password", { method: "POST", body: json({ currentPassword, newPassword }) }),

  // meta
  meta: () => request<Meta>("/meta"),

  // issues
  listIssues: (params: {
    status?: string;
    category?: string;
    mine?: boolean;
    lat?: number;
    lng?: number;
    radius?: number;
    sort?: "newest" | "upvotes" | "updated";
    page?: number;
    limit?: number;
    q?: string;
  } = {}) => request<Paginated<Issue>>(`/issues${qs(params)}`),
  mapIssues: (params: { status?: string; category?: string } = {}) => request<MapIssue[]>(`/issues/map${qs(params)}`),
  getIssue: (id: string) => request<Issue>(`/issues/${id}`),
  nearby: (lat: number, lng: number, category?: Category) =>
    request<{ radius: number; items: Issue[] }>(`/issues/nearby${qs({ lat, lng, category })}`),
  verifyQueue: (lat: number, lng: number) => request<Issue[]>(`/issues/verify-queue${qs({ lat, lng })}`),
  createIssue: (data: {
    title: string;
    description?: string;
    category: Category;
    urgency: Urgency;
    location?: string;
    ward?: string;
    coordinates?: { lat: number; lng: number };
    files: File[];
  }) => {
    const fd = new FormData();
    fd.set("title", data.title);
    if (data.description) fd.set("description", data.description);
    fd.set("category", data.category);
    fd.set("urgency", data.urgency);
    if (data.location) fd.set("location", data.location);
    if (data.ward) fd.set("ward", data.ward);
    if (data.coordinates) fd.set("coordinates", JSON.stringify(data.coordinates));
    data.files.forEach((f) => fd.append("files", f));
    return request<Issue>("/issues", { method: "POST", body: fd });
  },
  upvote: (id: string) => request<{ upvoted: boolean; upvoteCount: number }>(`/issues/${id}/upvote`, { method: "POST" }),
  verify: (id: string, verdict: "confirm" | "dispute", severity?: Urgency) =>
    request<{ communityConfirmations: number; communityVerified: boolean }>(`/issues/${id}/verify`, {
      method: "POST",
      body: json({ verdict, severity }),
    }),
  feedback: (id: string, data: { satisfied: boolean; rating?: number; comment?: string }) =>
    request<Issue>(`/issues/${id}/feedback`, { method: "POST", body: json(data) }),
  deleteIssue: (id: string) => request(`/issues/${id}`, { method: "DELETE" }),

  // rewards
  rewards: () => request<RewardsSummary>("/rewards/me"),
  rewardTransactions: () => request<RewardTransaction[]>("/rewards/me/transactions"),
  leaderboard: (city?: string) => request<LeaderboardEntry[]>(`/rewards/leaderboard${qs({ city, limit: 50 })}`),

  // notifications
  notifications: () => request<{ items: Notification[]; unread: number }>("/notifications"),
  markRead: (id: string) => request(`/notifications/${id}/read`, { method: "PATCH" }),
  markAllRead: () => request("/notifications/read-all", { method: "POST" }),
  deleteNotification: (id: string) => request(`/notifications/${id}`, { method: "DELETE" }),

  // assistant
  chat: (message: string) => request<ChatReply>("/chat", { method: "POST", body: json({ message }) }),
};
