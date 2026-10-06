import { CONFIG, type IconName } from './config';
import { button, icon } from './ui';

/**
 * The settings panel: the audio toggles plus the external links (About &
 * support, GitHub). It is built twice per widget — once for the expanded view
 * and once for the minimized popover — so both views offer the same options.
 */

export type SettingKey = 'brownNoise' | 'metronome';

/** Where a link row sends the user. Resolved by the service worker. */
export type SettingsLink = 'about' | 'github';

export interface SettingsPanel {
  fragment: DocumentFragment;
  /** One input per panel, so the widget can mirror state into both panels. */
  noise: HTMLInputElement;
  metronome: HTMLInputElement;
  /** Link buttons keyed by target, for the widget to wire up. */
  links: Map<SettingsLink, HTMLButtonElement>;
}

interface ToggleSpec {
  key: SettingKey;
  label: string;
  iconName: IconName;
}

const TOGGLES: readonly ToggleSpec[] = [
  { key: 'brownNoise', label: 'Brown Noise', iconName: 'noise' },
  { key: 'metronome', label: `${CONFIG.metronomeBpm} BPM Neuro-Metronome`, iconName: 'metronome' }
];

interface LinkSpec {
  target: SettingsLink;
  /** Visible row text; also the start of the accessible name (WCAG 2.5.3). */
  label: string;
  /** Tooltip + accessible name, so it must begin with `label`. */
  title: string;
  iconName: IconName;
}

const LINKS: readonly LinkSpec[] = [
  {
    target: 'about',
    label: 'About & support',
    title: 'About & support: the Focus Exe source code on GitHub',
    iconName: 'info'
  },
  { target: 'github', label: 'GitHub', title: 'GitHub: the Focus Exe source code', iconName: 'github' }
];

function toggleRow(spec: ToggleSpec): { row: HTMLElement; input: HTMLInputElement } {
  const row = document.createElement('div');
  const copy = document.createElement('div');
  const caption = document.createElement('span');
  const switchLabel = document.createElement('label');
  const input = document.createElement('input');
  const track = document.createElement('span');

  row.className = 'setting-row';
  copy.className = 'setting-copy';
  caption.className = 'setting-label';
  switchLabel.className = 'switch';
  track.className = 'switch-track';

  caption.textContent = spec.label;
  input.type = 'checkbox';
  input.setAttribute('aria-label', spec.label);

  copy.append(icon(spec.iconName, 'setting-icon'), caption);
  switchLabel.append(input, track);
  row.append(copy, switchLabel);
  return { row, input };
}

/**
 * A full-row button, so the whole strip is one generously sized target. The
 * leading copy and the trailing "opens a tab" icon mirror the toggle rows.
 */
function linkRow(spec: LinkSpec): HTMLButtonElement {
  const node = button('setting-row setting-link', 'open', '', spec.title);
  const copy = document.createElement('div');
  const caption = document.createElement('span');

  copy.className = 'setting-copy';
  caption.className = 'setting-label';
  caption.textContent = spec.label;

  copy.append(icon(spec.iconName, 'setting-icon'), caption);
  node.prepend(copy);
  node.dataset.link = spec.target;
  return node;
}

export function createSettingsPanel(title: string): SettingsPanel {
  const fragment = document.createDocumentFragment();
  const heading = document.createElement('div');
  heading.className = 'settings-title';
  heading.append(icon('settings'), document.createTextNode(title));

  const inputs = new Map<SettingKey, HTMLInputElement>();
  for (const spec of TOGGLES) {
    const { row, input } = toggleRow(spec);
    fragment.appendChild(row);
    inputs.set(spec.key, input);
  }

  const divider = document.createElement('div');
  divider.className = 'settings-divider';
  fragment.appendChild(divider);

  const links = new Map<SettingsLink, HTMLButtonElement>();
  for (const spec of LINKS) {
    const node = linkRow(spec);
    fragment.appendChild(node);
    links.set(spec.target, node);
  }

  fragment.prepend(heading);

  const noise = inputs.get('brownNoise');
  const metronome = inputs.get('metronome');
  /* TOGGLES is exhaustive over SettingKey, so both are always present. */
  if (!noise || !metronome) {
    throw new Error('[Focus Exe] Settings panel is missing an audio toggle.');
  }

  return { fragment, noise, metronome, links };
}