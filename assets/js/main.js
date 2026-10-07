/**
 * Focus Exe — Main JavaScript
 * Shared interactivity for all pages
 */

(() => {
  'use strict';

  // =========================================================================
  // Configuration
  // =========================================================================
  const SUPPORT = {
    coffee: 'REPLACE_ME_BUY_ME_A_COFFEE_HANDLE',   // https://www.buymeacoffee.com/<handle>
    sponsors: 'REPLACE_ME_GITHUB_USERNAME',        // https://github.com/sponsors/<username>
    upi: 'REPLACE_ME_UPI_ID',                      // your UPI id, shown for copying
    paypal: 'REPLACE_ME_PAYPAL_LINK'               // https://www.paypal.com/paypalme/...
  };

  const FALLBACK = {
    coffee: 'https://www.buymeacoffee.com/',
    sponsors: 'https://github.com/sponsors',
    paypal: 'https://www.paypal.com/'
  };

  // =========================================================================
  // Utility Functions
  // =========================================================================
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];

  function hasReplaceMe(value) {
    return value && value.includes('REPLACE_ME');
  }

  function setSupportLinks() {
    for (const node of $$('[data-support]')) {
      const key = node.dataset.support;
      const value = SUPPORT[key];

      if (value && !hasReplaceMe(value)) {
        if (key === 'upi') {
          node.href = `upi://pay?pa=${encodeURIComponent(value)}`;
          const shown = $('[data-upi-id]');
          if (shown) {
            const codeEl = shown.querySelector('code');
            if (codeEl) codeEl.textContent = value;
            shown.hidden = false;
          }
        } else {
          node.href = value;
        }
        continue;
      }

      if (FALLBACK[key]) {
        node.href = FALLBACK[key];
      }

      const note = $(`[data-note="${key}"]`);
      if (note) note.hidden = false;

      if (key === 'upi') {
        node.removeAttribute('href');
        node.setAttribute('aria-disabled', 'true');
      }
    }
  }

  // =========================================================================
  // Changelog Rendering
  // =========================================================================
  function renderChangelog() {
    const root = $('#releases');
    const dataEl = $('#changelog-data');
    if (!root || !dataEl) return;

    let data;
    try {
      const raw = dataEl.textContent.replace(/&#x5f;/g, '_');
      data = JSON.parse(raw);
    } catch {
      return;
    }

    const releases = Array.isArray(data) ? data : data?.releases;
    if (!Array.isArray(releases)) return;

    const kindOrder = ['Added', 'Changed', 'Fixed', 'Security', 'Tests'];

    for (const release of releases) {
      const card = document.createElement('div');
      card.className = 'card';

      const h3 = document.createElement('h3');
      const date = document.createElement('span');
      date.className = 'muted';
      date.style.cssText = 'font-size:13px;font-weight:400';
      date.textContent = '· ' + (release.date || '');
      h3.appendChild(document.createTextNode('v' + release.version));
      h3.appendChild(date);

      const ul = document.createElement('ul');
      ul.className = 'ticks';
      ul.style.marginTop = '8px';

      for (const kind of kindOrder) {
        const items = release.changes?.[kind];
        if (!Array.isArray(items)) continue;
        for (const item of items) {
          const li = document.createElement('li');
          li.textContent = item;
          ul.appendChild(li);
        }
      }

      card.appendChild(h3);
      card.appendChild(ul);
      root.appendChild(card);
    }
  }

  // =========================================================================
  // Mobile Navigation
  // =========================================================================
  function initMobileNav() {
    const nav = $('nav.links');
    if (!nav) return;

    // The navigation is already horizontal scrollable on mobile via CSS
    // This function can be extended later if we want a hamburger menu
  }

  // =========================================================================
  // Active Navigation Link
  // =========================================================================
  function setActiveNavLink() {
    const currentPath = window.location.pathname;
    const pageName = currentPath.split('/').pop() || 'index.html';

    for (const link of $$('nav.links a')) {
      const href = link.getAttribute('href');
      if (!href) continue;

      const linkPage = href.split('/').pop() || 'index.html';
      if (linkPage === pageName || (pageName === 'index.html' && linkPage === '')) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    }
  }

  // =========================================================================
  // Smooth Scroll Enhancement
  // =========================================================================
  function initSmoothScroll() {
    // Handle anchor links with header offset
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;

      const href = link.getAttribute('href');
      if (href === '#') return;

      const target = $(href);
      if (!target) return;

      e.preventDefault();
      const headerOffset = 84; // header height + padding
      const elementPosition = target.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });

      // Update URL without scrolling
      history.pushState(null, '', href);
    });
  }

  // =========================================================================
  // Copy to Clipboard (for UPI ID, etc.)
  // =========================================================================
  function initCopyButtons() {
    for (const btn of $$('[data-copy]')) {
      btn.addEventListener('click', async () => {
        const text = btn.dataset.copy;
        try {
          await navigator.clipboard.writeText(text);
          const originalText = btn.textContent;
          btn.textContent = 'Copied!';
          btn.classList.add('btn-primary');
          setTimeout(() => {
            btn.textContent = originalText;
            btn.classList.remove('btn-primary');
          }, 2000);
        } catch {
          // Fallback for older browsers
          const textarea = document.createElement('textarea');
          textarea.value = text;
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
        }
      });
    }
  }

  // =========================================================================
  // Theme Color Meta Tag (for mobile browsers)
  // =========================================================================
  function setThemeColor() {
    const meta = $('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', '#0d1117');
    }
  }

  // =========================================================================
  // Initialize All
  // =========================================================================
  function init() {
    setSupportLinks();
    renderChangelog();
    initMobileNav();
    setActiveNavLink();
    initSmoothScroll();
    initCopyButtons();
    setThemeColor();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();