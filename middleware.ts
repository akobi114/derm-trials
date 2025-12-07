import { NextRequest, NextResponse } from 'next/server';

export const config = {
  // Protects the entire site (Home, Search, Admin, etc.)
  matcher: '/:path*',
};

export function middleware(req: NextRequest) {
  // 1. Allow public access to assets (images, fonts, api) so the site doesn't break
  // BUT block access to the actual pages
  const isPublicFile = req.nextUrl.pathname.includes('.') || req.nextUrl.pathname.startsWith('/api');
  if (isPublicFile) {
    return NextResponse.next();
  }

  // 2. Bypass password on Localhost (Development)
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next();
  }

  // 3. CHECK FOR PASSWORD
  const basicAuth = req.headers.get('authorization');

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1];
    // Decode "user:password"
    const [user, pwd] = atob(authValue).split(':');

    // Check against Environment Variables
    if (user === process.env.BASIC_AUTH_USER && pwd === process.env.BASIC_AUTH_PASSWORD) {
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