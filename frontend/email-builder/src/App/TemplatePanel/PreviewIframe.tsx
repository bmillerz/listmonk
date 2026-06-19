import React, { useEffect, useRef } from 'react';

type Props = {
  // The fully-rendered export HTML (renderHtmlWithMeta) — a complete <html> document.
  html: string;
  // Mobile phone-frame: fill the frame and scroll internally. Desktop: auto-size to content.
  fillHeight: boolean;
};

// Renders the ACTUAL exported email HTML in an isolated <iframe> so the Preview tab
// is a true WYSIWYG replica of the sent email — responsive column stacking, reverse-
// on-mobile, link colours and equal-height all driven by the email's own media queries
// at the iframe's viewport width. (The previous npm `Reader` render replicated none of
// these, which is why reverse columns "broke" in Preview.) On desktop the iframe grows
// to its content height; inside the mobile phone frame it fills the frame and scrolls.
export default function PreviewIframe({ html, fillHeight }: Props) {
  const ref = useRef<HTMLIFrameElement | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  // Reloading via srcDoc fires onLoad each time `html` changes, where we size the frame.
  const handleLoad = () => {
    observerRef.current?.disconnect();
    if (fillHeight) {
      return;
    }
    const iframe = ref.current;
    const doc = iframe?.contentWindow?.document;
    if (!iframe || !doc) {
      return;
    }
    const fit = () => {
      iframe.style.height = `${doc.documentElement.scrollHeight}px`;
    };
    fit();
    // Re-fit when content reflows (e.g. images finish loading, fonts swap).
    if (typeof ResizeObserver !== 'undefined') {
      observerRef.current = new ResizeObserver(fit);
      observerRef.current.observe(doc.body);
    }
  };

  useEffect(() => () => observerRef.current?.disconnect(), []);

  return (
    <iframe
      ref={ref}
      title="Email preview"
      srcDoc={html}
      onLoad={handleLoad}
      style={{ width: '100%', height: fillHeight ? '100%' : 0, border: 'none', display: 'block' }}
    />
  );
}
