export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(/\/$/, "");

export type Role = "citizen" | "staff" | "admin";
export type IssueStatus = "pending" | "verified" | "in-progress" | "resolved" | "closed" | "rejected";
export type Urgency = "low" | "medium" | "high" | "critical";
export type Category = "roads" | "sanitation" | "streetlights" | "electricity" | "water" | "drainage" | "traffic" | "environment" | "other";

export interface DeptRef {
  _id: string;
  name: string;
  code: string;
  color: string;
}

export interface User {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  role: Role;
  department: DeptRef | string | null;
  points: number;
  isActive?: boolean;
  createdAt: string;
}

export interface Attachment {
  url: string;
  filename: string;
  mimetype: string;
  size: number;
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
  reporter?: { name?: string; email?: string; phone?: string };
  reporterUser?: { _id: string; fullName: string } | null;
  attachments: Attachment[];
  assignedDepartment?: DeptRef | null;
  assignedTo?: { _id: string; fullName: string; phone?: string } | null;
  upvoteCount: number;
  communityConfirmations: number;
  communityDisputes: number;
  communityVerified: boolean;
  possibleDuplicateOf?: { _id: string; title: string; status: IssueStatus } | string | null;
  duplicateCount: number;
  rejectionReason?: string;
  resolutionNote?: string;
  verifiedAt?: string;
  resolvedAt?: string;
  feedback?: { satisfied: boolean; rating?: number; comment?: string; at: string };
  timeline: Array<{ status: IssueStatus; note?: string; byName?: string; at: string }>;
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
  department?: { name: string; color: string } | null;
}

export interface Department {
  id: string;
  _id: string;
  name: string;
  code: string;
  description?: string;
  color: string;
  categories: Category[];
  contactEmail?: string;
  head?: string;
  isActive: boolean;
  staffCount: number;
  totalReports: number;
  activeReports: number;
  resolvedReports: number;
}

export interface Analytics {
  totals: {
    total: number;
    open: number;
    pendingVerification: number;
    resolved: number;
    rejected: number;
    slaBreaches: number;
    communityVerified: number;
    flaggedDuplicates: number;
    avgResolutionHours: number | null;
    resolutionRate: number;
    satisfactionRate: number | null;
  };
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  byUrgency: Record<string, number>;
  byWard: Array<{ ward: string; total: number; open: number; resolved: number; avgResolutionHours: number | null }>;
  byDepartment: Array<{
    departmentId: string | null;
    name: string;
    code: string;
    color: string;
    total: number;
    open: number;
    resolved: number;
    slaBreaches: number;
    avgResolutionHours: number | null;
    resolutionRate: number;
  }>;
  trend: Array<{ date: string; reports: number; resolved: number }>;
  hotspots: Array<{ lat: number; lng: number; count: number; critical: number; categories: Category[]; sampleLocation?: string }>;
  resolutionByCategory: Record<string, { avgHours: number | null; count: number }>;
  generatedAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}

const TOKEN_KEY = "fmc.admin.token";
export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (t: string) => {
    try {
      localStorage.setItem(TOKEN_KEY, t);
    } catch {
      /* unavailable */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* unavailable */
    }
  },
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
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
    throw new ApiError("Cannot reach the API server", 0);
  }
  const body = (res.headers.get("content-type") || "").includes("application/json") ? await res.json() : null;
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized?.();
    const detail = body?.errors?.map((e: { field: string; message: string }) => `${e.field}: ${e.message}`).join("; ");
    throw new ApiError(detail || body?.message || `Request failed (${res.status})`, res.status);
  }
  return body as T;
}

export const qs = (params: Record<string, string | number | boolean | undefined | null>) => {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") s.set(k, String(v));
  const str = s.toString();
  return str ? `?${str}` : "";
};

export interface IssueFilters {
  status?: string;
  category?: string;
  urgency?: string;
  department?: string;
  ward?: string;
  q?: string;
  sort?: string;
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
}

export interface IssueUpdate {
  status?: IssueStatus;
  urgency?: Urgency;
  category?: Category;
  assignedDepartment?: string | null;
  assignedTo?: string | null;
  note?: string;
  rejectionReason?: string;
  resolutionNote?: string;
}

export const api = {
  login: (identifier: string, password: string) =>
    request<{ data: { accessToken: string; user: User } }>("/auth/login", { method: "POST", body: JSON.stringify({ identifier, password }) }),
  me: () => request<User>("/auth/me"),
  changePassword: (currentPassword: string, newPassword: string) =>
    request("/profile/password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) }),

  issues: (f: IssueFilters = {}) => request<Paginated<Issue>>(`/issues${qs({ ...f })}`),
  mapIssues: (f: IssueFilters = {}) => request<MapIssue[]>(`/issues/map${qs({ ...f })}`),
  issue: (id: string) => request<Issue>(`/issues/${id}`),
  updateIssue: (id: string, data: IssueUpdate, files?: File[]) => {
    if (files?.length) {
      const fd = new FormData();
      for (const [k, v] of Object.entries(data)) if (v !== undefined) fd.set(k, v === null ? "" : String(v));
      files.forEach((f) => fd.append("files", f));
      return request<Issue>(`/issues/${id}`, { method: "PATCH", body: fd });
    }
    return request<Issue>(`/issues/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  },
  deleteIssue: (id: string) => request(`/issues/${id}`, { method: "DELETE" }),

  analytics: (days = 30, department?: string) => request<Analytics>(`/admin/analytics${qs({ days, department })}`),

  departments: () => request<Department[]>("/admin/departments"),
  createDepartment: (d: Partial<Department>) => request<Department>("/admin/departments", { method: "POST", body: JSON.stringify(d) }),
  updateDepartment: (id: string, d: Partial<Department>) => request<Department>(`/admin/departments/${id}`, { method: "PATCH", body: JSON.stringify(d) }),
  deleteDepartment: (id: string) => request(`/admin/departments/${id}`, { method: "DELETE" }),

  users: (f: { role?: string; department?: string; q?: string; page?: number } = {}) => request<Paginated<User>>(`/admin/users${qs(f)}`),
  createStaff: (d: { fullName: string; phone: string; email: string; password: string; role: "staff" | "admin"; department?: string | null }) =>
    request<User>("/admin/users", { method: "POST", body: JSON.stringify(d) }),
  updateUser: (id: string, d: { role?: Role; department?: string | null; isActive?: boolean }) =>
    request<User>(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(d) }),
};
