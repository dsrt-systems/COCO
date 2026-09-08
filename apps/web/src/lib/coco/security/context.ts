import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import type { Principal, Role } from '@coco/security';

/**
 * Resolve the current authenticated user + their default organization membership.
 * Returns null if not authenticated.
 */
export interface SessionContext {
  auth_user_id: string;
  email: string;
  user_id: string; // COCO ULID
  display_name: string;
  organization_id: string; // Default org (owner-most)
  organization_slug: string;
  organization_display_name: string;
  role: Role;
  memberships: Array<{
    organization_id: string;
    organization_slug: string;
    organization_display_name: string;
    role: Role;
  }>;
}

export async function getSession(): Promise<SessionContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Use service client to read identity + memberships (RLS would block otherwise
  // because we haven't attached the org context yet — chicken-and-egg)
  const service = createServiceClient();

  const { data: identityUser, error: userError } = await service
    .schema('identity')
    .from('users')
    .select('user_id, primary_email, display_name')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (userError) throw userError;
  if (!identityUser) {
    // Auth exists but identity.users row missing — this should be created
    // by the on_auth_user_created trigger, but handle gracefully.
    return null;
  }

  const { data: membershipRows, error: memErr } = await service
    .schema('identity')
    .from('memberships')
    .select(`
      role,
      organization_id,
      organizations:organization_id (
        slug,
        display_name
      )
    `)
    .eq('user_id', identityUser.user_id)
    .is('revoked_at', null);

  if (memErr) throw memErr;

  const memberships = (membershipRows ?? []).map((m: any) => ({
    organization_id: m.organization_id,
    organization_slug: m.organizations?.slug ?? '',
    organization_display_name: m.organizations?.display_name ?? '',
    role: m.role as Role,
  }));

  const defaultMembership = memberships.find((m) => m.role === 'owner') ?? memberships[0];
  if (!defaultMembership) return null;

  return {
    auth_user_id: user.id,
    email: user.email ?? identityUser.primary_email,
    user_id: identityUser.user_id,
    display_name: identityUser.display_name,
    organization_id: defaultMembership.organization_id,
    organization_slug: defaultMembership.organization_slug,
    organization_display_name: defaultMembership.organization_display_name,
    role: defaultMembership.role,
    memberships,
  };
}

/**
 * Convert a SessionContext into a Principal for permission checks.
 */
export function sessionToPrincipal(session: SessionContext): Principal {
  return {
    kind: 'user',
    id: session.user_id,
    organizationId: session.organization_id,
    role: session.role,
  };
}

/**
 * Get session or throw with a clean error. Use in Server Components / Actions
 * where auth is required.
 */
export async function requireSession(): Promise<SessionContext> {
  const session = await getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }
  return session;
}
