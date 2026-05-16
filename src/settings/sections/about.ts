// About sub-tab — plugin metadata + links.

import type WorkdeskOSPlugin from '../../main';
import { sectionLabel } from '../../components/forms';

export function mountAboutSection(parent: HTMLElement, plugin: WorkdeskOSPlugin): void {
  parent.dataset.tab = 'about';
  sectionLabel(parent, 'ABOUT');

  const body = createDiv();
  body.className = 'about-body';

  const title = createEl('h3');
  title.textContent = plugin.manifest.name;
  body.appendChild(title);

  const version = createDiv();
  version.className = 'desc';
  version.textContent = `Version ${plugin.manifest.version} · MIT`;
  body.appendChild(version);

  const links = createDiv();
  links.className = 'about-links';
  const repo = createEl('a');
  repo.href = 'https://github.com/BenaliHQ/workdesk-operating-system';
  repo.textContent = 'GitHub';
  repo.target = '_blank';
  links.appendChild(repo);
  body.appendChild(links);

  parent.appendChild(body);
}
