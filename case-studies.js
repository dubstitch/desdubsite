(()=>{
'use strict';
const track=document.getElementById('project-track');
const gallery=document.getElementById('gallery');
const header=document.querySelector('.site-header');
const panels=[...track.querySelectorAll('.work-panel')];
const stars=[...document.querySelectorAll('.case-grid-nav button')];
const previous=document.getElementById('prev-project');
const next=document.getElementById('next-project');
const status=document.getElementById('project-announcement');
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
let current=0,frame=0,suppressUntil=0,lastWidth=window.innerWidth;
const projectIds=panels.map(panel=>panel.id);
function sizeHeader(){
  document.documentElement.style.setProperty('--head-height',Math.ceil(header.getBoundingClientRect().height)+'px');
}
sizeHeader();
if('ResizeObserver' in window)new ResizeObserver(sizeHeader).observe(header);
function panelOffset(index){
  const panel=panels[index];
  return Math.max(0,panel.offsetLeft-(track.clientWidth-panel.offsetWidth)/2);
}
function mark(index,announce=false){
  index=Math.max(0,Math.min(panels.length-1,index));
  if(index===current&&stars[index]?.getAttribute('aria-current')==='step'&&!announce)return;
  current=index;
  panels.forEach((panel,i)=>{panel.classList.toggle('is-revealed',i===index);panel.inert=i!==index;});
  stars.forEach((star,i)=>{if(i===index)star.setAttribute('aria-current','step');else star.removeAttribute('aria-current')});
  previous.disabled=index===0;next.disabled=index===panels.length-1;
  if(announce&&status){status.textContent='Project '+(index+1)+' of '+panels.length+': '+(panels[index].querySelector('h2')?.textContent||'Selected work')}
}
function navigate(index,instant=false){
  index=Math.max(0,Math.min(panels.length-1,index));
  suppressUntil=performance.now()+(instant?0:480);
  mark(index,true);
  track.scrollTo({left:panelOffset(index),behavior:instant||reduced.matches?'instant':'smooth'});
}
previous.addEventListener('click',()=>navigate(current-1));
next.addEventListener('click',()=>navigate(current+1));
stars.forEach((star,index)=>star.addEventListener('click',()=>navigate(index)));
track.addEventListener('scroll',()=>{
  cancelAnimationFrame(frame);
  frame=requestAnimationFrame(()=>{
    if(performance.now()<suppressUntil)return;
    const center=track.scrollLeft+track.clientWidth/2;
    let closest=0,distance=Infinity;
    panels.forEach((panel,i)=>{
      const diff=Math.abs(panel.offsetLeft+panel.offsetWidth/2-center);
      if(diff<distance){distance=diff;closest=i}
    });
    if(closest!==current)mark(closest,true);
  });
},{passive:true});
document.addEventListener('keydown',event=>{
  if(event.altKey||event.ctrlKey||event.metaKey||event.target.closest('input,textarea,select,[contenteditable]'))return;
  const focusedInside=!!event.target.closest('.gallery-shell');
  const rectangle=gallery.getBoundingClientRect();
  const galleryVisible=rectangle.top<window.innerHeight*.7&&rectangle.bottom>window.innerHeight*.3;
  if(!galleryVisible&&!focusedInside)return;
  if(event.key==='ArrowRight'){event.preventDefault();navigate(current+1)}
  else if(event.key==='ArrowLeft'){event.preventDefault();navigate(current-1)}
});
// Use the same gesture-driven chapter transition as the homepage.
// The gallery is intentionally taller than the viewport: once entered,
// normal vertical reading and the invitation remain scrollable.
const intro=document.getElementById('gallery-intro');
let chapterLock=false,chapterFrame=0,chapterTouch=null,chapterWheel=0,chapterWheelReset=0;
const chapterTop=el=>Math.max(0,Math.round(el.getBoundingClientRect().top+window.scrollY-header.getBoundingClientRect().height));
function chapterGo(el){
  if(chapterLock)return;
  const from=window.scrollY,to=chapterTop(el);
  if(Math.abs(to-from)<3)return;
  chapterLock=true;
  clearTimeout(chapterWheelReset);
  chapterWheel=0;
  cancelAnimationFrame(chapterFrame);
  const duration=reduced.matches?0:780;
  if(!duration){window.scrollTo(0,to);chapterLock=false;return;}
  const begun=performance.now();
  function tick(now){
    const t=Math.min(1,(now-begun)/duration);
    const eased=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
    window.scrollTo(0,from+(to-from)*eased);
    if(t<1)chapterFrame=requestAnimationFrame(tick);
    else{window.scrollTo(0,to);chapterLock=false;}
  }
  chapterFrame=requestAnimationFrame(tick);
}
const nearGalleryStart=()=>Math.abs(window.scrollY-chapterTop(gallery))<42;
const inProject=target=>!!target.closest('.panel-scroller,#project-track,.work-panel');
function chapterIntent(target,direction){
  // The dialog lives outside the gallery DOM. Never intercept its scrolling.
  if(document.body.classList.contains('project-modal-active'))return null;
  if(inProject(target))return null;
  if(direction>0&&window.scrollY<chapterTop(gallery)-32)return gallery;
  if(direction<0&&nearGalleryStart())return intro;
  return null;
}
window.addEventListener('wheel',event=>{
  if(document.body.classList.contains('project-modal-active'))return;
  if(event.ctrlKey||Math.abs(event.deltaX)>Math.abs(event.deltaY)*1.1)return;
  const destination=chapterIntent(event.target,Math.sign(event.deltaY));
  if(chapterLock){event.preventDefault();return;}
  if(!destination)return;
  event.preventDefault();
  chapterWheel+=event.deltaY;
  clearTimeout(chapterWheelReset);
  chapterWheelReset=setTimeout(()=>chapterWheel=0,160);
  if(Math.abs(chapterWheel)>=15){chapterWheel=0;chapterGo(destination);}
},{passive:false});
document.addEventListener('touchstart',event=>{
  if(event.touches.length!==1)return;
  const finger=event.touches[0];
  chapterTouch={x:finger.clientX,y:finger.clientY,target:event.target,blocked:false};
},{passive:true});
document.addEventListener('touchmove',event=>{
  if(document.body.classList.contains('project-modal-active'))return;
  if(!chapterTouch||event.touches.length!==1||!event.cancelable)return;
  const finger=event.touches[0];
  const dx=finger.clientX-chapterTouch.x,dy=finger.clientY-chapterTouch.y;
  if(Math.abs(dy)<9||Math.abs(dy)<Math.abs(dx)*1.25)return;
  const destination=chapterIntent(chapterTouch.target,Math.sign(-dy));
  if(destination||chapterLock){chapterTouch.blocked=true;event.preventDefault();}
},{passive:false});
document.addEventListener('touchend',event=>{
  if(document.body.classList.contains('project-modal-active')){chapterTouch=null;return;}
  if(!chapterTouch||!event.changedTouches.length)return;
  const finger=event.changedTouches[0];
  const dx=finger.clientX-chapterTouch.x,dy=finger.clientY-chapterTouch.y;
  const target=chapterIntent(chapterTouch.target,Math.sign(-dy));
  chapterTouch=null;
  if(target&&Math.abs(dy)>37&&Math.abs(dy)>Math.abs(dx)*1.2)chapterGo(target);
},{passive:true});
document.addEventListener('touchcancel',()=>{chapterTouch=null;},{passive:true});
document.addEventListener('keydown',event=>{
  if(event.ctrlKey||event.metaKey||event.altKey||event.target.closest('input,textarea,select,[contenteditable]')||inProject(event.target))return;
  const direction=['ArrowDown','PageDown',' '].includes(event.key)?1:['ArrowUp','PageUp'].includes(event.key)?-1:0;
  if(!direction)return;
  const target=chapterIntent(event.target,direction);
  if(target){event.preventDefault();chapterGo(target);}
});

// The card itself grows into a native modal. No duplicate case-study markup,
// nested cloned content, surprise route changes or broken browser back buttons.
const projectDialog=document.createElement('dialog');
projectDialog.className='project-dialog';
projectDialog.setAttribute('aria-label','Expanded project case study');
projectDialog.innerHTML='<button type="button" class="project-dialog-close" aria-label="Close full-screen project"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg></button><div class="project-dialog-content"></div>';
document.body.appendChild(projectDialog);
const dialogContent=projectDialog.querySelector('.project-dialog-content');
const dialogClose=projectDialog.querySelector('.project-dialog-close');
let expandedPanel=null, panelPlace=null, focusReturn=null, closingPanel=false;
let dialogRecoveryTimer=0, dialogRefreshFrame=0;

function sizeProjectDialog(){
  if(!projectDialog.open||!expandedPanel)return;
  const vv=window.visualViewport;
  // At normal zoom use the actual visual viewport, especially after rotation
  // or returning to Safari. Preserve browser pinch zoom behavior.
  const height=vv&&vv.scale<=1.01?vv.height:window.innerHeight;
  if(Number.isFinite(height)&&height>160){
    projectDialog.style.setProperty('--project-dialog-height',Math.round(height)+'px');
  }
  // On rotated iPhones the layout viewport can retain an older width.
  // Use the *visible* CSS-pixel width at normal zoom, not 100vw.
  if(vv&&vv.scale<=1.01&&vv.width>240){
    projectDialog.style.setProperty('--project-dialog-width',Math.round(vv.width)+'px');
  }else{
    projectDialog.style.removeProperty('--project-dialog-width');
  }
}
function recoverProjectScroll(){
  if(!projectDialog.open||!expandedPanel||closingPanel)return;
  sizeProjectDialog();
  const scroller=expandedPanel.querySelector('.panel-scroller');
  if(!scroller)return;
  const savedTop=scroller.scrollTop;
  cancelAnimationFrame(dialogRefreshFrame);
  // WebKit can retain a stale overflow scrolling layer when a native dialog
  // is backgrounded, resumed, or rotated. Recreate that layer without
  // discarding the reader's position or collapsing the modal.
  scroller.style.setProperty('-webkit-overflow-scrolling','auto');
  scroller.style.setProperty('overflow-y','hidden','important');
  dialogRefreshFrame=requestAnimationFrame(()=>{
    if(!projectDialog.open||closingPanel)return;
    void scroller.offsetHeight;
    scroller.style.setProperty('overflow-y','auto','important');
    scroller.scrollTop=Math.max(0,Math.min(savedTop,scroller.scrollHeight-scroller.clientHeight));
    dialogRefreshFrame=requestAnimationFrame(()=>{
      scroller.style.removeProperty('overflow-y');
      scroller.style.removeProperty('-webkit-overflow-scrolling');
    });
  });
}
function scheduleProjectRecovery(delay=140){
  if(!projectDialog.open||!expandedPanel)return;
  sizeProjectDialog();
  clearTimeout(dialogRecoveryTimer);
  dialogRecoveryTimer=setTimeout(recoverProjectScroll,delay);
}
function expandProject(panel){
  if(expandedPanel||closingPanel||!panel||!projectDialog.showModal)return;
  focusReturn=panel.querySelector('.project-expand')||document.activeElement;
  panelPlace=document.createElement('div');
  panelPlace.className='work-panel-placeholder';
  panelPlace.setAttribute('aria-hidden','true');
  panel.before(panelPlace);
  expandedPanel=panel;
  const heading=panel.querySelector('h2');
  if(heading){
    heading.id=heading.id||'expanded-heading-'+panel.id;
    projectDialog.setAttribute('aria-labelledby',heading.id);
  }
  const contentScroll=panel.querySelector('.panel-scroller');
  if(contentScroll)contentScroll.scrollTop=0;
  panel.inert=false;
  panel.classList.remove('is-previewing','is-preview-resetting');
  panel.style.removeProperty('--preview-grow');
  panel.style.removeProperty('--preview-lift');
  dialogContent.append(panel);
  track.inert=true;
  document.body.classList.add('project-modal-active');
  projectDialog.showModal();
  sizeProjectDialog();
  projectDialog.classList.remove('scroll-ready');
  setTimeout(()=>{
    if(projectDialog.open&&expandedPanel===panel&&!closingPanel){
      projectDialog.classList.add('scroll-ready');
      scheduleProjectRecovery(0);
    }
  },reduced.matches?0:780);
  // Two frames ensure a real before/after paint so the slower expansion
  // visibly eases forward even when Safari receives the initial gesture.
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    projectDialog.classList.add('is-visible');
    dialogClose.focus({preventScroll:true});
  }));
}
function closeExpanded(){
  if(!expandedPanel||closingPanel)return;
  closingPanel=true;
  projectDialog.classList.remove('is-visible','scroll-ready');
  clearTimeout(dialogRecoveryTimer);
  cancelAnimationFrame(dialogRefreshFrame);
  const panel=expandedPanel, placeholder=panelPlace, returnFocus=focusReturn;
  setTimeout(()=>{
    if(projectDialog.open)projectDialog.close();
    projectDialog.style.removeProperty('--project-dialog-height');
    projectDialog.style.removeProperty('--project-dialog-width');
    placeholder.replaceWith(panel);
    expandedPanel=null;
    panelPlace=null;
    closingPanel=false;
    track.inert=false;
    document.body.classList.remove('project-modal-active');
    const panelIndex=panels.indexOf(panel);
    if(panelIndex>=0){
      mark(panelIndex,false);
      // The card's previous offset is stale after a portrait/landscape swap.
      requestAnimationFrame(()=>track.scrollTo({left:panelOffset(panelIndex),behavior:'instant'}));
    }
    lastWidth=window.innerWidth;
    returnFocus?.focus({preventScroll:true});
  },reduced.matches?0:700);
}
dialogClose.addEventListener('click',closeExpanded);
projectDialog.addEventListener('cancel',event=>{event.preventDefault();closeExpanded();});
projectDialog.addEventListener('click',event=>{
  if(event.target===projectDialog)closeExpanded();
});
// Clicking, tapping or starting to read a case study makes it immersive.
// Vertical scroll inside the gallery activates the project, not a page jump.
panels.forEach(panel=>{
  const expand=panel.querySelector('.project-expand');
  const scroller=panel.querySelector('.panel-scroller');
  if(!expand||!scroller)return;
  expand.addEventListener('click',()=>expandProject(panel));
  panel.addEventListener('click',event=>{
    if(expandedPanel||event.target.closest('a,button'))return;
    expandProject(panel);
  });
  let touchStart=null,overPull=0,lastWheel=0,wheelProgress=0,wheelReset=null,suppressClickUntil=0;
  const resetPreview=(animate=true)=>{
    panel.classList.remove('is-previewing');
    if(animate)panel.classList.add('is-preview-resetting');
    panel.style.removeProperty('--preview-grow');
    panel.style.removeProperty('--preview-lift');
    if(animate)setTimeout(()=>panel.classList.remove('is-preview-resetting'),320);
  };
  const showPreview=progress=>{
    if(expandedPanel||closingPanel)return;
    const p=Math.max(0,Math.min(1,progress));
    panel.classList.remove('is-preview-resetting');
    panel.classList.add('is-previewing');
    panel.style.setProperty('--preview-grow',String(1+p*.045));
    panel.style.setProperty('--preview-lift',(-p*8).toFixed(1)+'px');
  };
  scroller.addEventListener('touchstart',event=>{
    if(event.touches.length!==1)return;
    const finger=event.touches[0];
    touchStart={x:finger.clientX,y:finger.clientY,atTop:scroller.scrollTop<=2,vertical:false};
  },{passive:true});
  scroller.addEventListener('touchmove',event=>{
    if(!touchStart||event.touches.length!==1)return;
    if(expandedPanel===panel)return; // Native reading inside the full dialog.
    if(expandedPanel||closingPanel)return;
    const dx=event.touches[0].clientX-touchStart.x;
    const dy=event.touches[0].clientY-touchStart.y;
    if(Math.abs(dx)>Math.abs(dy)*1.1)return; // Sideways swipe changes project.
    if(Math.abs(dy)<7)return;
    touchStart.vertical=true;
    if(event.cancelable)event.preventDefault();
    if(dy<0)showPreview(Math.abs(dy)/195);
    else resetPreview();
  },{passive:false});
  scroller.addEventListener('touchend',event=>{
    if(!touchStart||event.changedTouches.length!==1)return;
    const dx=event.changedTouches[0].clientX-touchStart.x;
    const dy=event.changedTouches[0].clientY-touchStart.y;
    const initial=touchStart;
    touchStart=null;
    if(Math.abs(dy)<40||Math.abs(dy)<Math.abs(dx)*1.15){
      resetPreview();
      return;
    }
    if(expandedPanel===panel){
      if(initial.atTop&&scroller.scrollTop<=2&&dy>125)closeExpanded();
      return;
    }
    if(initial.vertical&&!expandedPanel){
      suppressClickUntil=performance.now()+380;
      if(dy< -78)expandProject(panel);
      else resetPreview();
    }
  },{passive:true});
  scroller.addEventListener('touchcancel',()=>{touchStart=null;resetPreview();},{passive:true});
  scroller.addEventListener('keydown',event=>{
    if(!expandedPanel&&(event.key==='Enter'||event.key===' ')&&event.target===scroller){
      event.preventDefault();
      expandProject(panel);
    }
  });
  scroller.addEventListener('wheel',event=>{
    if(expandedPanel===panel){
      const now=performance.now();
      if(now-lastWheel>700)overPull=0;
      lastWheel=now;
      if(scroller.scrollTop<=1&&event.deltaY<0){
        overPull+=event.deltaY;
        if(overPull< -210){event.preventDefault();overPull=0;closeExpanded();}
      }else overPull=0;
      return;
    }
    if(expandedPanel||closingPanel||event.ctrlKey||
       Math.abs(event.deltaY)<5||Math.abs(event.deltaX)>=Math.abs(event.deltaY))return;
    event.preventDefault(); // Never partially scroll the collapsed project.
    if(event.deltaY<0){wheelProgress=0;resetPreview();return;}
    wheelProgress+=Math.abs(event.deltaY);
    showPreview(wheelProgress/175);
    clearTimeout(wheelReset);
    if(wheelProgress>=120){
      wheelProgress=0;
      expandProject(panel);
    }else wheelReset=setTimeout(()=>{wheelProgress=0;resetPreview();},360);
  },{passive:false});
  // A swipe must not synthesize a second click after we process its release.
  panel.addEventListener('click',event=>{
    if(performance.now()<suppressClickUntil){
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  },true);
});
// A direct click on the visible case study, its expansion control, or a
// vertical swipe all expose the same accessible dialog.

// Ordinary anchor links and direct links to a project still work as usual.

function initialize(){
  sizeHeader();
  const query=new URLSearchParams(location.search).get('project');
  const rawHash=decodeURIComponent(location.hash.slice(1));
  let requested=projectIds.indexOf(query);
  if(requested<0)requested=projectIds.indexOf(rawHash);
  if(requested<0)requested=0;
  if(projectIds.includes(rawHash)){
    const url=new URL(location.href);
    url.searchParams.set('project',projectIds[requested]);
    url.hash='gallery';
    history.replaceState(null,'',url.pathname+url.search+url.hash);
  }
  navigate(requested,true);
  // Align direct project deep links below the sticky header.
  if(location.hash==='#gallery'){
    requestAnimationFrame(()=>requestAnimationFrame(()=>window.scrollTo({top:chapterTop(gallery),behavior:'instant'})));
  }
}
initialize();
document.fonts?.ready?.then(()=>{
  if(!expandedPanel)navigate(current,true);
});
window.addEventListener('pageshow',event=>{
  if(!event.persisted)return;
  sizeHeader();
  if(expandedPanel)scheduleProjectRecovery(70);
  else navigate(current,true);
});
// On return from the background, cancel any chapter transition whose
// animation frame was paused by the browser, then revive the modal scrollport.
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState!=='visible')return;
  cancelAnimationFrame(chapterFrame);
  chapterLock=false;
  chapterTouch=null;
  chapterWheel=0;
  if(expandedPanel){
    scheduleProjectRecovery(80);
    setTimeout(()=>scheduleProjectRecovery(0),350);
  }
});
window.addEventListener('focus',()=>{
  if(expandedPanel)scheduleProjectRecovery(120);
});
window.addEventListener('orientationchange',()=>{
  if(expandedPanel){
    scheduleProjectRecovery(100);
    setTimeout(()=>scheduleProjectRecovery(0),380);
  }
},{passive:true});
if(window.visualViewport){
  window.visualViewport.addEventListener('resize',()=>{
    if(expandedPanel)scheduleProjectRecovery(180);
  },{passive:true});
}
window.addEventListener('resize',()=>{
  if(expandedPanel){
    sizeHeader();
    scheduleProjectRecovery(160);
    return;
  }
  if(Math.abs(innerWidth-lastWidth)<2)return;
  lastWidth=innerWidth;
  sizeHeader();
  requestAnimationFrame(()=>navigate(current,true));
},{passive:true});
})();
