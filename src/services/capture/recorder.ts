// MediaRecorder wrapper for Quick capture.
//
// Records audio in 250 ms timeslices so chunks land in the buffer
// progressively (lets us send partials for streaming providers later).
// Before `stop()` we call `requestData()` so the trailing chunk is flushed
// before the final blob is assembled. The wrapper is injection-friendly:
// tests pass a fake `recorderFactory` so MediaRecorder isn't required at
// test time.

export interface RecorderFactory {
  create(stream: MediaStream, mimeType?: string): RecorderHandle;
}

export interface RecorderHandle {
  start(timeslice?: number): void;
  stop(): void;
  requestData(): void;
  ondataavailable: ((chunk: BlobLike) => void) | null;
  onstop: (() => void) | null;
  onerror: ((err: unknown) => void) | null;
  state(): 'inactive' | 'recording' | 'paused';
  mimeType(): string;
}

export interface BlobLike {
  size: number;
  type: string;
  arrayBuffer?: () => Promise<ArrayBuffer>;
}

export interface PermissionGate {
  requestMic(constraints?: MediaStreamConstraints): Promise<MediaStream>;
}

export interface AudioRecorderOptions {
  factory?: RecorderFactory;
  permission?: PermissionGate;
  preferredMimeType?: string;
  timesliceMs?: number;
}

export interface RecordingResult {
  blob: BlobLike;
  mimeType: string;
}

export class AudioRecorder {
  private factory: RecorderFactory;
  private permission: PermissionGate;
  private preferredMime: string;
  private timeslice: number;
  private stream: MediaStream | null = null;
  private handle: RecorderHandle | null = null;
  private chunks: BlobLike[] = [];

  constructor(opts: AudioRecorderOptions = {}) {
    this.factory = opts.factory ?? defaultRecorderFactory();
    this.permission = opts.permission ?? defaultPermissionGate();
    this.preferredMime = opts.preferredMimeType ?? 'audio/webm;codecs=opus';
    this.timeslice = opts.timesliceMs ?? 250;
  }

  async start(): Promise<void> {
    if (this.handle && this.handle.state() === 'recording') return;
    this.stream = await this.permission.requestMic({ audio: true });
    this.chunks = [];
    const handle = this.factory.create(this.stream, this.preferredMime);
    handle.ondataavailable = (chunk) => {
      if (chunk && chunk.size > 0) this.chunks.push(chunk);
    };
    handle.start(this.timeslice);
    this.handle = handle;
  }

  async stop(): Promise<RecordingResult> {
    const handle = this.handle;
    if (!handle) throw new Error('recorder not started');
    return new Promise<RecordingResult>((resolve, reject) => {
      handle.onstop = () => {
        const mimeType = handle.mimeType() || this.preferredMime;
        const blob = assembleBlob(this.chunks, mimeType);
        this.releaseStream();
        resolve({ blob, mimeType });
      };
      handle.onerror = (err) => {
        this.releaseStream();
        reject(err);
      };
      handle.requestData();
      handle.stop();
    });
  }

  cancel(): void {
    if (this.handle && this.handle.state() === 'recording') {
      try {
        this.handle.stop();
      } catch {
        // best-effort
      }
    }
    this.releaseStream();
    this.handle = null;
    this.chunks = [];
  }

  private releaseStream(): void {
    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        try {
          track.stop();
        } catch {
          // ignore
        }
      }
      this.stream = null;
    }
  }
}

function assembleBlob(chunks: BlobLike[], mimeType: string): BlobLike {
  const BlobCtor = (globalThis as unknown as { Blob?: typeof Blob }).Blob;
  const allRealBlobs = !!BlobCtor && chunks.every((c) => c instanceof BlobCtor);
  if (BlobCtor && allRealBlobs) {
    return new BlobCtor(chunks as BlobPart[], { type: mimeType });
  }
  // Fallback for synthetic chunks (tests) or mixed bag — sum sizes,
  // expose a placeholder arrayBuffer so STT can still serialize.
  const size = chunks.reduce((acc, c) => acc + c.size, 0);
  return {
    size,
    type: mimeType,
    arrayBuffer: async () => new ArrayBuffer(size),
  };
}

function defaultRecorderFactory(): RecorderFactory {
  return {
    create(stream, mimeType) {
      const ctor = (globalThis as unknown as { MediaRecorder?: typeof MediaRecorder }).MediaRecorder;
      if (!ctor) throw new Error('MediaRecorder not available in this environment');
      const r = new ctor(stream, mimeType ? { mimeType } : undefined);
      return wrapMediaRecorder(r);
    },
  };
}

function defaultPermissionGate(): PermissionGate {
  return {
    async requestMic(constraints) {
      const md = (globalThis as unknown as { navigator?: Navigator }).navigator?.mediaDevices;
      if (!md) throw new Error('mediaDevices not available');
      return md.getUserMedia(constraints ?? { audio: true });
    },
  };
}

function wrapMediaRecorder(r: MediaRecorder): RecorderHandle {
  const handle: RecorderHandle = {
    start: (timeslice) => r.start(timeslice),
    stop: () => r.stop(),
    requestData: () => r.requestData(),
    ondataavailable: null,
    onstop: null,
    onerror: null,
    state: () => r.state,
    mimeType: () => r.mimeType ?? '',
  };
  r.ondataavailable = (ev) => {
    handle.ondataavailable?.(ev.data);
  };
  r.onstop = () => {
    handle.onstop?.();
  };
  r.onerror = (ev) => {
    handle.onerror?.(ev);
  };
  return handle;
}
