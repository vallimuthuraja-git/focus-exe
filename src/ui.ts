import { ICONS, type IconName } from './config';

/**
 * Shared shadow-DOM builders. Every node is assembled with
 * createElement/createTextNode, so no page or user string is ever parsed as
 * markup — the static shells in widget.ts are the only innerHTML use.
 */

export function need<T extends Element>(root: ParentNode, selector: string): T {
  const found = root.querySelector<T>(selector);
  if (!found) {
    throw new Error(`[Focus Exe] Missing widget node: ${selector}`);
  }
  return found;
}

export function icon(name: IconName, className = ''): HTMLElement {
  const wrapper = document.createElement('span');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

  wrapper.className = ['material-icon', className].filter(Boolean).join(' ');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  path.setAttribute('d', ICONS[name]);
  svg.appendChild(path);
  wrapper.appendChild(svg);
  return wrapper;
}

export function button(
  className: string,
  iconName: IconName,
  label: string,
  title: string
): HTMLButtonElement {
  const node = document.createElement('button');
  node.type = 'button';
  node.className = className;
  node.title = title;
  node.setAttribute('aria-label', title);
  node.appendChild(icon(iconName));

  if (label) {
    const text = document.createElement('span');
    text.className = 'button-label';
    text.textContent = label;
    node.appendChild(text);
  }
  return node;
}

export function popButton(className: string, iconName: IconName, title: string): HTMLButtonElement {
  const node = button(`pop-button ${className}`, iconName, '', title);
  node.dataset.tooltip = title;
  return node;
}

export function replaceIcon(target: HTMLElement, name: IconName): void {
  target.querySelector('.material-icon')?.replaceWith(icon(name));
}