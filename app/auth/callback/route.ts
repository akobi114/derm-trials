import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');

    if (code) {
      // 1. AWAIT COOKIES (Crucial fix for newer Next.js versions)
      const cookieStore = await cookies();
      
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value;
            },
            set(name: string, value: string, options: any) {
              cookieStore.set({ name, value, ...options });
            },
            remove(name: string, options: any) {
              cookieStore.delete({ name, ...options });
            },
          },
        }
      );

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error("🔴 Supabase Auth Error:", error.message);
        return NextResponse.redirect(`${origin}/login?error=auth_failed`);
      }
      
      // Success!
      return NextResponse.redirect(`${origin}/admin`);
    }
    
    return NextResponse.redirect(`${origin}/login?error=no_code`);

  } catch (err) {
    // This catches the 500 error and prints it to your VS Code terminal
    console.error("🔴 Internal Server Error:", err);
    return NextResponse.redirect(`${new URL(request.url).origin}/login?error=server_error`);
  }
}