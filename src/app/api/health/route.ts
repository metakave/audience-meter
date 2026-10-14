import { NextResponse } from 'next/server';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!isSupabaseConfigured || !url || !hasAnonKey) {
    return NextResponse.json({
      status: 'not_configured',
      message: 'Supabase environment variables are missing or not applied.',
      details: {
        NEXT_PUBLIC_SUPABASE_URL: url ? 'Set' : 'Missing',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: hasAnonKey ? 'Set' : 'Missing',
      },
      tip: 'Make sure you Redeployed on Vercel after saving environment variables!',
    });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({
      status: 'client_error',
      message: 'Failed to initialize Supabase client.',
    });
  }

  try {
    const { data, error } = await supabase.from('presentations').select('id, code').limit(5);

    if (error) {
      return NextResponse.json({
        status: 'database_error',
        message: 'Connected to Supabase, but encountered an error querying the tables.',
        error: error.message,
        tip: 'Make sure you ran the SQL script from supabase-schema.sql in the Supabase SQL Editor.',
      });
    }

    return NextResponse.json({
      status: 'connected',
      message: 'Supabase is successfully configured and connected!',
      database: {
        url: url.replace(/^(https?:\/\/[^.]+).*/, '$1...'),
        tableQuerySuccess: true,
        presentationsFound: data?.length ?? 0,
      },
      realtimeReady: true,
    });
  } catch (err: any) {
    return NextResponse.json({
      status: 'connection_failed',
      message: err.message || 'Unknown network error connecting to Supabase',
    });
  }
}
