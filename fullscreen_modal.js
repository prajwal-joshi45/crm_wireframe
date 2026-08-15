
/* Global full-screen modal behavior.
   CSS handles the sizing; this hook ensures body scrolling is locked while
   any overlay is open and restored after it closes. */
(function installFullscreenModalBehavior(){
  const sync = () => {
    const overlay = document.getElementById("overlay-slot");
    const open = overlay && overlay.children.length > 0 &&
                 getComputedStyle(overlay).display !== "none";
    document.documentElement.classList.toggle("crm-modal-open", !!open);
    document.body.classList.toggle("crm-modal-open", !!open);
  };

  const observer = new MutationObserver(sync);
  const start = () => {
    const overlay = document.getElementById("overlay-slot");
    if (overlay) {
      observer.observe(overlay, {childList:true, subtree:true, attributes:true});
      sync();
    } else {
      setTimeout(start, 100);
    }
  };
  start();
})();
