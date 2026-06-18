/// <reference types="vite/client" />

// `insane` ships no types; it's a function (html, options?) => sanitized html.
declare module 'insane' {
  type InsaneOptions = {
    allowedTags?: string[];
    allowedAttributes?: Record<string, string[]>;
    allowedSchemes?: string[];
    allowedClasses?: Record<string, string[]>;
    filter?: (token: { tag: string; attrs: Record<string, string> }) => boolean;
  };
  const insane: (html: string, options?: InsaneOptions) => string;
  export default insane;
}
