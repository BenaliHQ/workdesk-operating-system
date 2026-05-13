// OpenAI-compatible whisper provider.
//
// Sends a multipart/form-data POST to the provider's transcription endpoint.
// Uses Obsidian's `requestUrl` so the request bypasses CORS (Electron main
// process). FormData isn't portable across the Obsidian/Node bridge, so we
// hand-assemble the multipart body as an ArrayBuffer with a generated boundary.
//
// HttpFn is injected so tests can mock the network without monkey-patching.

import type { SttProvider, TranscriptionResult } from './provider';
import type { BlobLike } from '../capture/recorder';

export interface HttpResponse {
  status: number;
  text: string;
  json?: unknown;
}

export interface HttpRequest {
  url: string;
  method: 'POST';
  contentType: string;
  body: ArrayBuffer;
  headers: Record<string, string>;
}

export type HttpFn = (req: HttpRequest) => Promise<HttpResponse>;

export interface OpenAICompatibleOptions {
  name: string;
  endpoint: string;
  apiKey: string;
  model: string;
  httpFn?: HttpFn;
}

export class OpenAICompatibleProvider implements SttProvider {
  readonly name: string;
  readonly model: string;
  private endpoint: string;
  private apiKey: string;
  private httpFn: HttpFn;

  constructor(opts: OpenAICompatibleOptions) {
    this.name = opts.name;
    this.model = opts.model;
    this.endpoint = opts.endpoint;
    this.apiKey = opts.apiKey;
    this.httpFn = opts.httpFn ?? obsidianHttp;
  }

  async transcribe(blob: BlobLike, opts: { language?: string } = {}): Promise<TranscriptionResult> {
    if (!this.apiKey) throw new Error(`${this.name} STT key not configured`);
    const boundary = `----WorkdeskCapture${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
    const audioBytes = await readBlobBytes(blob);

    const fields: Array<[string, string]> = [
      ['model', this.model],
      ['response_format', 'json'],
    ];
    if (opts.language) fields.push(['language', opts.language]);

    const body = buildMultipart(boundary, fields, {
      filename: `capture.${audioExtension(blob.type)}`,
      contentType: blob.type || 'application/octet-stream',
      data: audioBytes,
    });

    const res = await this.httpFn({
      url: this.endpoint,
      method: 'POST',
      contentType: `multipart/form-data; boundary=${boundary}`,
      body,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: 'application/json',
      },
    });
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`${this.name} STT failed: ${res.status} ${res.text.slice(0, 200)}`);
    }
    const payload = (res.json as Record<string, unknown> | undefined) ?? parseJsonSafe(res.text);
    const text = pickTranscriptText(payload);
    if (!text) throw new Error(`${this.name} STT returned no transcript`);
    return { text, language: pickLanguage(payload) };
  }
}

async function readBlobBytes(blob: BlobLike): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === 'function') {
    const ab = await blob.arrayBuffer();
    return new Uint8Array(ab);
  }
  return new Uint8Array(0);
}

function buildMultipart(
  boundary: string,
  fields: Array<[string, string]>,
  file: { filename: string; contentType: string; data: Uint8Array },
): ArrayBuffer {
  const parts: Uint8Array[] = [];
  const enc = new TextEncoder();
  for (const [key, value] of fields) {
    parts.push(enc.encode(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`));
  }
  parts.push(
    enc.encode(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${file.filename}"\r\nContent-Type: ${file.contentType}\r\n\r\n`,
    ),
  );
  parts.push(file.data);
  parts.push(enc.encode(`\r\n--${boundary}--\r\n`));

  const total = parts.reduce((acc, p) => acc + p.byteLength, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.byteLength;
  }
  return out.buffer;
}

function audioExtension(mime: string): string {
  if (!mime) return 'webm';
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('wav')) return 'wav';
  if (mime.includes('mp4') || mime.includes('m4a')) return 'm4a';
  if (mime.includes('mpeg')) return 'mp3';
  return 'webm';
}

function parseJsonSafe(text: string): Record<string, unknown> | undefined {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function pickTranscriptText(payload: Record<string, unknown> | undefined): string {
  if (!payload) return '';
  if (typeof payload.text === 'string') return payload.text;
  const results = payload['results'] as Record<string, unknown> | undefined;
  const channels = (results?.['channels'] as Array<Record<string, unknown>> | undefined) ?? [];
  const alt = (channels[0]?.['alternatives'] as Array<Record<string, unknown>> | undefined) ?? [];
  if (typeof alt[0]?.['transcript'] === 'string') return alt[0]['transcript'] as string;
  return '';
}

function pickLanguage(payload: Record<string, unknown> | undefined): string | undefined {
  if (!payload) return undefined;
  if (typeof payload.language === 'string') return payload.language;
  return undefined;
}

async function obsidianHttp(req: HttpRequest): Promise<HttpResponse> {
  const obsidian = (await import('obsidian')) as unknown as {
    requestUrl?: (req: {
      url: string;
      method: string;
      contentType: string;
      body: ArrayBuffer;
      headers: Record<string, string>;
      throw?: boolean;
    }) => Promise<{ status: number; text: string; json?: unknown }>;
  };
  if (!obsidian.requestUrl) throw new Error('Obsidian requestUrl not available');
  const res = await obsidian.requestUrl({
    url: req.url,
    method: req.method,
    contentType: req.contentType,
    body: req.body,
    headers: { ...req.headers, 'Content-Type': req.contentType },
    throw: false,
  });
  return { status: res.status, text: res.text, json: res.json };
}
