// .row tree row — chevron + folder/file glyph + name + count + active highlight.

import { wsSvgEl } from '../icons';
import { showContextMenu, fileMenuItems, folderMenuItems } from './ContextMenu';
import type { TreeNode } from '../types';

export interface TreeRowOpts {
  node: TreeNode;
  onActivate?: (node: TreeNode, path: string) => void;
  onContextAction?: (action: string, node: TreeNode, path: string) => void;
  pathPrefix: string;
}

export function renderTreeRow(opts: TreeRowOpts): HTMLElement {
  const { node } = opts;
  const row = activeDocument.createDiv();
  row.className = 'row';
  row.dataset.depth = String(node.depth);
  if (node.type === 'folder') row.classList.add('is-folder');
  if (node.active) row.classList.add('active');
  row.style.setProperty('--depth', String(node.depth));

  if (node.type === 'folder') {
    const chev = activeDocument.createSpan();
    chev.className = 'chevron';
    if (node.expanded) chev.classList.add('open');
    chev.appendChild(wsSvgEl('chevron', 10));
    row.appendChild(chev);
  } else {
    const spacer = activeDocument.createSpan();
    spacer.className = 'chevron empty';
    row.appendChild(spacer);
  }

  const glyph = activeDocument.createSpan();
  glyph.className = 'row-glyph';
  glyph.appendChild(wsSvgEl(node.type === 'folder' ? 'folder' : 'file', 12));
  row.appendChild(glyph);

  const name = activeDocument.createSpan();
  name.className = 'name';
  name.textContent = node.name;
  row.appendChild(name);

  if (typeof node.count === 'number' || node.count === '—') {
    const count = activeDocument.createSpan();
    count.className = 'count';
    count.textContent = String(node.count);
    row.appendChild(count);
  }

  row.addEventListener('click', () => {
    const path = opts.pathPrefix ? `${opts.pathPrefix}/${node.name}` : node.name;
    if (node.type === 'folder') {
      const chev = row.querySelector('.chevron');
      if (node.expanded) {
        // Currently expanded — collapse: drop chevron-open + remove the
        // .tree sibling that holds this folder's children.
        node.expanded = false;
        chev?.classList.remove('open');
        const next = row.nextElementSibling;
        if (next?.classList.contains('tree')) {
          next.remove();
        }
      } else {
        // Currently collapsed — expand: set chevron-open + render the
        // subtree once and insert it as a sibling right after this row.
        node.expanded = true;
        chev?.classList.add('open');
        if (node.children?.length) {
          const sub = renderTree(node.children, {
            ...opts,
            pathPrefix: opts.pathPrefix ? `${opts.pathPrefix}/${node.name}` : node.name,
          });
          row.after(sub);
        }
      }
    }
    opts.onActivate?.(node, path);
  });

  row.addEventListener('contextmenu', (evt) => {
    evt.preventDefault();
    const path = opts.pathPrefix ? `${opts.pathPrefix}/${node.name}` : node.name;
    const fire = (action: string) => () => opts.onContextAction?.(action, node, path);
    const items =
      node.type === 'folder'
        ? folderMenuItems({
            newNote: fire('new-note'),
            newFolder: fire('new-folder'),
            rename: fire('rename'),
            reveal: fire('reveal'),
            delete: fire('delete'),
          })
        : fileMenuItems({ filePath: path, fileBasename: node.name }, {
            rename: fire('rename'),
            duplicate: fire('duplicate'),
            reveal: fire('reveal'),
            copyWikilink: fire('copy-wikilink'),
            copyMarkdownLink: fire('copy-markdown-link'),
            delete: fire('delete'),
          });
    showContextMenu(evt.clientX, evt.clientY, items);
  });

  return row;
}

export function renderTree(nodes: TreeNode[], opts: Omit<TreeRowOpts, 'node'>): HTMLElement {
  const container = activeDocument.createDiv();
  container.className = 'tree';
  container.setAttribute('role', 'tree');
  for (const node of nodes) {
    container.appendChild(renderTreeRow({ ...opts, node }));
    if (node.type === 'folder' && node.expanded && node.children?.length) {
      const sub = renderTree(node.children, {
        ...opts,
        pathPrefix: opts.pathPrefix ? `${opts.pathPrefix}/${node.name}` : node.name,
      });
      container.appendChild(sub);
    }
  }
  return container;
}
