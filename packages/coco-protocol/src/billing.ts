import { z } from 'zod';
import { MissionTier } from './enums';

export const SubscriptionStatus = z.enum(['active', 'trialing', 'past_due', 'cancelled', 'paused']);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatus>;

export const UsageType = z.enum([
  'model_tokens',
  'tool_seconds',
  'storage_gb',
  'gpu_seconds',
  'human_approval',
  'deployment',
]);
export type UsageType = z.infer<typeof UsageType>;

export const SubscriptionRecordSchema = z.object({
  subscription_id: z.string(),
  organization_id: z.string(),
  tier: MissionTier.default('default'),
  status: SubscriptionStatus.default('active'),
  monthly_price_usd: z.number().nonnegative().default(0.0),
  compute_credits_monthly: z.number().nonnegative().default(10.0),
  external_provider: z.string().default('stripe'),
  external_customer_id: z.string().nullable().optional(),
  external_subscription_id: z.string().nullable().optional(),
  current_period_start: z.string(),
  current_period_end: z.string(),
  canceled_at: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type SubscriptionRecord = z.infer<typeof SubscriptionRecordSchema>;

export const UsageRecordInputSchema = z.object({
  mission_id: z.string().optional(),
  user_id: z.string().optional(),
  usage_type: UsageType,
  resource_unit: z.string(),
  quantity: z.number().positive(),
  unit_price_usd: z.number().nonnegative().default(0.0),
  total_cost_usd: z.number().nonnegative(),
  metadata: z.record(z.unknown()).default({}),
});
export type UsageRecordInput = z.infer<typeof UsageRecordInputSchema>;

export const EmailNotificationSchema = z.object({
  recipient_email: z.string().email(),
  subject: z.string().min(1),
  template_id: z.enum(['approval_required', 'budget_warning', 'mission_completed', 'welcome']),
  template_vars: z.record(z.unknown()).default({}),
});
export type EmailNotification = z.infer<typeof EmailNotificationSchema>;
