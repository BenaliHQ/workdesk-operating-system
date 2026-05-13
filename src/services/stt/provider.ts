// STT provider abstraction.
//
// Two M1.0 providers (groq, openai) share an OpenAI-compatible whisper endpoint
// shape, so a single implementation handles both. Deepgram is wired as a stub
// pending its own request shape; until then we route Deepgram → openai-compatible
// against Deepgram's `/v1/listen` endpoint when the operator points us there.
//
// Provider selection lives in `settings.capture.provider`. The endpoint /
// auth scheme is encoded here so the rest of the plugin stays provider-agnostic.

import type { BlobLike } from '../capture/recorder';
import { OpenAICompatibleProvider, type HttpFn } from './openai-compatible';
import type { WorkdeskSettings } from '../../settings';

export interface SttProvider {
  readonly name: string;
  readonly model: string;
  transcribe(blob: BlobLike, opts?: { language?: string }): Promise<TranscriptionResult>;
}

export interface TranscriptionResult {
  text: string;
  language?: string;
  durationMs?: number;
}

export interface ProviderFactoryDeps {
  apiKey: string;
  httpFn?: HttpFn;
}

export function getProvider(settings: WorkdeskSettings, deps: ProviderFactoryDeps): SttProvider {
  const model = settings.capture.model;
  switch (settings.capture.provider) {
    case 'groq':
      return new OpenAICompatibleProvider({
        name: 'groq',
        endpoint: 'https://api.groq.com/openai/v1/audio/transcriptions',
        apiKey: deps.apiKey,
        model,
        httpFn: deps.httpFn,
      });
    case 'openai':
      return new OpenAICompatibleProvider({
        name: 'openai',
        endpoint: 'https://api.openai.com/v1/audio/transcriptions',
        apiKey: deps.apiKey,
        model,
        httpFn: deps.httpFn,
      });
    case 'deepgram':
      return new OpenAICompatibleProvider({
        name: 'deepgram',
        endpoint: 'https://api.deepgram.com/v1/listen',
        apiKey: deps.apiKey,
        model,
        httpFn: deps.httpFn,
      });
  }
}
