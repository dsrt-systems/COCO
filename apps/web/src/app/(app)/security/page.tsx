import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Shield, Key, FileLock2, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SignOutButton } from '@/components/shell/sign-out-button';
import { getSession } from '@/lib/coco/security/context';
import { createServiceClient } from '@/lib/supabase/service';
import { loadKeys, signMessage, verifySignature } from '@coco/security';

export const dynamic = 'force-dynamic';

async function runSelfCheck() {
  const results: Array<{ name: string; passed: boolean; detail: string }> = [];

  // 1. Keys load
  try {
    const { publicKey, privateKey } = loadKeys();
    results.push({
      name: 'Ed25519 keys loaded',
      passed: publicKey.length === 32 && privateKey.length === 32,
      detail: `public: ${publicKey.length}b, private: ${privateKey.length}b`,
    });
  } catch (e) {
    results.push({
      name: 'Ed25519 keys loaded',
      passed: false,
      detail: (e as Error).message,
    });
  }

  // 2. Sign + verify roundtrip
  try {
    const msg = 'coco-security-selfcheck-' + Date.now();
    const sig = await signMessage(msg);
    const ok = await verifySignature(msg, sig);
    results.push({
      name: 'Sign/verify roundtrip',
      passed: ok,
      detail: `signature length: ${sig.length}`,
    });
  } catch (e) {
    results.push({ name: 'Sign/verify roundtrip', passed: false, detail: (e as Error).message });
  }

  // 3. Tampered signature rejected
  try {
    const msg = 'test-message';
    const sig = await signMessage(msg);
    const tampered = sig.substring(0, sig.length - 2) + '00';
    const shouldFail = !(await verifySignature(msg, tampered));
    results.push({
      name: 'Tampered signature rejected',
      passed: shouldFail,
      detail: shouldFail ? 'correctly rejected' : 'INCORRECTLY ACCEPTED',
    });
  } catch (e) {
    results.push({
      name: 'Tampered signature rejected',
      passed: false,
      detail: (e as Error).message,
    });
  }

  return results;
}

async function getAuditSample(organizationId: string) {
  const service = createServiceClient();
  const { data } = await service
    .schema('security')
    .from('audit_log')
    .select('audit_id, event_type, action, outcome, occurred_at, chain_hash')
    .eq('organization_id', organizationId)
    .order('occurred_at', { ascending: false })
    .limit(10);
  return data ?? [];
}

async function getActiveTokens(organizationId: string) {
  const service = createServiceClient();
  const { data } = await service
    .schema('security')
    .from('capability_tokens')
    .select('token_id, tool_id, granted_scope, max_invocations, invocations_used, issued_at, expires_at, revoked_at')
    .eq('organization_id', organizationId)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('issued_at', { ascending: false })
    .limit(10);
  return data ?? [];
}

export default async function SecurityPage() {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const [checks, auditLog, activeTokens] = await Promise.all([
    runSelfCheck(),
    getAuditSample(session.organization_id),
    getActiveTokens(session.organization_id),
  ]);

  const allPassed = checks.every((c) => c.passed);

  return (
    <main className="shell-bg noise min-h-screen">
      <nav className="container flex items-center justify-between py-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-white to-zinc-400 shadow-[0_0_20px_-5px_rgba(255,255,255,0.5)]" />
          <span className="text-lg font-semibold tracking-tight text-gradient">COCO</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 inline h-3.5 w-3.5" />
            Dashboard
          </Link>
          <SignOutButton />
        </div>
      </nav>

      <section className="container py-12">
        <div className="mb-10">
          <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Fabric 11</p>
          <h1 className="text-gradient text-4xl font-semibold tracking-tight">
            Security Fabric
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Ed25519 capability tokens, tamper-evident audit chain, permission checker, and multi-tenant isolation.
          </p>
        </div>

        {/* Self-check panel */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-3">
              {allPassed ? (
                <CheckCircle2 className="h-5 w-5 text-green-400" />
              ) : (
                <XCircle className="h-5 w-5 text-red-400" />
              )}
              <div>
                <CardTitle>Cryptographic Self-Check</CardTitle>
                <CardDescription>
                  {allPassed ? 'All primitives operational' : 'Failures detected — investigate immediately'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {checks.map((check) => (
                <div
                  key={check.name}
                  className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
                >
                  <div className="flex items-center gap-3">
                    {check.passed ? (
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-400" />
                    )}
                    <span className="text-sm font-medium">{check.name}</span>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">{check.detail}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Active capability tokens */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Key className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle>Active Capability Tokens</CardTitle>
                  <CardDescription>
                    {activeTokens.length === 0 ? 'No active tokens' : `${activeTokens.length} live token${activeTokens.length === 1 ? '' : 's'}`}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {activeTokens.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Tokens will appear here as agents invoke tools.
                </p>
              ) : (
                <div className="space-y-2">
                  {activeTokens.map((t: any) => (
                    <div
                      key={t.token_id}
                      className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">{t.tool_id}</div>
                          <div className="text-xs text-muted-foreground">
                            {t.granted_scope} · {t.invocations_used}/{t.max_invocations} used
                          </div>
                        </div>
                        <span className="rounded-md border border-green-500/20 bg-green-500/[0.06] px-2 py-0.5 text-xs text-green-400">
                          active
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Audit log preview */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <FileLock2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle>Audit Log (Recent)</CardTitle>
                  <CardDescription>
                    Hash-chained · tamper-evident
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {auditLog.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Audit events will appear here as the system operates.
                </p>
              ) : (
                <div className="space-y-2">
                  {auditLog.map((entry: any) => (
                    <div
                      key={entry.audit_id}
                      className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">{entry.event_type}</div>
                          <div className="text-xs text-muted-foreground">
                            {entry.action} · {entry.outcome}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">
                            {new Date(entry.occurred_at).toLocaleTimeString()}
                          </div>
                          <div className="mt-0.5 font-mono text-[10px] text-muted-foreground/60">
                            {entry.chain_hash.substring(0, 12)}…
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Session context */}
        <Card className="mt-8">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>Current Session</CardTitle>
                <CardDescription>Authenticated principal and organization context</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-widest text-muted-foreground">User</dt>
                <dd className="mt-1 font-medium">{session.display_name}</dd>
                <dd className="font-mono text-xs text-muted-foreground">{session.user_id}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-widest text-muted-foreground">Email</dt>
                <dd className="mt-1 font-medium">{session.email}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-widest text-muted-foreground">Organization</dt>
                <dd className="mt-1 font-medium">{session.organization_display_name}</dd>
                <dd className="font-mono text-xs text-muted-foreground">{session.organization_id}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-widest text-muted-foreground">Role</dt>
                <dd className="mt-1">
                  <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-xs">
                    {session.role}
                  </span>
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
