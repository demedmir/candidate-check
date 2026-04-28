import axios from "axios";
import { useAuthStore } from "@/store/auth";

export const api = axios.create({
  baseURL: "/api/v1",
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(err);
  },
);

// ── types (matching app/schemas.py) ──────────────────────────────
export type User = { id: number; email: string; full_name: string };
export type ConnectorInfo = { key: string; title: string };

export type CheckRunSummary = {
  id: number;
  status: string;
  risk_score: number | null;
  risk_segment: "green" | "yellow" | "red" | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
};

export type CheckResult = {
  source: string;
  status: "ok" | "warning" | "fail" | "error";
  summary: string;
  payload: Record<string, unknown>;
  error: string | null;
  duration_ms: number | null;
};

export type CheckRunDetail = CheckRunSummary & { results: CheckResult[] };

export type Candidate = {
  id: number;
  last_name: string;
  first_name: string;
  middle_name: string | null;
  birth_date: string | null;
  inn: string | null;
  snils: string | null;
  phone: string | null;
  email: string | null;
  role_segment: string;
  consent_signed_offline: boolean;
  consent_signed_at: string | null;
  consent_file_path: string | null;
  created_at: string;
  last_run: CheckRunSummary | null;
};

export type DocType = {
  key: string;
  label: string;
};

export type PassportOcrFields = {
  last_name: string | null;
  first_name: string | null;
  middle_name: string | null;
  birth_date: string | null;
  gender: "male" | "female" | null;
  series: string | null;
  number: string | null;
  issue_date: string | null;
  issuing_authority_code: string | null;
  place_of_birth: string | null;
  raw_text: string;
};

export type PassportOcrResponse = {
  fields: PassportOcrFields;
  lines: string[];
  elapsed_ms: number;
};

export type DocumentRecord = {
  id: number;
  candidate_id: number;
  doc_type: string;
  file_path: string;
  file_name: string | null;
  comment: string | null;
  uploaded_at: string;
};

export type CandidateCreate = {
  last_name: string;
  first_name: string;
  middle_name?: string | null;
  birth_date?: string | null;
  inn?: string | null;
  snils?: string | null;
  phone?: string | null;
  email?: string | null;
  role_segment?: string;
  consent_signed_offline?: boolean;
};
