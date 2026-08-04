// Inline script injected into <head> — runs before first paint to avoid flash.
export function ThemeScript() {
  const script = `(function(){try{var t=localStorage.getItem('hc-theme');var v=['dark','navy','forest'];if(t&&v.indexOf(t)!==-1){document.documentElement.setAttribute('data-theme',t);}else{document.documentElement.setAttribute('data-theme','dark');localStorage.setItem('hc-theme','dark');}// Also force harmony-theme to dark on first visit
var ht=localStorage.getItem('harmony-theme');if(!ht){localStorage.setItem('harmony-theme','dark');}}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
