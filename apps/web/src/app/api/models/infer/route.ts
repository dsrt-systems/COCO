import { NextResponse } from 'next/server';
import { ModelFabricGateway } from '@coco/model-fabric';
import { getSession } from '@/lib/coco/security/context';
import { createServiceClient } from '@/lib/supabase/service';
import { newId, prefixedId } from '@coco/common';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: 'not_authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const prompt = body.prompt ?? 'Hello, explain your capabilities in 2 sentences.';
  const capability = body.capability ?? 'reason.fast';
  const requestedModel = body.model_id;

  const gateway = new ModelFabricGateway();
  const router = gateway.getRouter();

  const routeDecision = router.route({
    route_id: newId(),
    capability,
    preferences: {
      preferred_models: requestedModel ? [requestedModel] : [],
      excluded_models: [],
      requires_tool_calling: false,
      requires_vision: false,
      requires_json_mode: false,
      allows_streaming: true,
    },
    params: {
      temperature: 0.7,
      max_output_tokens: 1024,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      stop_sequences: [],
      response_format: 'text',
      tool_definitions: [], // Fixed missing property
    },
    routing_hints: {
      quality_floor: 'good',
      allow_fallback: true,
      allow_cross_provider: true,
    },
  });

  const encoder = new TextEncoder();

  const customReadable = new ReadableStream({
    async start(controller) {
      try {
        const stream = gateway.inferStream({
          inference_id: newId(),
          model_id: routeDecision.selected_model_id,
          messages: [
            {
              role: 'system',
              content: [{ kind: 'text', text: 'You are an expert AI specialist operating in the COCO architecture.' }],
            },
            {
              role: 'user',
              content: [{ kind: 'text', text: prompt }],
            },
          ],
          params: {
            max_output_tokens: 1024,
            temperature: 0.7,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
            stop_sequences: [],
            response_format: 'text',
            tool_definitions: [], // Fixed missing property
          },
          tools: [],
          stream: true,
        });

        for await (const event of stream) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));

          if (event.kind === 'stream_end' && event.usage_snapshot) {
            const service = createServiceClient();
            await service.schema('models').from('model_calls').insert({
              call_id: prefixedId('modelCall'),
              organization_id: session.organization_id,
              route_id: routeDecision.route_id,
              model_id: routeDecision.selected_model_id,
              provider: routeDecision.selected_provider,
              endpoint: routeDecision.selected_endpoint,
              capability_requested: capability,
              input_tokens: event.usage_snapshot.input_tokens,
              output_tokens: event.usage_snapshot.output_tokens,
              cost_usd: event.usage_snapshot.cost_usd,
              latency_ms: 500,
              finish_reason: event.finish_reason ?? 'stop',
              status: 'success',
            });
          }
        }
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ kind: 'stream_error', error_message: (err as Error).message })}\n\n`,
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(customReadable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
