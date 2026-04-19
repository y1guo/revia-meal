export const themeScript = `
(function(){
  try {
    var m = document.cookie.match(/(?:^|; )revia-theme=([^;]*)/);
    var pref = m ? decodeURIComponent(m[1]) : 'system';
    var isDark = pref === 'dark' || (pref === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`.trim()
