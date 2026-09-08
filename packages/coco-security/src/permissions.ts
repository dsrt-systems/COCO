import { PermissionError } from '@coco/common';

/**
 * Permission checker. Combines RBAC (role-based) + tenant isolation.
 * Every non-trivial authorization decision routes through here.
 */

export type Role = 'owner' | 'admin' | 'member' | 'viewer' | 'service';

export interface Principal {
  kind: 'user' | 'service' | 'agent' | 'external';
  id: string;
  organizationId: string;
  role: Role;
  attributes?: Record<string, unknown>;
}

export interface Resource {
  kind: string;
  id?: string;
  organizationId: string;
  sensitivity?: 'public' | 'internal' | 'confidential' | 'restricted';
  attributes?: Record<string, unknown>;
}

export interface PermissionResult {
  allowed: boolean;
  reason: string;
  obligations?: string[];
}

/**
 * Core role → action matrix. Additional ABAC checks layered on top.
 */
const ROLE_ACTIONS: Record<Role, string[]> = {
  owner: ['*'],
  admin: ['read.*', 'write.*', 'delete.*', 'invite.member', 'approve.*'],
  member: ['read.*', 'write.own', 'create.mission', 'create.project'],
  viewer: ['read.*'],
  service: ['read.*', 'write.*', 'system.*'],
};

function roleMatches(role: Role, action: string): boolean {
  const actions = ROLE_ACTIONS[role] ?? [];
  return actions.some((pattern) => {
    if (pattern === '*') return true;
    if (pattern === action) return true;
    if (pattern.endsWith('.*') && action.startsWith(pattern.slice(0, -2))) return true;
    return false;
  });
}

export function checkPermission(
  principal: Principal,
  action: string,
  resource: Resource,
): PermissionResult {
  // Tenant isolation is non-negotiable
  if (principal.organizationId !== resource.organizationId) {
    return {
      allowed: false,
      reason: 'tenant_boundary_violation',
    };
  }

  // Restricted sensitivity requires explicit permission
  if (resource.sensitivity === 'restricted') {
    const hasRestrictedAccess = (principal.attributes?.restricted_data_access as boolean) === true;
    if (!hasRestrictedAccess && principal.role !== 'owner') {
      return {
        allowed: false,
        reason: 'restricted_data_access_required',
      };
    }
  }

  // Role matrix check
  if (!roleMatches(principal.role, action)) {
    return {
      allowed: false,
      reason: `role_${principal.role}_lacks_${action}`,
    };
  }

  // Obligations layered by sensitivity
  const obligations: string[] = [];
  if (resource.sensitivity === 'confidential' || resource.sensitivity === 'restricted') {
    obligations.push('log_at_high_sensitivity');
  }
  if (action.startsWith('delete.') || action.startsWith('deploy.')) {
    obligations.push('require_recent_mfa');
  }

  return {
    allowed: true,
    reason: 'granted',
    obligations: obligations.length ? obligations : undefined,
  };
}

export function requirePermission(
  principal: Principal,
  action: string,
  resource: Resource,
): void {
  const result = checkPermission(principal, action, resource);
  if (!result.allowed) {
    throw new PermissionError(
      `permission.denied.${result.reason}`,
      `${principal.kind}:${principal.id} denied ${action} on ${resource.kind}:${resource.id ?? '*'}`,
      { principal, action, resource, reason: result.reason },
    );
  }
}
