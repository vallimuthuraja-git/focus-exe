import { icon } from './ui';

/**
 * Deadline date picker: a settings row with a trigger button and a floating
 * calendar popover. Built once per settings panel, so the expanded and the
 * minimized views each own an independent (but state-synced) instance.
 */

export interface DeadlinePicker {
  row: HTMLElement;
  setValue(value: number): void;
  close(): void;
  isOpen(): boolean;
}

const TRIGGER_FORMAT = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric'
});

const FULL_FORMAT = new Intl.DateTimeFormat(undefined, {
  month: 'long',
  day: 'numeric',
  year: 'numeric'
});

const MONTH_FORMAT = new Intl.DateTimeFormat(undefined, {
  month: 'long',
  year: 'numeric'
});

const WEEKDAY_FORMAT = new Intl.DateTimeFormat(undefined, { weekday: 'narrow' });

/* Sunday-first narrow weekday labels (2024-01-07 is a Sunday). */
const WEEKDAYS = Array.from({ length: 7 }, (_, index) =>
  WEEKDAY_FORMAT.format(new Date(2024, 0, 7 + index))
);

const pad = (value: number): string => String(value).padStart(2, '0');

const dateKey = (year: number, month: number, day: number): string =>
  `${year}-${pad(month + 1)}-${pad(day)}`;

const keyFor = (ms: number): string => {
  const date = new Date(ms);
  return dateKey(date.getFullYear(), date.getMonth(), date.getDate());
};

const sameDay = (a: number, b: number): boolean => keyFor(a) === keyFor(b);

/** Local midnight, so stored deadline values and comparisons stay in one zone. */
const startOfDay = (ms: number): number => {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

const daysInMonth = (year: number, month: number): number =>
  new Date(year, month + 1, 0).getDate();

const formatTrigger = (ms: number): string => TRIGGER_FORMAT.format(new Date(ms));

export function createDeadlinePicker(onChange: (value: number) => void): DeadlinePicker {
  const row = document.createElement('div');
  row.className = 'setting-row deadline-row';

  const copy = document.createElement('div');
  copy.className = 'setting-copy';
  const label = document.createElement('span');
  label.className = 'setting-label';
  label.textContent = 'Deadline date';
  copy.append(icon('event', 'setting-icon'), label);

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'deadline-trigger';
  trigger.title = 'Deadline date';
  trigger.setAttribute('aria-label', 'Deadline date');
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-expanded', 'false');

  const valueLabel = document.createElement('span');
  valueLabel.className = 'deadline-trigger-value';
  trigger.append(valueLabel, icon('chevronDown', 'deadline-trigger-icon'));

  const popover = document.createElement('div');
  popover.className = 'calendar-popover';
  popover.setAttribute('role', 'dialog');
  popover.setAttribute('aria-label', 'Choose deadline date');

  const header = document.createElement('div');
  header.className = 'calendar-header';

  const previous = document.createElement('button');
  previous.type = 'button';
  previous.className = 'calendar-nav';
  previous.setAttribute('aria-label', 'Previous month');
  previous.append(icon('chevronLeft'));

  const monthLabel = document.createElement('div');
  monthLabel.className = 'calendar-month';
  monthLabel.setAttribute('aria-live', 'polite');

  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'calendar-nav';
  next.setAttribute('aria-label', 'Next month');
  next.append(icon('chevronRight'));

  header.append(previous, monthLabel, next);

  const weekdays = document.createElement('div');
  weekdays.className = 'calendar-weekdays';
  weekdays.setAttribute('aria-hidden', 'true');
  for (const weekday of WEEKDAYS) {
    const cell = document.createElement('span');
    cell.textContent = weekday;
    weekdays.append(cell);
  }

  const grid = document.createElement('div');
  grid.className = 'calendar-grid';
  grid.setAttribute('role', 'group');

  popover.append(header, weekdays, grid);
  row.append(copy, trigger, popover);

  let selectedMs: number | null = null;
  let viewYear = 0;
  let viewMonth = 0;
  let open = false;
  let todayMs = 0;
  let minMs = 0;

  const currentYear = (): number => new Date(todayMs).getFullYear();
  const currentMonth = (): number => new Date(todayMs).getMonth();

  const canGoPrevious = (): boolean =>
    viewYear > currentYear() || (viewYear === currentYear() && viewMonth > currentMonth());

  const focusDay = (): void => {
    const selected =
      selectedMs !== null
        ? grid.querySelector<HTMLButtonElement>(
            `.calendar-day[data-date="${keyFor(selectedMs)}"]:not(:disabled)`
          )
        : null;
    const target = selected ?? grid.querySelector<HTMLButtonElement>('.calendar-day:not(:disabled)');
    target?.focus();
  };

  const render = (): void => {
    monthLabel.textContent = MONTH_FORMAT.format(new Date(viewYear, viewMonth, 1));
    grid.setAttribute('aria-label', monthLabel.textContent);

    const leading = new Date(viewYear, viewMonth, 1).getDay();
    const total = daysInMonth(viewYear, viewMonth);
    const fragment = document.createDocumentFragment();

    for (let index = 0; index < leading; index += 1) {
      const blank = document.createElement('span');
      blank.className = 'calendar-blank';
      fragment.append(blank);
    }

    for (let day = 1; day <= total; day += 1) {
      const dayMs = new Date(viewYear, viewMonth, day).getTime();
      const selected = selectedMs !== null && sameDay(selectedMs, dayMs);
      const cell = document.createElement('button');

      cell.type = 'button';
      cell.className = 'calendar-day';
      cell.dataset.date = dateKey(viewYear, viewMonth, day);
      cell.dataset.day = String(day);
      cell.textContent = String(day);
      cell.setAttribute('aria-label', FULL_FORMAT.format(new Date(dayMs)));
      cell.setAttribute('aria-pressed', String(selected));

      if (selected) {
        cell.classList.add('selected');
      }
      if (sameDay(dayMs, todayMs)) {
        cell.classList.add('today');
        cell.setAttribute('aria-current', 'date');
      }
      if (dayMs < minMs) {
        cell.disabled = true;
      }
      fragment.append(cell);
    }

    const trailing = (7 - ((leading + total) % 7)) % 7;
    for (let index = 0; index < trailing; index += 1) {
      const blank = document.createElement('span');
      blank.className = 'calendar-blank';
      fragment.append(blank);
    }

    grid.replaceChildren(fragment);
    previous.disabled = !canGoPrevious();
  };

  const position = (): void => {
    const rowRect = row.getBoundingClientRect();
    const popRect = popover.getBoundingClientRect();
    const popHeight = popRect.height || 280;
    const gap = 6;
    const margin = 8;
    const spaceAbove = rowRect.top - margin;
    const spaceBelow = window.innerHeight - rowRect.bottom - margin;
    const above = spaceAbove >= popHeight || spaceAbove >= spaceBelow;

    let top = above ? -popHeight - gap : rowRect.height + gap;
    const viewportTop = rowRect.top + top;

    if (viewportTop < margin) {
      top += margin - viewportTop;
    } else {
      const viewportBottom = viewportTop + popHeight;
      if (viewportBottom > window.innerHeight - margin) {
        top -= viewportBottom - (window.innerHeight - margin);
      }
    }

    popover.style.top = `${Math.round(top)}px`;
  };

  const onPointerDown = (event: Event): void => {
    if (!open) {
      return;
    }
    const target = event.target as Node | null;
    if (target && (popover.contains(target) || trigger.contains(target))) {
      return;
    }
    close();
  };

  const openPicker = (): void => {
    if (open) {
      return;
    }

    todayMs = startOfDay(Date.now());
    minMs = todayMs;

    const base = selectedMs ?? todayMs;
    const baseDate = new Date(base);
    viewYear = baseDate.getFullYear();
    viewMonth = baseDate.getMonth();

    render();
    open = true;
    popover.classList.add('open');
    trigger.setAttribute('aria-expanded', 'true');
    position();
    focusDay();

    const root = row.getRootNode() as Document | ShadowRoot;
    root.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('resize', position);
  };

  function close(): void {
    if (!open) {
      return;
    }
    open = false;
    popover.classList.remove('open');
    trigger.setAttribute('aria-expanded', 'false');

    const root = row.getRootNode() as Document | ShadowRoot;
    root.removeEventListener('pointerdown', onPointerDown, true);
    window.removeEventListener('resize', position);
  }

  const setValue = (value: number): void => {
    const next = startOfDay(value);
    if (selectedMs !== null && sameDay(selectedMs, next)) {
      return;
    }

    selectedMs = next;
    const text = formatTrigger(next);
    valueLabel.textContent = text;
    trigger.setAttribute('aria-label', `Deadline date: ${text}`);

    if (!open) {
      return;
    }

    const key = keyFor(next);
    for (const cell of Array.from(grid.querySelectorAll<HTMLButtonElement>('.calendar-day'))) {
      const selected = cell.dataset.date === key;
      cell.classList.toggle('selected', selected);
      cell.setAttribute('aria-pressed', String(selected));
    }
  };

  trigger.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    if (open) {
      close();
      return;
    }
    openPicker();
  });

  popover.addEventListener('focusout', event => {
    if (!open) {
      return;
    }
    const target = event.relatedTarget as Node | null;
    /* A null target means a non-focusable click or a window blur; the
       pointerdown listener handles outside clicks, so keep the popover open. */
    if (!target) {
      return;
    }
    if (popover.contains(target) || trigger.contains(target)) {
      return;
    }
    close();
  });

  previous.addEventListener('click', () => {
    if (viewMonth === 0) {
      viewYear -= 1;
      viewMonth = 11;
    } else {
      viewMonth -= 1;
    }
    render();
    focusDay();
  });

  next.addEventListener('click', () => {
    if (viewMonth === 11) {
      viewYear += 1;
      viewMonth = 0;
    } else {
      viewMonth += 1;
    }
    render();
    focusDay();
  });

  grid.addEventListener('click', event => {
    const target = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>('.calendar-day');
    if (!target || target.disabled || !open) {
      return;
    }

    const day = Number(target.dataset.day);
    if (!Number.isFinite(day)) {
      return;
    }

    onChange(new Date(viewYear, viewMonth, day).getTime());
    close();
    trigger.focus();
  });

  row.addEventListener('keydown', event => {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      close();
      trigger.focus();
      return;
    }

    if (!open) {
      return;
    }

    const target = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>('.calendar-day');
    if (!target) {
      return;
    }

    const day = Number(target.dataset.day);
    if (!Number.isFinite(day)) {
      return;
    }

    const base = new Date(viewYear, viewMonth, day);
    let nextDate: Date;

    switch (event.key) {
      case 'ArrowLeft':
        nextDate = new Date(base);
        nextDate.setDate(base.getDate() - 1);
        break;
      case 'ArrowRight':
        nextDate = new Date(base);
        nextDate.setDate(base.getDate() + 1);
        break;
      case 'ArrowUp':
        nextDate = new Date(base);
        nextDate.setDate(base.getDate() - 7);
        break;
      case 'ArrowDown':
        nextDate = new Date(base);
        nextDate.setDate(base.getDate() + 7);
        break;
      case 'Home':
        nextDate = new Date(base);
        nextDate.setDate(base.getDate() - base.getDay());
        break;
      case 'End':
        nextDate = new Date(base);
        nextDate.setDate(base.getDate() + (6 - base.getDay()));
        break;
      case 'PageUp': {
        const month = new Date(viewYear, viewMonth - 1, 1);
        nextDate = new Date(
          month.getFullYear(),
          month.getMonth(),
          Math.min(base.getDate(), daysInMonth(month.getFullYear(), month.getMonth()))
        );
        break;
      }
      case 'PageDown': {
        const month = new Date(viewYear, viewMonth + 1, 1);
        nextDate = new Date(
          month.getFullYear(),
          month.getMonth(),
          Math.min(base.getDate(), daysInMonth(month.getFullYear(), month.getMonth()))
        );
        break;
      }
      default:
        return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (nextDate.getFullYear() !== viewYear || nextDate.getMonth() !== viewMonth) {
      viewYear = nextDate.getFullYear();
      viewMonth = nextDate.getMonth();
      render();
    }

    const key = keyFor(nextDate.getTime());
    const nextTarget = grid.querySelector<HTMLButtonElement>(
      `.calendar-day[data-date="${key}"]:not(:disabled)`
    );
    if (nextTarget) {
      nextTarget.focus();
    } else {
      grid.querySelector<HTMLButtonElement>('.calendar-day:not(:disabled)')?.focus();
    }
  });

  return {
    row,
    setValue,
    close,
    isOpen: (): boolean => open
  };
}