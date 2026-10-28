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
// Leave vertical navigation to the browser's native anchor and touch scrolling.
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
