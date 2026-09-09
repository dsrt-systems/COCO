import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { standardRateLimit, strictRateLimit } from '@/lib/rate-limit';

export async function middleware(request: NextRequest) {
  // 1. Enforce Rate Limiting for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.ip ?? request.headers.get('x-forwarded-for') ?? '127.0.0.1';
    
    // Apply strict limit to expensive endpoints
    if (
      request.nextUrl.pathname.startsWith('/api/ranger/start') ||
      request.nextUrl.pathname.startsWith('/api/agents/run') ||
      request.nextUrl.pathname.startsWith('/api/models/infer')
    ) {
      const { success, limit, remaining, reset } = await strictRateLimit.limit(ip);
      if (!success) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Too many expensive operations.' },
          { 
            status: 429, 
            headers: {
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': remaining.toString(),
              'X-RateLimit-Reset': reset.toString(),
            } 
          }
        );
      }
    } 
    // Apply standard limit to all other API routes (except webhooks)
    else if (!request.nextUrl.pathname.startsWith('/api/billing/webhook')) {
      const { success, limit, remaining, reset } = await standardRateLimit.limit(ip);
      if (!success) {
        return NextResponse.json(
          { error: 'Rate limit exceeded.' },
          { 
            status: 429,
            headers: {
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': remaining.toString(),
              'X-RateLimit-Reset': reset.toString(),
            }
          }
        );
      }
    }
  }

  // 2. Manage Supabase Auth Session
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
