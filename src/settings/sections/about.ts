// About sub-tab — plugin metadata + links.

import type WorkdeskosPlugin from '../../main';
import { sectionLabel } from '../../components/forms';

export function mountAboutSection(parent: HTMLElement, _plugin: WorkdeskosPlugin): void {
  parent.dataset.tab = 'about';
  sectionLabel(parent, 'ABOUT');

  const body = document.createElement('div');
  body.className = 'about-body';

  const title = document.createElement('h3');
  title.textContent = 'WorkdeskOS Plugin';
  body.appendChild(title);

  const version = document.createElement('div');
  version.className = 'desc';
  version.textContent = 'Version 0.1.0 · MIT';
  body.appendChild(version);

  const links = document.createElement('div');
  links.className = 'about-links';
  const repo = document.createElement('a');
  repo.href = 'https://github.com/BenaliHQ/workdeskos-plugin';
  repo.textContent = 'GitHub';
  repo.target = '_blank';
  links.appendChild(repo);
  body.appendChild(links);

  parent.appendChild(body);
}
