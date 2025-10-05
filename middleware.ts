import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simple middleware that allows all requests
// Authentication is disabled (next-auth not installed)
export function middleware(request: NextRequest) {
  return NextResponse.next()
}

// Apply middleware to all routes except static files
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|Onboard.svg).*)',
  ],
}
