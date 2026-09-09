'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CreditCard, Zap, ShieldCheck, Check, ArrowRight, Loader2, Sparkles } from 'lucide-react';

const TIERS = [
  {
    id: 'default',
    name: 'Explore',
    price: '$0',
    description: 'Conservative resource envelope for early builders and testing.',
    features: ['$10/mo included credits', 'Max 4 parallel agents', 'Standard model routing', 'Basic Project Brain'],
    current: false,
  },
  {
    id: 'pro',
    name: 'Pro Builder',
    price: '$49',
    period: '/month',
    description: 'Advanced routing, deep research, and full specialist roster.',
    features: ['$100/mo included credits', 'Max 16 parallel agents', 'Frontier model access', 'Persistent Project Brain', 'Resend email alerts'],
    highlight: true,
  },
  {
    id: 'ranger',
    name: 'Ranger Autonomous',
    price: '$299',
    period: '/month',
    description: 'Maximum autonomy for multi-hour and multi-day missions.',
    features: ['$500/mo included credits', 'Max 64 parallel agents', 'Ranger Supervisor & Charters', 'Firecracker MicroVM Sandboxes', 'Priority compute & support'],
  },
  {
    id: 'enterprise',
    name: 'Private COCO',
    price: 'Custom',
    description: 'Dedicated infrastructure, BYOK encryption, and custom SLAs.',
    features: ['Unlimited compute credits', 'Dedicated GPU nodepool', 'KMS Bring-Your-Own-Key', 'SOC2 / HIPAA compliance', 'Custom specialist models'],
  },
];

export default function BillingPage() {
  const [subscription, setSubscription] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [upgradingTier, setUpgradingTier] = useState<string | null>(null);

  useEffect(() => {
    fetchBillingData();
  }, []);

  async function fetchBillingData() {
    setLoading(true);
    try {
      const [subRes, usageRes] = await Promise.all([
        fetch('/api/billing/subscription'),
        fetch('/api/billing/usage'),
      ]);

      if (subRes.ok) {
        const subData = await subRes.json();
        setSubscription(subData.subscription);
      }
      if (usageRes.ok) {
        const usageData = await usageRes.json();
        setUsage(usageData.usage);
      }
    } catch {
      toast.error('Failed to load billing data');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpgrade(tierId: string) {
    if (tierId === 'default' || tierId === subscription?.tier) return;
    
    setUpgradingTier(tierId);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: tierId }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || 'Upgrade checkout failed');
      }
    } catch {
      toast.error('Network error creating checkout session');
    } finally {
      setUpgradingTier(null);
    }
  }

  const activeTier = subscription?.tier ?? 'default';

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto pb-24">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
          <CreditCard className="w-8 h-8 text-indigo-400" /> Subscriptions & Usage Metering
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Manage your plan, compute credit envelopes, and inspect real-time usage breakdowns.
        </p>
      </div>

      {/* Current Usage Banner */}
      {usage && (
        <Card className="p-6 border-zinc-800 bg-zinc-950/50 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-1">
                Active Tier: <span className="text-indigo-400 font-bold">{activeTier.toUpperCase()}</span>
              </div>
              <div className="text-2xl font-bold text-zinc-100">
                ${usage.spent_usd.toFixed(2)}{' '}
                <span className="text-sm font-normal text-zinc-500">
                  of ${usage.monthly_cap_usd.toFixed(2)} monthly credits spent
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-mono font-bold text-emerald-400">
                ${usage.remaining_usd.toFixed(2)}
              </span>
              <div className="text-xs text-zinc-500">Remaining credit headroom</div>
            </div>
          </div>

          <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                usage.utilization_pct >= 90
                  ? 'bg-red-500'
                  : usage.utilization_pct >= 75
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, usage.utilization_pct)}%` }}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 text-xs">
            {Object.entries(usage.by_type || {}).map(([type, cost]) => (
              <div key={type} className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                <div className="text-[10px] uppercase font-mono text-zinc-500">{type.replace('_', ' ')}</div>
                <div className="text-sm font-mono text-zinc-200 mt-0.5">${Number(cost).toFixed(4)}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tier Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {TIERS.map((tier) => {
          const isCurrent = activeTier === tier.id;
          const isUpgrading = upgradingTier === tier.id;

          return (
            <Card
              key={tier.id}
              className={`p-6 flex flex-col justify-between relative transition-all duration-200 ${
                tier.highlight
                  ? 'border-indigo-500/50 bg-indigo-500/5 shadow-[0_0_20px_rgba(99,102,241,0.15)]'
                  : 'border-zinc-800 bg-zinc-950/50'
              }`}
            >
              {tier.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-indigo-600 text-[10px] font-bold uppercase tracking-wider text-white flex items-center gap-1 shadow-md">
                  <Sparkles className="w-3 h-3" /> Most Popular
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-zinc-100">{tier.name}</h3>
                  <p className="text-xs text-zinc-400 mt-1 min-h-[32px]">{tier.description}</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-zinc-100">{tier.price}</span>
                  {tier.period && <span className="text-xs text-zinc-500">{tier.period}</span>}
                </div>

                <ul className="space-y-2 pt-2 border-t border-zinc-800/60 text-xs text-zinc-300">
                  {tier.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-6">
                <Button
                  onClick={() => handleUpgrade(tier.id)}
                  disabled={isCurrent || isUpgrading || tier.id === 'default'}
                  className={`w-full ${
                    isCurrent
                      ? 'bg-zinc-800 text-zinc-400 cursor-default'
                      : tier.highlight
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100'
                  }`}
                >
                  {isUpgrading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : isCurrent ? (
                    'Current Plan'
                  ) : tier.id === 'enterprise' ? (
                    'Contact Sales'
                  ) : (
                    <>
                      Upgrade <ArrowRight className="w-4 h-4 ml-1.5" />
                    </>
                  )}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
