import type { FastifyInstance } from 'fastify';
import WebSocket from 'ws';
import { authMiddleware, getUser } from '../lib/auth.js';
import { prisma } from '../lib/prisma.js';
import { decrypt } from '../lib/encryption.js';
import { XAI_REALTIME_URL, XAI_REALTIME_MODEL } from '@xai-calling/shared';

const PREVIEW_TEXT = "Hi there! This is a preview of how I sound. I hope you like my voice!";

export function registerVoicePreviewRoutes(server: FastifyInstance) {
  server.addHook('preHandler', authMiddleware);

  server.post('/api/voice-preview', async (request, reply) => {
    const { organizationId } = getUser(request);
    const { voice } = request.body as { voice: string };

    if (!voice) {
      return reply.status(400).send({ error: 'Voice is required' });
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    const xaiApiKey = org?.xaiApiKey
      ? decrypt(org.xaiApiKey)
      : process.env.XAI_API_KEY;

    if (!xaiApiKey) {
      return reply.status(400).send({ error: 'No xAI API key configured' });
    }

    try {
      const audioBuffer = await generateVoicePreview(xaiApiKey, voice);
      reply.header('Content-Type', 'audio/wav');
      return reply.send(audioBuffer);
    } catch (err: any) {
      console.error('Voice preview error:', err.message);
      return reply.status(500).send({ error: 'Failed to generate voice preview' });
    }
  });
}

function generateVoicePreview(apiKey: string, voice: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const wsUrl = `${XAI_REALTIME_URL}?model=${XAI_REALTIME_MODEL}`;
    console.log(`[VoicePreview] Connecting to ${wsUrl} with voice=${voice}`);
    const ws = new WebSocket(wsUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const audioChunks: Buffer[] = [];
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      ws.close();
      reject(new Error('Voice preview timed out'));
    }, 15000);

    function finish(pcmData: Buffer) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      const wavBuffer = pcmToWav(pcmData, 24000);
      resolve(wavBuffer);
    }

    function fail(err: Error) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(err);
    }

    ws.on('open', () => {
      console.log('[VoicePreview] WebSocket connected');
      ws.send(JSON.stringify({
        type: 'session.update',
        session: {
          voice,
          instructions: 'Say exactly the following text and nothing else.',
          turn_detection: null,
          audio: {
            output: { format: { type: 'audio/pcm', sample_rate: 24000 } },
          },
        },
      }));

      ws.send(JSON.stringify({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text: PREVIEW_TEXT }],
        },
      }));

      ws.send(JSON.stringify({
        type: 'response.create',
        response: {},
      }));
    });

    ws.on('message', (data: WebSocket.Data) => {
      let event: any;
      try {
        event = JSON.parse(typeof data === 'string' ? data : data.toString());
      } catch {
        return;
      }

      switch (event.type) {
        case 'response.audio.delta':
        case 'response.output_audio.delta':
          if (event.delta) {
            audioChunks.push(Buffer.from(event.delta, 'base64'));
          }
          break;

        case 'response.done':
          if (audioChunks.length > 0) {
            ws.close();
            finish(Buffer.concat(audioChunks));
          }
          break;

        case 'error':
          console.error('[VoicePreview] xAI error:', JSON.stringify(event.error));
          ws.close();
          fail(new Error(event.error?.message || 'xAI error'));
          break;

        default:
          console.log(`[VoicePreview] Event: ${event.type}`);
          break;
      }
    });

    ws.on('error', (err) => {
      console.error('[VoicePreview] WS error:', err.message);
      fail(err);
    });

    ws.on('close', (code, reason) => {
      console.log(`[VoicePreview] WS closed: ${code} ${reason?.toString()}`);
      if (audioChunks.length > 0) {
        finish(Buffer.concat(audioChunks));
      } else {
        fail(new Error(`WebSocket closed with code ${code} before receiving audio`));
      }
    });
  });
}

function pcmToWav(pcmData: Buffer, sampleRate: number): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmData.length;
  const headerSize = 44;

  const buffer = Buffer.alloc(headerSize + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  pcmData.copy(buffer, 44);

  return buffer;
}
