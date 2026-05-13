// Drag-drop handlers for the terminal pane.
//
// shellEscape wraps a path so it can be pasted into a POSIX shell. Single
// quotes are the safest container; literal single quotes are escaped as
// `'\''`. Used by the drop handler before writing the path to the PTY.

export interface DropzoneOptions {
  element: HTMLElement;
  onPathDropped(path: string): void;
  onScreenshot?(blob: Blob): Promise<string> | string;
}

export function shellEscape(path: string): string {
  if (path.length === 0) return "''";
  if (/^[a-zA-Z0-9_./-]+$/.test(path)) return path;
  return `'${path.replace(/'/g, `'\\''`)}'`;
}

export function attachDropzone(opts: DropzoneOptions): () => void {
  const el = opts.element;
  let counter = 0;

  const onDragEnter = (e: DragEvent): void => {
    e.preventDefault();
    counter += 1;
    if (counter === 1) el.classList.add('term-drop-over');
  };
  const onDragOver = (e: DragEvent): void => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  };
  const onDragLeave = (e: DragEvent): void => {
    e.preventDefault();
    counter -= 1;
    if (counter <= 0) {
      counter = 0;
      el.classList.remove('term-drop-over');
    }
  };
  const onDrop = async (e: DragEvent): Promise<void> => {
    e.preventDefault();
    counter = 0;
    el.classList.remove('term-drop-over');

    const paths = collectDroppedPaths(e);
    if (paths.length > 0) {
      for (const p of paths) opts.onPathDropped(shellEscape(p));
      return;
    }

    if (opts.onScreenshot && e.dataTransfer?.files) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const f = e.dataTransfer.files[i];
        if (f && f.type.startsWith('image/')) {
          const resolved = await opts.onScreenshot(f);
          if (resolved) opts.onPathDropped(shellEscape(resolved));
        }
      }
    }
  };

  el.addEventListener('dragenter', onDragEnter);
  el.addEventListener('dragover', onDragOver);
  el.addEventListener('dragleave', onDragLeave);
  el.addEventListener('drop', onDrop);

  return () => {
    el.removeEventListener('dragenter', onDragEnter);
    el.removeEventListener('dragover', onDragOver);
    el.removeEventListener('dragleave', onDragLeave);
    el.removeEventListener('drop', onDrop);
  };
}

function collectDroppedPaths(e: DragEvent): string[] {
  const out: string[] = [];
  const files = e.dataTransfer?.files;
  if (!files) return out;
  for (let i = 0; i < files.length; i++) {
    const f = files[i] as File & { path?: string };
    if (f && typeof f.path === 'string' && f.path.length > 0) {
      out.push(f.path);
    }
  }
  return out;
}
