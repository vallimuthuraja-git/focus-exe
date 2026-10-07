declare module '*.css' {
  const content: string;
  export default content;
}

/** Repository URL, substituted by build.mjs from package.json. */
declare const __REPO_URL__: string;

interface Window {
  webkitAudioContext?: typeof AudioContext;
}
