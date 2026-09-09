import { z } from 'zod';
import { ToolScope } from './enums';

export const CapabilityTokenSchema = z.object({
  token_id: z.string(),
  agent_instance_id: z.string(),
  tool_id: z.string(),
  granted_scope: ToolScope,
  max_invocations: z.number().int().positive(),
  invocations_used: z.number().int().nonnegative().default(0),
  issued_at_unix_ms: z.number().int().nonnegative(),
  expires_at_unix_ms: z.number().int().nonnegative(),
  issued_by: z.string().default('A6_risk_officer'),
  signature: z.string(),
});
export type CapabilityToken = z.infer<typeof CapabilityTokenSchema>;
