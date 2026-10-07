// A notice covered by the coach has not been available to read. Start a fresh
// reading interval after the guide closes or the browser tab becomes visible.
export function deferNoticeReading(onRead: () => void, delay = 1500) {
  let timer: number | undefined;
  let permitted = false;
  let finished = false;
  const canRead = () => document.visibilityState !== 'hidden'
    && !document.querySelector('[data-help-root] [role="dialog"]');
  const stop = () => {
    window.clearTimeout(timer);
    observer.disconnect();
    document.removeEventListener('visibilitychange', synchronize);
  };
  function synchronize() {
    if (finished) return;
    const allowed = canRead();
    if (allowed === permitted) return;
    permitted = allowed;
    window.clearTimeout(timer);
    if (allowed) timer = window.setTimeout(() => {
      if (!canRead()) { synchronize(); return; }
      finished = true;
      stop();
      onRead();
    }, delay);
  }
  const observer = new MutationObserver(synchronize);
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('visibilitychange', synchronize);
  synchronize();
  return () => { finished = true; stop(); };
}
