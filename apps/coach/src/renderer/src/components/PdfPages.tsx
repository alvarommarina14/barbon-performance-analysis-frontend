import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { useEffect, useRef, useState } from 'react';

GlobalWorkerOptions.workerSrc = workerUrl;

const PAGE_GAP = 12;

// Drawn with pdf.js instead of Chromium's viewer, which can't be scrolled from here and jumps back
// to the first page on every reload. A new version is painted off screen and swapped in at the
// same reading position.
export function PdfPages({ bytes }: { bytes: Uint8Array }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = scroller.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry?.contentRect.width ?? 0)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!width) {
      return;
    }
    let cancelled = false;
    // pdf.js takes the buffer over, so it gets a copy and the query keeps the original.
    const task = getDocument({ data: bytes.slice() });

    void (async () => {
      const doc = await task.promise;
      const pageWidth = width - PAGE_GAP * 2;
      const ratio = window.devicePixelRatio || 1;
      const pages = document.createElement('div');
      pages.className = 'pdf-pages';

      for (let number = 1; number <= doc.numPages; number++) {
        const page = await doc.getPage(number);
        const viewport = page.getViewport({ scale: (pageWidth / page.getViewport({ scale: 1 }).width) * ratio });
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${pageWidth}px`;
        await page.render({ canvas, viewport }).promise;
        if (cancelled) {
          return;
        }
        pages.append(canvas);
      }

      const element = scroller.current;
      if (!element || cancelled) {
        return;
      }
      const position = element.scrollHeight > 0 ? element.scrollTop / element.scrollHeight : 0;
      element.replaceChildren(pages);
      element.scrollTop = position * element.scrollHeight;
    })().catch(() => {
      // A newer render took over, or the bytes were not a PDF; the pane shows the last good one.
    });

    return () => {
      cancelled = true;
      void task.destroy();
    };
  }, [bytes, width]);

  return <div className="pdf-pane-pages" ref={scroller} />;
}
