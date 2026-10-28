/* Stop horizontal viewport rubber-banding without disabling intentional carousels. */
(()=>{
 // Keep page interactions in JavaScript rather than inline HTML attributes.
 document.querySelectorAll('[data-print-resume]').forEach(button=>button.addEventListener('click',()=>window.print()));
 let start=null;
 const scrollable='.work-grid,#project-track,.slider,[data-horizontal-scroll]';
 document.addEventListener('touchstart',event=>{
  if(event.touches.length!==1){start=null;return;}
  const touch=event.touches[0];
  start={x:touch.clientX,y:touch.clientY,insideCarousel:!!event.target.closest(scrollable)};
 },{passive:true});
 document.addEventListener('touchmove',event=>{
  if(!start||event.touches.length!==1||start.insideCarousel||!event.cancelable)return;
  const dx=event.touches[0].clientX-start.x;
  const dy=event.touches[0].clientY-start.y;
  if(Math.abs(dx)>12&&Math.abs(dx)>Math.abs(dy)*1.2)event.preventDefault();
 },{passive:false});
 document.addEventListener('touchend',()=>{start=null},{passive:true});
 document.addEventListener('touchcancel',()=>{start=null},{passive:true});
})();
