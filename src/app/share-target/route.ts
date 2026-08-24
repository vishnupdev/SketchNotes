import { NextResponse } from "next/server";

/**
 * Fallback for the share target.
 *
 * The share sheet's `POST /share-target` is normally answered by the service
 * worker (`public/sw.js`), which keeps the shared file on the device — it never
 * touches a server. This route exists for the one case where the worker isn't
 * controlling the page yet: the very first share after installing, or a browser
 * that dropped the worker.
 *
 * It deliberately reads *nothing* from the request. Parsing the upload here
 * would mean the file had already been sent to a server, which is exactly what
 * the worker exists to avoid — so the user is sent into the workspace with a
 * marker saying the share was missed, and can share again now the worker is
 * awake.
 */
function home(request: Request, reason: string) {
  return NextResponse.redirect(new URL(`/?share=${reason}`, request.url), 303);
}

export function POST(request: Request) {
  return home(request, "missed");
}

/** Someone opening the URL directly; nothing to receive. */
export function GET(request: Request) {
  return NextResponse.redirect(new URL("/", request.url), 307);
}
