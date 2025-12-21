import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: '/:path*',
};

// Renamed from 'middleware' to 'proxy'
export function proxy(req: NextRequest) {
  // 1. Bypass check for public files (images, api, etc.)
  if (req.nextUrl.pathname.includes('.') || req.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // 2. Bypass check for Localhost
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next();
  }

  // 3. Check for Password
  const basicAuth = req.headers.get('authorization');

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1];
    try {
      const [user, pwd] = atob(authValue).split(':');

      // --- HARDCODED CREDENTIALS ---
      if (user === 'admin' && pwd === 'UniversalB0ard14!') {
        return NextResponse.next();
      }
    } catch (e) {
      // Catch potential atob errors for malformed auth headers
      console.error("Auth decoding failed", e);
    }
  }

  // 4. Force Browser Popup
  return new NextResponse('Auth Required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
    },
  });
}