// Drag-drop hover — class toggles on the editor pane for file drag overlays.
//
// `.editor-pane.dragging-over` triggers the dashed atlas overlay
// ("Drop to insert path"). On drop, the caller decides what to do with the
// payload (insert wikilink at cursor / shell-escape into terminal / etc.).

export interface EditorDropHandlers {
  onPathDropped(path: string, evt: DragEvent): void;
}

export function attachEditorDragHover(host: HTMLElement, handlers: EditorDropHandlers): () => void {
  let depth = 0;

  const onEnter = (evt: DragEvent) => {
    depth++;
    evt.preventDefault();
    host.classList.add('dragging-over');
  };
  const onOver = (evt: DragEvent) => {
    evt.preventDefault();
    if (evt.dataTransfer) evt.dataTransfer.dropEffect = 'copy';
  };
  const onLeave = (_evt: DragEvent) => {
    depth = Math.max(0, depth - 1);
    if (depth === 0) host.classList.remove('dragging-over');
  };
  const onDrop = (evt: DragEvent) => {
    evt.preventDefault();
    depth = 0;
    host.classList.remove('dragging-over');
    const path = pickFilePath(evt);
    if (path) handlers.onPathDropped(path, evt);
  };

  host.addEventListener('dragenter', onEnter);
  host.addEventListener('dragover', onOver);
  host.addEventListener('dragleave', onLeave);
  host.addEventListener('drop', onDrop);

  return () => {
    host.removeEventListener('dragenter', onEnter);
    host.removeEventListener('dragover', onOver);
    host.removeEventListener('dragleave', onLeave);
    host.removeEventListener('drop', onDrop);
  };
}

function pickFilePath(evt: DragEvent): string | null {
  const dt = evt.dataTransfer;
  if (!dt) return null;
  const text = dt.getData?.('text/plain');
  if (text && text.length > 0) return text;
  const files = dt.files;
  if (files && files.length > 0) {
    const file = files[0] as File & { path?: string };
    return file.path ?? file.name;
  }
  return null;
}
