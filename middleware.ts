import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: '/:path*',
};

export function middleware(req: NextRequest) {
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
    const [user, pwd] = atob(authValue).split(':');

    // --- HARDCODED CREDENTIALS (NO SETTINGS REQUIRED) ---
    // User: admin
    // Pass: password
    if (user === 'admin' && pwd === 'UniversalB0ard14!') {
      return NextResponse.next();
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