import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/'

  // Handle PKCE code exchange (invite links)
  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // If this is an invite, redirect to set password
      if (type === 'invite') {
        return NextResponse.redirect(`${origin}/?setPassword=true`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Handle token hash (older email links)
  if (token_hash && type) {
    return NextResponse.redirect(`${origin}/?token_hash=${token_hash}&type=${type}`)
  }

  return NextResponse.redirect(`${origin}/`)
}
