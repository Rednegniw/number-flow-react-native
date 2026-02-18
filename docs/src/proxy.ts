import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const hostname = request.nextUrl.pathname.startsWith("/ph/static/")
    ? "us-assets.i.posthog.com"
    : "us.i.posthog.com";

  const pathname = request.nextUrl.pathname.replace(/^\/ph/, "");
  const search = request.nextUrl.search;
  const targetUrl = `https://${hostname}${pathname}${search}`;

  const headers = new Headers(request.headers);
  headers.set("host", hostname);
  headers.delete("connection");

  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: request.method === "POST" ? request.body : undefined,
    // @ts-expect-error -- Next.js extends RequestInit with duplex
    duplex: "half",
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

export const config = {
  matcher: "/ph/:path*",
};
