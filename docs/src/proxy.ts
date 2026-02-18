import { type NextRequest, NextResponse } from 'next/server'

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone()

  const hostname = url.pathname.startsWith('/ph/static/')
    ? 'us-assets.i.posthog.com'
    : 'us.i.posthog.com'

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('host', hostname)

  url.protocol = 'https'
  url.hostname = hostname
  url.port = '443'
  url.pathname = url.pathname.replace(/^\/ph/, '')

  return NextResponse.rewrite(url, {
    headers: requestHeaders,
  })
}

export const config = {
  matcher: '/ph/:path*',
}
