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
  if(inProject(target))return null;
  if(direction>0&&window.scrollY<chapterTop(gallery)-32)return gallery;
  if(direction<0&&nearGalleryStart())return intro;
  return null;
}
window.addEventListener('wheel',event=>{
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
  if(!chapterTouch||event.touches.length!==1||!event.cancelable)return;
  const finger=event.touches[0];
  const dx=finger.clientX-chapterTouch.x,dy=finger.clientY-chapterTouch.y;
  if(Math.abs(dy)<9||Math.abs(dy)<Math.abs(dx)*1.25)return;
  const destination=chapterIntent(chapterTouch.target,Math.sign(-dy));
  if(destination||chapterLock){chapterTouch.blocked=true;event.preventDefault();}
},{passive:false});
document.addEventListener('touchend',event=>{
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
}
initialize();
document.fonts?.ready?.then(()=>{
  navigate(current,true);
});
window.addEventListener('pageshow',event=>{if(event.persisted){sizeHeader();navigate(current,true)}});
window.addEventListener('resize',()=>{
  if(Math.abs(innerWidth-lastWidth)<2)return;
  lastWidth=innerWidth;
  sizeHeader();
  requestAnimationFrame(()=>navigate(current,true));
},{passive:true});
})();
