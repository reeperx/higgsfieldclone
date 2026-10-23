import arcjet, { fixedWindow } from "@arcjet/next"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Next 16 proxy (formerly middleware). UX only: bounce signed-out visitors
 * away from private pages. It only checks that a session cookie exists —
 * every route handler and server action still calls auth() and checks
 * ownership itself. Never rely on this for security.
 */
const PRIVATE = ["/assets", "/account", "/admin", "/dashboard", "/projects"]
const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
]

type ArcjetClient = ReturnType<typeof arcjet>

const arcjetClients: Partial<Record<"auth" | "api" | "write", ArcjetClient>> =
  {}
let warnedMissingArcjetKey = false

function protectedRequest(request: NextRequest): boolean {
  const { pathname } = request.nextUrl
  if (request.method === "GET" || request.method === "HEAD") {
    return pathname.startsWith("/api/")
  }
  if (
    pathname.startsWith("/api/webhooks/") ||
    pathname.startsWith("/api/cron/") ||
    pathname.startsWith("/api/test/")
  )
    return false
  return pathname.startsWith("/api/") || request.headers.has("next-action")
}

function rateClass(request: NextRequest): "auth" | "api" | "write" {
  if (request.nextUrl.pathname.startsWith("/api/auth/")) return "auth"
  return request.method === "GET" || request.method === "HEAD" ? "api" : "write"
}

function arcjetFor(kind: "auth" | "api" | "write"): ArcjetClient | null {
  const key = process.env.ARCJET_KEY
  if (!key) return null
  if (arcjetClients[kind]) return arcjetClients[kind]!

  const config = {
    auth: { max: 10, window: "10m" },
    api: { max: 120, window: "1m" },
    write: { max: 60, window: "1m" },
  }[kind]
  const client = arcjet({
    key,
    rules: [
      fixedWindow({
        mode: process.env.NODE_ENV === "production" ? "LIVE" : "DRY_RUN",
        characteristics: ["ip.src"],
        ...config,
      }),
    ],
  })
  arcjetClients[kind] = client
  return client
}

async function enforceArcjet(
  request: NextRequest
): Promise<NextResponse | null> {
  if (!protectedRequest(request)) return null
  const kind = rateClass(request)
  const client = arcjetFor(kind)
  if (!client) {
    if (process.env.NODE_ENV === "production")
      return NextResponse.json(
        { error: "Request protection is not configured." },
        { status: 503 }
      )
    if (!warnedMissingArcjetKey) {
      console.warn(
        "[arcjet] ARCJET_KEY is unset; application-level protection is disabled locally."
      )
      warnedMissingArcjetKey = true
    }
    return null
  }

  try {
    const decision = await client.protect(request)
    if (decision.isDenied())
      return NextResponse.json(
        { error: "Too many requests. Please wait and try again." },
        { status: 429 }
      )
    if (decision.isErrored()) {
      console.error(
        `[arcjet] request protection returned an error (${decision.id})`,
        decision.reason
      )
      return NextResponse.json(
        { error: "Request protection is temporarily unavailable." },
        { status: 503 }
      )
    }
  } catch (error) {
    console.error("[arcjet] request protection failed", error)
    return NextResponse.json(
      { error: "Request protection is temporarily unavailable." },
      { status: 503 }
    )
  }
  return null
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const protectionResponse = await enforceArcjet(request)
  if (protectionResponse) return protectionResponse
  if (
    !PRIVATE.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )
  )
    return NextResponse.next()
  const signedIn = SESSION_COOKIES.some((name) => request.cookies.has(name))
  if (signedIn) return NextResponse.next()
  const login = new URL("/login", request.url)
  login.searchParams.set("callbackUrl", `${pathname}${search}`)
  return NextResponse.redirect(login)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
