import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { ModelFabricGateway } from '@coco/model-fabric';
import { prefixedId } from '@coco/common';

export async function POST(req: Request) {
  try {
    const { user, organizationId } = await createServerSupabase();
    if (!user || !organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { model_id, prompt, temperature, max_tokens, stream = true } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const selectedModel = model_id ?? 'anthropic/claude-3-5-sonnet@20241022';
    const gateway = new ModelFabricGateway();
    const router = gateway.getRouter();

    const inferenceId = prefixedId('call');

    // Make route decision for tracking & audit
    const routeDecision = router.route({
      route_id: prefixedId('call'),
      capability: 'reason.standard' as any,
      preferences: {
        preferred_models: [selectedModel],
        excluded_models: [],
        requires_tool_calling: false,
        requires_vision: false,
        requires_json_mode: false,
        allows_streaming: stream,
      },
      prompt_vars: {},
      params: {
        max_output_tokens: max_tokens ?? 4096,
        temperature: temperature ?? 0.7,
        top_p: 1.0,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
        stop_sequences: [],
        response_format: 'text',
        tool_definitions: [],
        reasoning_effort: 0,
      },
      routing_hints: {
        quality_floor: 'good' as any,
        allow_fallback: true,
        allow_cross_provider: true,
      },
    });

    const inferenceReq = {
      inference_id: inferenceId,
      model_id: selectedModel,
      messages: [
        {
          role: 'user' as const,
          content: [{ kind: 'text' as const, text: prompt }],
        },
      ],
      params: {
        max_output_tokens: max_tokens ?? 4096,
        temperature: temperature ?? 0.7,
        top_p: 1.0,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
        stop_sequences: [],
        response_format: 'text' as const,
        tool_definitions: [],
        reasoning_effort: 0,
      },
      tools: [],
      stream,
    };

    if (stream) {
      const encoder = new TextEncoder();
      const customStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const event of gateway.inferStream(inferenceReq)) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (err) {
            controller.error(err);
          }
        },
      });

      return new Response(customStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    let fullText = '';
    let usageSnapshot: any = null;

    for await (const event of gateway.inferStream(inferenceReq)) {
      if (event.kind === 'content_delta' && event.text_delta) {
        fullText += event.text_delta;
      }
      if (event.kind === 'stream_end' && event.usage_snapshot) {
        usageSnapshot = event.usage_snapshot;
      }
    }

    return NextResponse.json({
      inference_id: inferenceId,
      model_id: selectedModel,
      text: fullText,
      route_decision: routeDecision,
      usage: usageSnapshot,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Inference failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
