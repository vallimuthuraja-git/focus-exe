declare module '*.css' {
  const content: string;
  export default content;
}

interface Window {
  webkitAudioContext?: typeof AudioContext;
}
