(() => {
  const key='des-theme';
  const root=document.documentElement;
  const buttons=[...document.querySelectorAll('[data-theme-toggle]')];
  const iconMarkup=
    '<span class="theme-orbit" aria-hidden="true">'+
      '<svg class="theme-glyph theme-glyph--sun" viewBox="0 0 24 24">'+
        '<circle cx="12" cy="12" r="4"/>'+
        '<path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>'+
      '</svg>'+
      '<svg class="theme-glyph theme-glyph--moon" viewBox="0 0 24 24">'+
        '<path d="M20.3 15.4A8.6 8.6 0 0 1 8.6 3.7 8.7 8.7 0 1 0 20.3 15.4Z"/>'+
      '</svg>'+
    '</span><span class="theme-label" aria-hidden="true"></span>';
  buttons.forEach(button=>{
    button.innerHTML=iconMarkup;
    button.setAttribute('aria-keyshortcuts','');
  });
  function read() {
    try{return localStorage.getItem(key)==='light'?'light':'dark'}
    catch(e){return 'dark'}
  }
  function update(theme) {
    root.dataset.theme=theme;
    buttons.forEach(button=>{
      const light=theme==='light';
      const instruction=light?'Switch to dark mode':'Switch to light mode';
      button.setAttribute('aria-label',instruction);
      button.setAttribute('title',instruction);
      button.dataset.mode=theme;
      const label=button.querySelector('.theme-label');
      if(label)label.textContent=light?'Light mode':'Dark mode';
    });
    document.dispatchEvent(new CustomEvent('portfolio-theme-changed',{detail:{theme}}));
  }
  update(read());
  buttons.forEach(button=>button.addEventListener('click',()=>{
    const next=root.dataset.theme==='light'?'dark':'light';
    try{localStorage.setItem(key,next)}catch(e){}
    update(next);
  }));
})();