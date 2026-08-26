"use client";

import { fetchJson } from "@/lib/net/fetch";
import type { RelayResponse } from "@/app/api/relay/route";
import type { Method } from "./guard";

/**
 * The client half of the relay, plus the shapes a saved request has.
 *
 * Headers are a *list* of `{name, value, on}` rather than a record, and that is
 * deliberate: a request builder needs to keep the order you typed them in, allow a
 * half-written duplicate name while you edit, and let you switch one off without
 * deleting it. A `Record<string, string>` can do none of those. It is flattened to
 * a record only at the moment of sending.
 */

export interface HeaderRow {
  id: string;
  name: string;
  value: string;
  /** Unchecked rows are kept but not sent. */
  on: boolean;
}

export type BodyKind = "none" | "json" | "text" | "form";

export const BODY_KINDS: { id: BodyKind; label: string; contentType: string | null }[] = [
  { id: "none", label: "None", contentType: null },
  { id: "json", label: "JSON", contentType: "application/json" },
  { id: "text", label: "Text", contentType: "text/plain" },
  { id: "form", label: "Form", contentType: "application/x-www-form-urlencoded" },
];

export interface ApiRequest {
  id: string;
  name: string;
  method: Method;
  url: string;
  headers: HeaderRow[];
  bodyKind: BodyKind;
  body: string;
}

export interface ApiResult {
  /** Set when the relay refused or could not complete the request. */
  error?: string;
  response?: RelayResponse;
  /** When it ran, for the history list. */
  at: number;
}

/** Only rows that are switched on and actually named get sent. */
export function flattenHeaders(rows: HeaderRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of rows) {
    if (!row.on) continue;
    const name = row.name.trim();
    if (!name) continue;
    out[name] = row.value;
  }
  return out;
}

/**
 * Send a request through the relay.
 *
 * The Content-Type is added here rather than being a header row the user has to
 * remember, but only when they have not set one themselves — overriding an explicit
 * `Content-Type: application/vnd.api+json` with `application/json` would be the
 * kind of helpfulness that wastes an afternoon.
 */
export async function sendRequest(request: ApiRequest): Promise<ApiResult> {
  const headers = flattenHeaders(request.headers);

  const kind = BODY_KINDS.find((k) => k.id === request.bodyKind);
  const hasContentType = Object.keys(headers).some((n) => n.toLowerCase() === "content-type");
  if (kind?.contentType && !hasContentType && request.body.trim()) {
    headers["Content-Type"] = kind.contentType;
  }

  try {
    const response = await fetchJson<RelayResponse>("/api/relay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: request.method,
        url: request.url,
        headers,
        body: request.bodyKind === "none" ? "" : request.body,
      }),
      // The relay has its own 20s budget; this one only has to outlast it.
      timeoutMs: 25_000,
      label: "Relay",
    });
    return { response, at: Date.now() };
  } catch (err) {
    // `fetchJson` puts the server's `error` message in the thrown message, which
    // is exactly what the guard wrote — so it reaches the user intact.
    return {
      error: err instanceof Error ? err.message : "The request could not be sent.",
      at: Date.now(),
    };
  }
}

/**
 * The equivalent curl command.
 *
 * Worth having because it is the thing people paste into a ticket or a colleague's
 * chat, and because it is how you check that the tool sent what you meant. Values
 * are single-quoted with the shell-safe `'\''` escape, so a body containing quotes
 * survives being pasted.
 */
export function toCurl(request: ApiRequest): string {
  const quote = (value: string) => `'${value.replace(/'/g, `'\\''`)}'`;
  const parts = [`curl -X ${request.method}`, quote(request.url || "")];

  const headers = flattenHeaders(request.headers);
  const kind = BODY_KINDS.find((k) => k.id === request.bodyKind);
  const hasContentType = Object.keys(headers).some((n) => n.toLowerCase() === "content-type");
  if (kind?.contentType && !hasContentType && request.body.trim()) {
    headers["Content-Type"] = kind.contentType;
  }

  for (const [name, value] of Object.entries(headers)) {
    parts.push(`-H ${quote(`${name}: ${value}`)}`);
  }

  if (request.bodyKind !== "none" && request.body.trim()) {
    parts.push(`-d ${quote(request.body)}`);
  }

  // Continuations, so a long command is readable when pasted.
  return parts.join(" \\\n  ");
}

/** Pretty-print a JSON body; returns null when it is not JSON. */
export function prettyJson(body: string): string | null {
  const trimmed = body.trim();
  if (!trimmed || !/^[{[]/.test(trimmed)) return null;
  try {
    return JSON.stringify(JSON.parse(trimmed), null, 2);
  } catch {
    return null;
  }
}

/** Guess a language id for the response viewer, from the content type. */
export function bodyLanguage(headers: Record<string, string>): string {
  const type = (
    Object.entries(headers).find(([n]) => n.toLowerCase() === "content-type")?.[1] ?? ""
  ).toLowerCase();
  if (type.includes("json")) return "json";
  if (type.includes("html") || type.includes("xml")) return "html";
  if (type.includes("css")) return "css";
  if (type.includes("javascript")) return "javascript";
  return "plain";
}

/** Colour band for a status code, as a theme token class. */
export function statusTone(status: number): "ok" | "redirect" | "client" | "server" {
  if (status >= 500) return "server";
  if (status >= 400) return "client";
  if (status >= 300) return "redirect";
  return "ok";
}
