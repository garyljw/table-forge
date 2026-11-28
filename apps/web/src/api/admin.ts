import { BookOwnersResponse, MeResponse, SetBookOwnerRequest } from "@table-forge/shared";
import { apiGet, apiSend } from "./client.js";

export const getMe = (signal?: AbortSignal) => apiGet("/api/me", MeResponse, {}, signal);
export const getBookOwners = (signal?: AbortSignal) => apiGet("/api/admin/book-owners", BookOwnersResponse, {}, signal);

/** Tick or untick one box. The server validates and normalises the email. */
export const setBookOwner = (email: string, documentKey: string, owns: boolean) =>
  apiSend("PUT", "/api/admin/book-owners", { email, documentKey, owns }, SetBookOwnerRequest);
