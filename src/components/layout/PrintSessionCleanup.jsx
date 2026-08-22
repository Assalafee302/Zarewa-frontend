import { useEffect } from 'react';

/**
 * Browser print headers often include document.title and the page URL. Web apps cannot
 * remove those margins entirely (users should turn off "Headers and footers" in the
 * print dialog for a clean PDF). We still clear the tab title during print so the header
 * does not show route text like "Sales | …".
 */
export default function PrintSessionCleanup() {
  useEffect(() => {
    let previous = '';
    const onBeforePrint = () => {
      previous = document.title;
      document.title = '\u200b';
    };
    const onAfterPrint = () => {
      document.title = previous;
    };
    window.addEventListener('beforeprint', onBeforePrint);
    window.addEventListener('afterprint', onAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', onBeforePrint);
      window.removeEventListener('afterprint', onAfterPrint);
    };
  }, []);
  return null;
}
