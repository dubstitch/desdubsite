(()=>{
const pages=[...document.querySelectorAll('.chapter')],surface=document.getElementById('chapters'),universe=document.getElementById('universe'),opener=document.getElementById('open-universe'),closer=document.getElementById('close-universe'),hexes=[...document.querySelectorAll('.hex')],reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let current=0,locked=false,universeBusy=false,lastFocus=null,gestureStart=null,wheelTotal=0,wheelTimer=0;
const position=()=>Math.max(0,Math.min(pages.length-1,Math.round(surface.scrollTop/Math.max(1,surface.clientHeight))));

// Reveal on every chapter change, using the same active state as snapping.
const revealChapter=(index)=>{pages.forEach((page,i)=>{const active=i===index;page.classList.toggle('is-revealed',active);page.inert=!active;})};
document.documentElement.classList.add('reveal-ready');
let animFrame=0;
const progress=document.getElementById('chapter-count');const starStops=[...document.querySelectorAll('.constellation-track button')];function updateConstellation(i){starStops.forEach((b,k)=>{if(k===i)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current')});const p=document.getElementById('constellation-active-line');if(p)p.style.strokeDashoffset=String(100-i*25)}
function goTo(index,{instant=false}={}){
index=Math.max(0,Math.min(pages.length-1,index));
if(locked&&!instant)return;
locked=true;current=index;revealChapter(index);wheelTotal=0;clearTimeout(wheelTimer);cancelAnimationFrame(animFrame);
progress.textContent=String(index+1).padStart(2,'0')+' / '+String(pages.length).padStart(2,'0');updateConstellation(index);
const from=surface.scrollTop,to=pages[index].offsetTop;
history.replaceState(null,'','#'+pages[index].id);
if(instant||reduced||Math.abs(to-from)<2){surface.scrollTop=to;locked=false;return}
const started=performance.now(),duration=880;
function tick(now){
const x=Math.min(1,(now-started)/duration);
const ease=x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
surface.scrollTop=from+(to-from)*ease;
if(x<1){animFrame=requestAnimationFrame(tick)}else{surface.scrollTop=to;locked=false}
}
animFrame=requestAnimationFrame(tick);
}
function step(direction){if(universe.classList.contains('open')||locked)return;goTo(current+direction)}
pages.forEach((page,i)=>{

if(i<pages.length-1){const link=page.querySelector('.next-section')||document.createElement('a');link.className='next-section';link.href='#'+pages[i+1].id;link.setAttribute('aria-label','Go to next section');link.innerHTML='Explore next <span aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v16m-6-6 6 6 6-6"/></svg></span>';if(!link.isConnected)page.append(link)}
});
surface.addEventListener('wheel',e=>{if(universe.classList.contains('open'))return;if(e.target.closest('button,input,textarea,select'))return;if(e.target.closest('.work-grid')&&Math.abs(e.deltaX)>Math.abs(e.deltaY))return;e.preventDefault();if(locked)return;wheelTotal+=e.deltaY;clearTimeout(wheelTimer);wheelTimer=setTimeout(()=>wheelTotal=0,170);if(Math.abs(wheelTotal)>=15){step(Math.sign(wheelTotal));wheelTotal=0}},{passive:false});
surface.addEventListener('touchstart',e=>{if(e.touches.length!==1)return;gestureStart={x:e.touches[0].clientX,y:e.touches[0].clientY,horizontal:!!e.target.closest('.work-grid')}},{passive:true});
surface.addEventListener('touchmove',e=>{if(!gestureStart||locked)return;const dx=e.touches[0].clientX-gestureStart.x,dy=e.touches[0].clientY-gestureStart.y;if(gestureStart.horizontal&&Math.abs(dx)>Math.abs(dy)*1.15)return;if(Math.abs(dy)>7){e.preventDefault();const desired=pages[current].offsetTop-dy*.28;surface.scrollTop=Math.min(pages.at(-1).offsetTop,Math.max(0,desired));}},{passive:false});
surface.addEventListener('touchend',e=>{if(!gestureStart)return;const starting=gestureStart,dx=e.changedTouches[0].clientX-starting.x,dy=e.changedTouches[0].clientY-starting.y;gestureStart=null;if(starting.horizontal&&Math.abs(dx)>Math.abs(dy))return;if(Math.abs(dy)>35&&Math.abs(dy)>Math.abs(dx)*1.2)step(dy<0?1:-1);else if(!locked)goTo(current)},{passive:true});
document.addEventListener('keydown',e=>{if(universe.classList.contains('open')){if(e.key==='Escape'){closeUniverse();return}if(e.key==='Tab'){const focusable=[closer,...hexes];const idx=focusable.indexOf(document.activeElement);if(e.shiftKey&&idx===0){e.preventDefault();focusable.at(-1).focus()}else if(!e.shiftKey&&idx===focusable.length-1){e.preventDefault();focusable[0].focus()}}return}if(e.target.closest('input,textarea,select,[contenteditable]'))return;if(['ArrowDown','PageDown',' '].includes(e.key)){e.preventDefault();step(1)}else if(['ArrowUp','PageUp'].includes(e.key)){e.preventDefault();step(-1)}else if(e.key==='Home'){e.preventDefault();goTo(0)}else if(e.key==='End'){e.preventDefault();goTo(pages.length-1)}});
document.querySelectorAll('a[href^="#"]').forEach(link=>link.addEventListener('click',e=>{const id=link.getAttribute('href').slice(1);const index=pages.findIndex(p=>p.id===id);if(index<0)return;e.preventDefault();goTo(index)}));
function openUniverse(){if(universeBusy)return;lastFocus=document.activeElement;universe.classList.add('open');universe.setAttribute('aria-hidden','false');opener.setAttribute('aria-expanded','true');surface.inert=true;closer.focus()}
function closeUniverse(){universe.classList.remove('open');universe.setAttribute('aria-hidden','true');opener.setAttribute('aria-expanded','false');surface.inert=false;hexes.forEach(h=>h.classList.remove('go','fade'));(lastFocus||opener).focus()}
starStops.forEach(b=>b.addEventListener('click',()=>goTo(pages.findIndex(p=>p.id===b.dataset.section))));opener.addEventListener('click',openUniverse);closer.addEventListener('click',closeUniverse);
// Move gently between destinations without enlarging the chosen tile.
hexes.forEach(hex=>hex.addEventListener('click',()=>{
 if(universeBusy)return;
 universeBusy=true;
 const destination=hex.dataset.href;
 const index=pages.findIndex(page=>page.id===hex.dataset.target);
 universe.classList.add('leaving');
 setTimeout(()=>{
  if(destination){location.assign(destination);return;}
  universe.classList.remove('leaving');
  closeUniverse();
  locked=false;
  goTo(index<0?0:index,{instant:true});
  universeBusy=false;
 },reduced?0:240);
}));
window.addEventListener('resize',()=>{clearTimeout(window.__portfolioResize);window.__portfolioResize=setTimeout(()=>surface.scrollTop=pages[current].offsetTop,80)});
const initial=pages.findIndex(p=>p.id===decodeURIComponent(location.hash.slice(1)));if(initial>=0){current=initial;surface.scrollTop=pages[current].offsetTop;}progress.textContent=String(current+1).padStart(2,'0')+' / '+String(pages.length).padStart(2,'0');updateConstellation(current);revealChapter(current);
// Direct links from project pages can open the Universe immediately.
if(new URLSearchParams(location.search).get('universe')==='1'){history.replaceState(null,'',location.pathname+location.hash);openUniverse();}

// Calm ambient oil-and-glitter particle field. Pointer forces are soft and spring back.
const canvas=document.getElementById('stardust'),ctx=canvas.getContext('2d',{alpha:true});
if(ctx){let W=0,H=0,dpr=1,stars=[],px=-999,py=-999,lastInput=0;const count=48;
function sizeStars(){W=innerWidth;H=innerHeight;dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);if(!stars.length)stars=Array.from({length:count},(_,i)=>({x:(i*97.7%100)/100*W,y:(i*61.3%100)/100*H,vx:0,vy:0,r:.65+(i%4)*.42,seed:i*2.39}));}
sizeStars();addEventListener('resize',sizeStars);
function push(x,y){px=x;py=y;lastInput=performance.now();}
addEventListener('pointermove',e=>push(e.clientX,e.clientY),{passive:true});addEventListener('touchmove',e=>{if(e.touches[0])push(e.touches[0].clientX,e.touches[0].clientY)},{passive:true});
let t=0;function draw(){ctx.clearRect(0,0,W,H);t+=.008;for(const s of stars){if(!reduced){const dx=s.x-px,dy=s.y-py,dist=Math.hypot(dx,dy)||1;if(performance.now()-lastInput<450&&dist<125){const power=(1-dist/125)*.42;s.vx+=dx/dist*power;s.vy+=dy/dist*power;}s.vx=s.vx*.94+Math.sin(t+s.seed)*.008;s.vy=s.vy*.94+Math.cos(t*.75+s.seed)*.007;s.x+=s.vx;s.y+=s.vy;if(s.x<0)s.x=W;if(s.x>W)s.x=0;if(s.y<0)s.y=H;if(s.y>H)s.y=0;}ctx.beginPath();ctx.fillStyle='rgba(255,223,244,.58)';ctx.shadowBlur=8;ctx.shadowColor='#f4b6e4';ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();}if(!reduced)requestAnimationFrame(draw)}draw()}

const featured=document.querySelector('#work .work-grid'),featuredCards=featured?[...featured.querySelectorAll('.work')]:[],featuredControls=document.querySelector('#work .work-controls');
if(featured&&featuredCards.length&&featuredControls){
 const prev=featuredControls.querySelector('.work-back'),next=featuredControls.querySelector('.work-forward'),status=featuredControls.querySelector('.work-position');
 let item=0,pausedUntil=0,autoTimer=null,frame=0,direction=1;
 const select=(i,manual=false)=>{
  item=(i+featuredCards.length)%featuredCards.length;
  const p=featuredCards[item],base=featured.getBoundingClientRect(),rect=p.getBoundingClientRect();
  const x=featured.scrollLeft+rect.left-base.left-4;
  featured.scrollTo({left:x,behavior:reduced?'instant':'smooth'});
  status.textContent=String(item+1).padStart(2,'0')+' / '+String(featuredCards.length).padStart(2,'0');
  prev.disabled=item===0;next.disabled=item===featuredCards.length-1;
  if(manual)pausedUntil=Date.now()+8000;
 };
 prev.addEventListener('click',()=>select(Math.max(0,item-1),true));
 next.addEventListener('click',()=>select(Math.min(featuredCards.length-1,item+1),true));
 featured.addEventListener('pointerdown',()=>{pausedUntil=Date.now()+9000},{passive:true});
 featured.addEventListener('focusin',()=>{pausedUntil=Date.now()+9000});
 featured.addEventListener('mouseenter',()=>{pausedUntil=Date.now()+8000});
 featured.addEventListener('scroll',()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
  const pos=featured.scrollLeft+4;let idx=0,dist=Infinity;
  featuredCards.forEach((card,i)=>{const d=Math.abs(card.offsetLeft-pos);if(d<dist){dist=d;idx=i}});
  if(idx!==item){item=idx;status.textContent=String(item+1).padStart(2,'0')+' / '+String(featuredCards.length).padStart(2,'0');prev.disabled=item===0;next.disabled=item===featuredCards.length-1}
 })},{passive:true});
 select(0);
 if(!reduced){autoTimer=setInterval(()=>{
  if(current!==1||document.hidden||universe.classList.contains('open')||Date.now()<pausedUntil||featured.matches(':focus-within')||featured.matches(':hover'))return;
  if(item===featuredCards.length-1)direction=-1;else if(item===0)direction=1;select(item+direction);
 },4800)}
}

const cards=[...document.querySelectorAll('.work')];if(cards.length&&!reduced){let light=0;setInterval(()=>{cards.forEach((c,i)=>c.classList.toggle('is-lit',i===light));light=(light+1)%cards.length},2800)}
})();