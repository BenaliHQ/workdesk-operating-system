import { wsSvgEl } from '../icons';
import type { VoiceMemoEvent, VoiceMemoState } from '../services/capture/voice-memo-controller';

interface VoiceFabOptions {
  onPress: () => void | Promise<void>;
  onCancel: () => void;
}

const REVERT_MS = 1400;
const KEYBOARD_HEIGHT_DELTA = 140;

export class VoiceFab {
  private readonly root: HTMLElement;
  private readonly onPress: VoiceFabOptions['onPress'];
  private readonly onCancel: VoiceFabOptions['onCancel'];
  private state: VoiceMemoState = 'idle';
  private elapsedStartedAt: number | null = null;
  private elapsedTimer: number | null = null;
  private elapsedEl: HTMLElement | null = null;
  private revertTimer: number | null = null;
  private viewport: VisualViewport | null = null;
  private readonly onViewportResize = (): void => this.updateKeyboardVisibility();

  constructor(options: VoiceFabOptions) {
    this.onPress = options.onPress;
    this.onCancel = options.onCancel;
    this.root = createDiv();
    this.root.className = 'workdesk-voice-fab';
    this.root.dataset.state = this.state;
    activeDocument.body.appendChild(this.root);
    this.installViewportListener();
    this.render();
  }

  setState(event: VoiceMemoEvent): void {
    const nextState = event.state;
    this.clearRevertTimer();

    if (this.state === 'recording' && nextState !== 'recording') {
      this.stopElapsedTimer();
    }

    const enteringRecording = this.state !== 'recording' && nextState === 'recording';
    this.state = nextState;
    this.root.dataset.state = nextState;
    this.render();

    if (enteringRecording) {
      this.startElapsedTimer();
    } else if (nextState === 'recording' && this.elapsedStartedAt !== null) {
      this.updateElapsed(Date.now() - this.elapsedStartedAt);
    }

    this.updateKeyboardVisibility();

    if (nextState === 'success' || nextState === 'error') {
      this.revertTimer = activeWindow.setTimeout(() => {
        this.revertTimer = null;
        this.setState({ state: 'idle' });
      }, REVERT_MS);
    }
  }

  destroy(): void {
    this.clearRevertTimer();
    this.stopElapsedTimer();
    this.uninstallViewportListener();
    this.root.remove();
  }

  private render(): void {
    this.root.replaceChildren();
    this.elapsedEl = null;

    if (this.state === 'recording') {
      const elapsed = createDiv();
      elapsed.className = 'workdesk-voice-fab__elapsed';
      elapsed.setAttribute('aria-hidden', 'true');
      elapsed.textContent = formatElapsed(0);
      this.elapsedEl = elapsed;
      this.root.appendChild(elapsed);

      const cancel = activeDocument.createEl('button');
      cancel.className = 'workdesk-voice-fab__cancel';
      cancel.type = 'button';
      cancel.setAttribute('aria-label', 'Cancel voice memo');
      cancel.textContent = '×';
      cancel.addEventListener('click', (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        this.onCancel();
      });
      this.root.appendChild(cancel);
    }

    const shell = createDiv();
    shell.className = 'workdesk-voice-fab__button-shell';

    const pulse = createSpan();
    pulse.className = 'workdesk-voice-fab__pulse';
    pulse.setAttribute('aria-hidden', 'true');
    shell.appendChild(pulse);

    const button = activeDocument.createEl('button');
    button.className = 'workdesk-voice-fab__button';
    button.type = 'button';
    button.disabled = this.state === 'transcribing';
    button.setAttribute('aria-label', this.buttonLabel());
    button.addEventListener('click', () => {
      if (this.state === 'transcribing') return;
      void this.onPress();
    });

    if (this.state === 'transcribing') {
      const spinner = createSpan();
      spinner.className = 'workdesk-voice-fab__spinner';
      spinner.setAttribute('aria-hidden', 'true');
      button.appendChild(spinner);
    } else if (this.state === 'success') {
      button.appendChild(wsSvgEl('check', 24));
    } else {
      button.appendChild(wsSvgEl('mic', 24));
    }

    shell.appendChild(button);
    this.root.appendChild(shell);
  }

  private installViewportListener(): void {
    const viewport = activeWindow.visualViewport ?? null;
    if (!viewport) return;
    this.viewport = viewport;
    viewport.addEventListener('resize', this.onViewportResize);
  }

  private uninstallViewportListener(): void {
    if (!this.viewport) return;
    this.viewport.removeEventListener('resize', this.onViewportResize);
    this.viewport = null;
  }

  private updateKeyboardVisibility(): void {
    if (this.state === 'recording' || this.state === 'transcribing') {
      this.root.classList.remove('is-keyboard-hidden');
      return;
    }
    if (!this.viewport) return;
    // Keyboard detection: the on-screen keyboard shrinks the visual viewport
    // relative to the layout viewport (innerHeight). Comparing against
    // innerHeight — not a height captured at construction — keeps device
    // rotation from reading as a permanently-open keyboard.
    const keyboardOpen = activeWindow.innerHeight - this.viewport.height > KEYBOARD_HEIGHT_DELTA;
    this.root.classList.toggle('is-keyboard-hidden', keyboardOpen);
  }

  private startElapsedTimer(): void {
    this.stopElapsedTimer();
    this.elapsedStartedAt = Date.now();
    this.updateElapsed(0);
    this.elapsedTimer = activeWindow.setInterval(() => {
      if (this.elapsedStartedAt === null) return;
      this.updateElapsed(Date.now() - this.elapsedStartedAt);
    }, 1000);
  }

  private stopElapsedTimer(): void {
    if (this.elapsedTimer !== null) {
      activeWindow.clearInterval(this.elapsedTimer);
      this.elapsedTimer = null;
    }
    this.elapsedStartedAt = null;
  }

  private updateElapsed(elapsedMs: number): void {
    if (this.elapsedEl) this.elapsedEl.textContent = formatElapsed(elapsedMs);
  }

  private clearRevertTimer(): void {
    if (this.revertTimer !== null) {
      activeWindow.clearTimeout(this.revertTimer);
      this.revertTimer = null;
    }
  }

  private buttonLabel(): string {
    switch (this.state) {
      case 'requesting-permission':
        return 'Requesting microphone permission';
      case 'recording':
        return 'Stop and save voice memo';
      case 'transcribing':
        return 'Transcribing voice memo';
      case 'success':
        return 'Voice memo saved';
      case 'error':
        return 'Voice memo failed';
      case 'idle':
        return 'Capture voice memo';
    }
  }
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${pad2(minutes)}:${pad2(seconds)}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}
