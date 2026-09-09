import type {
  ModelCapability,
  ModelRouteRequest,
  ModelRouteDecision,
  ExtendedModelDescriptor,
  QualityFloor,
} from '@coco/protocol';
import { BUILTIN_MODEL_REGISTRY } from './registry';

export interface UtilityWeights {
  quality: number;
  latency: number;
  cost: number;
  availability: number;
}

const QUALITY_FLOOR_WEIGHTS: Record<QualityFloor, UtilityWeights> = {
  maximum: { quality: 0.7, latency: 0.1, cost: 0.05, availability: 0.15 },
  excellent: { quality: 0.55, latency: 0.15, cost: 0.15, availability: 0.15 },
  good: { quality: 0.35, latency: 0.25, cost: 0.25, availability: 0.15 },
  acceptable: { quality: 0.2, latency: 0.3, cost: 0.35, availability: 0.15 },
};

export class ModelRouter {
  private registry: ExtendedModelDescriptor[];

  constructor(customRegistry?: ExtendedModelDescriptor[]) {
    this.registry = customRegistry ?? BUILTIN_MODEL_REGISTRY;
  }

  public route(request: ModelRouteRequest): ModelRouteDecision {
    const candidates = this.filterCandidates(request);

    if (candidates.length === 0) {
      // Emergency fallback to OpenRouter or hardcoded primary
      const fallbackModel = this.registry.find((m) => m.provider === 'openrouter') ?? this.registry[0]!;
      return {
        route_id: request.route_id,
        selected_model_id: fallbackModel.model_id,
        selected_provider: fallbackModel.provider,
        selected_endpoint: fallbackModel.endpoints[0]?.base_url ?? '',
        fallback_chain: [],
        decision_rationale: 'Emergency fallback: no candidates passed all criteria',
        estimated_latency_ms: fallbackModel.performance?.median_latency_ms ?? 2000,
        estimated_cost_usd: 0.001,
        estimated_quality_score: 0.7,
        decided_at_unix_ms: Date.now(),
      };
    }

    // Explicit preference override (Deep Spec 4 §5.2 Stage 3)
    if (request.preferences.preferred_models.length > 0) {
      for (const prefId of request.preferences.preferred_models) {
        const found = candidates.find((c) => c.model_id === prefId || c.model_id.startsWith(prefId));
        if (found && found.endpoints[0]) {
          return this.buildDecision(request, found, candidates, 'Explicit user/agent model preference');
        }
      }
    }

    // Pareto utility scoring (Stage 5)
    const weights = QUALITY_FLOOR_WEIGHTS[request.routing_hints.quality_floor ?? 'good'];
    const scored = candidates.map((cand) => ({
      candidate: cand,
      score: this.computeUtility(cand, request.capability, weights, request.routing_hints),
    }));

    scored.sort((a, b) => b.score - a.score);

    const winner = scored[0]!.candidate;
    const rationale = `Selected based on Pareto utility (${scored[0]!.score.toFixed(3)}) for capability '${request.capability}'`;

    return this.buildDecision(request, winner, candidates, rationale);
  }

  private filterCandidates(request: ModelRouteRequest): ExtendedModelDescriptor[] {
    return this.registry.filter((model) => {
      // 1. Must support requested capability
      const hasCap = model.capabilities.some((cb) => cb.capability_id === request.capability);
      if (!hasCap) return false;

      // 2. Excluded models
      if (request.preferences.excluded_models.includes(model.model_id)) return false;

      // 3. Feature check
      if (request.preferences.requires_tool_calling && !model.features.supports_tool_calling) return false;
      if (request.preferences.requires_vision && !model.features.supports_vision) return false;
      if (request.preferences.requires_json_mode && !model.features.supports_json_mode) return false;

      // 4. Check endpoint health
      const hasHealthyEndpoint = model.endpoints.some((e) => e.health.state !== 'unavailable');
      if (!hasHealthyEndpoint) return false;

      return true;
    });
  }

  private computeUtility(
    model: ExtendedModelDescriptor,
    capability: ModelCapability,
    weights: UtilityWeights,
    hints: { max_cost_usd?: number; max_latency_ms?: number },
  ): number {
    const binding = model.capabilities.find((cb) => cb.capability_id === capability);
    const quality = binding?.observed_quality_score ?? binding?.declared_quality_score ?? 0.7;

    const lat = model.performance.median_latency_ms ?? 1500;
    const maxLat = hints.max_latency_ms ?? 5000;
    const latencyScore = Math.max(0, 1 - lat / maxLat);

    const costEst = (model.cost.input_per_million_usd * 2000 + model.cost.output_per_million_usd * 1000) / 1_000_000;
    const maxCost = hints.max_cost_usd ?? 0.05;
    const costScore = Math.max(0, 1 - costEst / maxCost);

    const availability = model.performance.reliability_score ?? 0.99;

    return (
      weights.quality * quality +
      weights.latency * latencyScore +
      weights.cost * costScore +
      weights.availability * availability
    );
  }

  private buildDecision(
    request: ModelRouteRequest,
    selected: ExtendedModelDescriptor,
    allCandidates: ExtendedModelDescriptor[],
    rationale: string,
  ): ModelRouteDecision {
    const fallbackChain = allCandidates
      .filter((c) => c.model_id !== selected.model_id)
      .slice(0, 2)
      .map((c) => c.model_id);

    const endpoint = selected.endpoints[0]!;

    return {
      route_id: request.route_id,
      selected_model_id: selected.model_id,
      selected_provider: selected.provider,
      selected_endpoint: endpoint.base_url,
      fallback_chain: fallbackChain,
      decision_rationale: rationale,
      estimated_latency_ms: selected.performance.median_latency_ms ?? 1000,
      estimated_cost_usd:
        (selected.cost.input_per_million_usd * 1000 + selected.cost.output_per_million_usd * 1000) / 1_000_000,
      estimated_quality_score:
        selected.capabilities.find((c) => c.capability_id === request.capability)?.declared_quality_score ?? 0.8,
      decided_at_unix_ms: Date.now(),
    };
  }
}
