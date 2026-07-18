"use client";

import { api, setToken, clearToken } from "./api";

interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    organizationId: string;
  };
}

export async function login(email: string, password: string) {
  const res = await api.post<AuthResponse>("/api/auth/login", {
    email,
    password,
  });
  setToken(res.token);
  return res;
}

export async function signup(
  email: string,
  password: string,
  name: string,
  orgName: string
) {
  const res = await api.post<AuthResponse>("/api/auth/signup", {
    email,
    password,
    name,
    orgName,
  });
  setToken(res.token);
  return res;
}

export function logout() {
  clearToken();
  window.location.href = "/login";
}

export async function getMe() {
  return api.get<AuthResponse["user"] & { organization: { name: string; slug: string } }>("/api/auth/me");
}
