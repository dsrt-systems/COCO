import type { ModelInferenceRequest, ModelInferenceEvent, ExtendedModelDescriptor } from '@coco/protocol';
import { prefixedId } from '@coco/common';
import { BUILTIN_MODEL_REGISTRY } from './registry';
import { ModelRouter } from './router';

/**
 * Model Fabric Gateway — Execution engine.
 * Receives ModelInferenceRequest, resolves provider API keys from environment,
 * executes stream, tracks token usage, calculates cost, and returns events.
 */
export class ModelFabricGateway {
  private router: ModelRouter;
  private registryMap: Map<string, ExtendedModelDescriptor>;

  constructor(customRegistry?: ExtendedModelDescriptor[]) {
    const registry = customRegistry ?? BUILTIN_MODEL_REGISTRY;
    this.router = new ModelRouter(registry);
    this.registryMap = new Map(registry.map((m) => [m.model_id, m]));
  }

  public getRouter(): ModelRouter {
    return this.router;
  }

  public async *inferStream(request: ModelInferenceRequest): AsyncGenerator<ModelInferenceEvent> {
    const model = this.registryMap.get(request.model_id);
    const provider = model?.provider ?? this.detectProvider(request.model_id);

    const startTime = Date.now();
    let seq = 0;

    yield {
      inference_id: request.inference_id,
      sequence: seq++,
      kind: 'stream_start',
      emitted_at_unix_ms: startTime,
    };

    let totalText = '';
    let inputTokensEst = 0;
    let outputTokensEst = 0;

    try {
      if (provider === 'anthropic') {
        for await (const chunk of this.callAnthropicStream(request, model)) {
          totalText += chunk;
          outputTokensEst += Math.ceil(chunk.length / 4);
          yield {
            inference_id: request.inference_id,
            sequence: seq++,
            kind: 'content_delta',
            text_delta: chunk,
            emitted_at_unix_ms: Date.now(),
          };
        }
      } else {
        for await (const chunk of this.callOpenAICompatibleStream(request, model, provider)) {
          totalText += chunk;
          outputTokensEst += Math.ceil(chunk.length / 4);
          yield {
            inference_id: request.inference_id,
            sequence: seq++,
            kind: 'content_delta',
            text_delta: chunk,
            emitted_at_unix_ms: Date.now(),
          };
        }
      }
    } catch (err) {
      yield {
        inference_id: request.inference_id,
        sequence: seq++,
        kind: 'stream_error',
        error_message: (err as Error).message,
        finish_reason: 'error',
        emitted_at_unix_ms: Date.now(),
      };
      return;
    }

    inputTokensEst = Math.ceil(
      request.messages.reduce((acc, m) => acc + m.content.reduce((cAcc, c) => cAcc + (c.text?.length ?? 0), 0), 0) / 4
    );

    const costUsd = this.calculateCost(model, inputTokensEst, outputTokensEst);

    yield {
      inference_id: request.inference_id,
      sequence: seq++,
      kind: 'stream_end',
      finish_reason: 'stop',
      usage_snapshot: {
        input_tokens: inputTokensEst,
        output_tokens: outputTokensEst,
        cached_tokens: 0,
        reasoning_tokens: 0,
        cost_usd: costUsd,
      },
      emitted_at_unix_ms: Date.now(),
    };
  }

  private async *callAnthropicStream(
    request: ModelInferenceRequest,
    descriptor?: ExtendedModelDescriptor
  ): AsyncGenerator<string> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY environment variable is not set');

    const modelName = descriptor?.model_id.split('/')[1]?.split('@')[0] ?? 'claude-3-5-sonnet-20241022';

    const systemMsg = request.messages.find((m) => m.role === 'system')?.content[0]?.text ?? '';
    const userMsgs = request.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content.map((c) => c.text ?? '').join('\n'),
      }));

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        max_tokens: request.params.max_output_tokens ?? 4096,
        temperature: request.params.temperature,
        system: systemMsg,
        messages: userMsgs,
        stream: true,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic API error (${res.status}): ${errText}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error('No readable stream from Anthropic API');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6).trim();
          if (dataStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              yield parsed.delta.text;
            }
          } catch {
            // ignore non-JSON stream events
          }
        }
      }
    }
  }

  private async *callOpenAICompatibleStream(
    request: ModelInferenceRequest,
    descriptor: ExtendedModelDescriptor | undefined,
    provider: string
  ): AsyncGenerator<string> {
    const { baseUrl, apiKey, rawModelName } = this.resolveEndpointDetails(provider, request.model_id, descriptor);

    const formattedMessages = request.messages.map((m) => ({
      role: m.role,
      content: m.content.map((c) => c.text ?? '').join('\n'),
    }));

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: rawModelName,
        messages: formattedMessages,
        temperature: request.params.temperature,
        max_tokens: request.params.max_output_tokens,
        stream: true,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`${provider.toUpperCase()} API error (${res.status}): ${errText}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error(`No readable stream from ${provider} API`);

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6).trim();
          if (dataStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(dataStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) yield delta;
          } catch {
            // ignore stream parsing blips
          }
        }
      }
    }
  }

  private resolveEndpointDetails(provider: string, modelId: string, descriptor?: ExtendedModelDescriptor) {
    let baseUrl = 'https://api.openai.com/v1';
    let apiKeyEnv = 'OPENAI_API_KEY';
    let rawModelName = modelId;

    if (descriptor && descriptor.endpoints[0]) {
      baseUrl = descriptor.endpoints[0].base_url;
      apiKeyEnv = descriptor.endpoints[0].credential_env_var;
      rawModelName = modelId.includes('/') ? modelId.split('/')[1]?.split('@')[0]! : modelId;
    } else {
      if (provider === 'groq') {
        baseUrl = 'https://api.groq.com/openai/v1';
        apiKeyEnv = 'GROQ_API_KEY';
        rawModelName = modelId.replace('groq/', '');
      } else if (provider === 'deepseek') {
        baseUrl = 'https://api.deepseek.com/v1';
        apiKeyEnv = 'DEEPSEEK_API_KEY';
        rawModelName = 'deepseek-reasoner';
      } else if (provider === 'google') {
        baseUrl = 'https://generativelanguage.googleapis.com/v1beta/openai/';
        apiKeyEnv = 'GOOGLE_API_KEY';
        rawModelName = 'gemini-2.0-flash';
      } else if (provider === 'openrouter') {
        baseUrl = 'https://openrouter.ai/api/v1';
        apiKeyEnv = 'OPENROUTER_API_KEY';
        rawModelName = 'auto';
      }
    }

    const apiKey = process.env[apiKeyEnv];
    if (!apiKey) throw new Error(`Missing API Key environment variable: ${apiKeyEnv}`);

    return { baseUrl, apiKey, rawModelName };
  }

  private detectProvider(modelId: string): string {
    if (modelId.startsWith('anthropic')) return 'anthropic';
    if (modelId.startsWith('groq')) return 'groq';
    if (modelId.startsWith('deepseek')) return 'deepseek';
    if (modelId.startsWith('google')) return 'google';
    if (modelId.startsWith('openrouter')) return 'openrouter';
    return 'openai';
  }

  private calculateCost(descriptor: ExtendedModelDescriptor | undefined, inputTokens: number, outputTokens: number): number {
    if (!descriptor) return 0.0001;
    const inCost = (inputTokens / 1_000_000) * descriptor.cost.input_per_million_usd;
    const outCost = (outputTokens / 1_000_000) * descriptor.cost.output_per_million_usd;
    return Number((inCost + outCost).toFixed(6));
  }
}

/**
 * ModelGateway — High-level non-streaming & streaming interface for agent runtimes.
 */
export class ModelGateway {
  private fabricGateway: ModelFabricGateway;

  constructor(customRegistry?: ExtendedModelDescriptor[]) {
    this.fabricGateway = new ModelFabricGateway(customRegistry);
  }

  public async generate(params: {
    model: string;
    messages: Array<{ role: 'system' | 'user' | 'assistant' | 'tool'; content: string }>;
    temperature?: number;
    maxTokens?: number;
  }): Promise<{ content: string; usage?: { input_tokens: number; output_tokens: number; cost_usd: number } }> {
    const inferenceId = prefixedId('call');
    const req: ModelInferenceRequest = {
      inference_id: inferenceId,
      model_id: params.model,
      messages: params.messages.map((m) => ({
        role: m.role,
        content: [{ kind: 'text' as const, text: m.content }],
      })),
      params: {
        max_output_tokens: params.maxTokens ?? 4096,
        temperature: params.temperature ?? 0.0,
        top_p: 1.0,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
        stop_sequences: [],
        response_format: 'text',
        tool_definitions: [],
        reasoning_effort: 0,
      },
      tools: [],
      stream: true,
    };

    let content = '';
    let usage: { input_tokens: number; output_tokens: number; cost_usd: number } | undefined;

    for await (const event of this.fabricGateway.inferStream(req)) {
      if (event.kind === 'content_delta' && event.text_delta) {
        content += event.text_delta;
      }
      if (event.kind === 'stream_end' && event.usage_snapshot) {
        usage = event.usage_snapshot;
      }
      if (event.kind === 'stream_error') {
        throw new Error(event.error_message ?? 'Model stream error');
      }
    }

    return { content, usage };
  }

  public inferStream(request: ModelInferenceRequest) {
    return this.fabricGateway.inferStream(request);
  }
}

