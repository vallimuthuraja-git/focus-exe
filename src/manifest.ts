export interface Manifest {
  manifest_version: 3;
  name: string;
  version: string;
  description: string;
  permissions: string[];
  host_permissions?: string[];
  background: { service_worker?: string; scripts?: string[] };
  action: { default_title: string; default_icon: Record<string, string> };
  commands: Record<string, { suggested_key: { default: string }; description: string }>;
  icons: Record<string, string>;
  minimum_chrome_version?: string;
  browser_specific_settings?: {
    gecko: { id: string; strict_min_version: string };
  };
  content_scripts?: Array<{
    matches: string[];
    js?: string[];
    css?: string[];
    run_at?: string;
    all_frames?: boolean;
  }>;
}

export interface Target {
  /** dist folder name. */
  dir: string;
  manifest: Manifest;
}

interface Options {
  name: string;
  version: string;
  description: string;
  /** Chromium family needs a service worker; Firefox needs an event page. */
  engine: 'chromium' | 'gecko';
  minimumChromeVersion?: string;
  geckoId?: string;
}

const ICON_SET = {
  '16': 'icons/icon16.png',
  '32': 'icons/icon32.png',
  '48': 'icons/icon48.png',
  '128': 'icons/icon128.png'
};

function build(options: Options): Manifest {
  const manifest: Manifest = {
    manifest_version: 3,
    name: options.name,
    version: options.version,
    description: options.description,
    // The content script's `content_scripts.matches: ['<all_urls>']` below is
    // what declares the widget in every top-level page — it needs no host
    // permission of its own. `host_permissions` is not requested: the widget
    // is declaratively present, and `scripting` + `activeTab` remain as a
    // fallback for pages where declarative injection is blocked (e.g. the
    // Chrome Web Store), where a user gesture grants temporary access.
    permissions: ['storage', 'notifications', 'scripting', 'activeTab'],
    content_scripts: [
      {
        matches: ['<all_urls>'],
        js: ['content.js'],
        run_at: 'document_idle',
        all_frames: false
      }
    ],
    background:
      options.engine === 'chromium'
        ? { service_worker: 'background.js' }
        : { scripts: ['background.js'] },
    action: { default_title: 'Focus Exe', default_icon: ICON_SET },
    commands: {
      'focus-exe-toggle': {
        suggested_key: { default: 'Alt+Shift+F' },
        description: 'Show or hide the Focus Exe widget on this page'
      }
    },
    icons: ICON_SET
  };

  if (options.minimumChromeVersion) {
    manifest.minimum_chrome_version = options.minimumChromeVersion;
  }
  if (options.geckoId) {
    manifest.browser_specific_settings = {
      gecko: { id: options.geckoId, strict_min_version: '115.0' }
    };
  }
  return manifest;
}

export function createTargets(options: {
  version: string;
  description: string;
}): Target[] {
  const common = {
    version: options.version,
    description: options.description,
    name: 'Focus Exe'
  };

  return [
    { dir: 'chrome', manifest: build({ ...common, engine: 'chromium', minimumChromeVersion: '102' }) },
    { dir: 'edge', manifest: build({ ...common, engine: 'chromium', minimumChromeVersion: '102' }) },
    { dir: 'brave', manifest: build({ ...common, engine: 'chromium', minimumChromeVersion: '102' }) },
    { dir: 'opera', manifest: build({ ...common, engine: 'chromium', minimumChromeVersion: '102' }) },
    {
      dir: 'firefox',
      manifest: build({ ...common, engine: 'gecko', geckoId: 'focus-exe@local.extension' })
    },
    { dir: 'safari', manifest: build({ ...common, engine: 'chromium' }) }
  ];
}
