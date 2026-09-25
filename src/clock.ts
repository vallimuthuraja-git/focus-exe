import { CONFIG } from './config';

interface DigitState {
  reel: HTMLElement;
  current: HTMLElement;
  next: HTMLElement;
  value: string;
  rolling: boolean;
  pending: string | null;
  fallback: number | null;
  token: number;
}

const states = new WeakMap<HTMLElement, DigitState>();

function createDigit(initial: string): HTMLElement {
  const digit = document.createElement('span');
  const reel = document.createElement('span');
  const current = document.createElement('span');
  const next = document.createElement('span');

  digit.className = 'digit';
  reel.className = 'reel';
  current.className = 'number current';
  next.className = 'number next';
  current.textContent = initial;
  next.textContent = initial;

  reel.append(current, next);
  digit.appendChild(reel);

  states.set(digit, {
    reel,
    current,
    next,
    value: initial,
    rolling: false,
    pending: null,
    fallback: null,
    token: 0
  });

  return digit;
}

function finishRoll(digit: HTMLElement, expected: string, token: number): void {
  const state = states.get(digit);
  if (!state || !state.rolling || state.token !== token) {
    return;
  }

  if (state.fallback !== null) {
    window.clearTimeout(state.fallback);
  }

  state.fallback = null;
  state.value = expected;
  state.current.textContent = expected;
  state.next.textContent = expected;
  state.rolling = false;
  state.reel.classList.remove('rolling');

  if (state.pending !== null && state.pending !== state.value) {
    const queued = state.pending;
    state.pending = null;
    rollDigit(digit, queued, true);
    return;
  }
  state.pending = null;
}

function rollDigit(digit: HTMLElement, value: string, animate: boolean): void {
  const state = states.get(digit);
  if (!state) {
    return;
  }

  if (state.value === value && !state.rolling) {
    return;
  }

  if (state.rolling) {
    state.pending = value;
    return;
  }

  if (!animate) {
    state.value = value;
    state.current.textContent = value;
    state.next.textContent = value;
    state.reel.classList.remove('rolling');
    return;
  }

  state.rolling = true;
  state.token += 1;
  const token = state.token;

  state.next.textContent = value;
  state.reel.classList.remove('rolling');
  void state.reel.offsetHeight; // restart the animation
  state.reel.classList.add('rolling');

  state.reel.addEventListener('animationend', () => finishRoll(digit, value, token), { once: true });
  state.fallback = window.setTimeout(() => finishRoll(digit, value, token), CONFIG.rollFallbackMs);
}

function updateGroup(
  group: HTMLElement | null,
  value: number,
  minLength: number,
  animate: boolean
): HTMLElement[] {
  if (!group) {
    return [];
  }

  const text = String(Math.max(0, Math.floor(value))).padStart(minLength, '0');
  let digits = Array.from(group.children) as HTMLElement[];

  if (digits.length !== text.length) {
    group.replaceChildren();
    for (const character of text) {
      group.appendChild(createDigit(character));
    }
    digits = Array.from(group.children) as HTMLElement[];
  }

  digits.forEach((digit, index) => rollDigit(digit, text.charAt(index), animate));
  return digits;
}

function findGroup(clock: HTMLElement, unit: string): HTMLElement | null {
  // deadline units wrap the group in a .time-unit, the focus clock is the group
  return clock.querySelector<HTMLElement>(
    `[data-unit="${unit}"] .digit-group, .digit-group[data-unit="${unit}"]`
  );
}

function createUnit(unit: string, digits: number): HTMLElement {
  const wrapper = document.createElement('span');
  const group = document.createElement('span');
  const letter = document.createElement('span');

  wrapper.className = 'time-unit';
  wrapper.dataset.unit = unit;
  group.className = 'digit-group';
  letter.className = 'unit-letter';
  letter.textContent = unit;

  for (let index = 0; index < digits; index += 1) {
    group.appendChild(createDigit('0'));
  }

  wrapper.append(group, letter);
  return wrapper;
}

export function createDeadlineClock(): HTMLElement {
  const clock = document.createElement('span');
  clock.className = 'clock deadline-clock';
  clock.append(createUnit('d', 3), createUnit('h', 2), createUnit('m', 2), createUnit('s', 2));
  return clock;
}

export function createFocusClock(extraClass = ''): HTMLElement {
  const clock = document.createElement('span');
  const minutes = document.createElement('span');
  const seconds = document.createElement('span');
  const separator = document.createElement('span');

  clock.className = `clock focus-clock ${extraClass}`.trim();
  minutes.className = 'digit-group';
  minutes.dataset.unit = 'minutes';
  seconds.className = 'digit-group';
  seconds.dataset.unit = 'seconds';
  separator.className = 'focus-separator';
  separator.textContent = ':';

  clock.append(minutes, separator, seconds);
  return clock;
}

export function updateDeadlineClock(
  clock: HTMLElement,
  milliseconds: number,
  animate: boolean
): void {
  const totalSeconds = Math.floor(Math.max(0, milliseconds) / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  const dayDigits = updateGroup(findGroup(clock, 'd'), days, 3, animate);
  dayDigits.forEach(digit => digit.classList.remove('leading-zero-faded'));
  if (days >= 10 && days <= 99 && dayDigits.length === 3) {
    dayDigits[0]?.classList.add('leading-zero-faded');
  }

  updateGroup(findGroup(clock, 'h'), hours, 2, animate);
  updateGroup(findGroup(clock, 'm'), minutes, 2, animate);
  updateGroup(findGroup(clock, 's'), seconds, 2, animate);
}

export function updateFocusClock(
  clock: HTMLElement,
  milliseconds: number,
  animate: boolean
): void {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  updateGroup(findGroup(clock, 'minutes'), minutes, Math.max(2, String(minutes).length), animate);
  updateGroup(findGroup(clock, 'seconds'), seconds, 2, animate);
}

