import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server component fallback
          }
        },
      },
    },
  );
}

export async function createServerSupabase() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();

  let organizationId = 'org_default';

  if (user) {
    const { data: membership } = await client
      .schema('identity')
      .from('memberships')
      .select('organization_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (membership?.organization_id) {
      organizationId = membership.organization_id;
    }
  }

  return { client, user, organizationId };
}
