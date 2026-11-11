/* The working, self-contained constellation demonstration in Component Lab.
   Five focusable stops follow the same SVG path and progress logic as home. */
(() => {
  const root=document.querySelector('[data-constellation-demo]');
  if(!root)return;
  const stops=[...root.querySelectorAll('[data-step]')];
  const labels=[
    ['Arrival','Set the context and invite the visitor in.'],
    ['Selected work','Give each project an intentional destination.'],
    ['My story','Connect technical experience with the person behind it.'],
    ['My approach','Show the thinking behind the implementation.'],
    ['Contact','End with a clear, accessible invitation to connect.']
  ];
  const line=root.querySelector('[data-progress-line]');
  const count=root.querySelector('[data-step-count]');
  const heading=root.querySelector('[data-step-title]');
  const description=root.querySelector('[data-step-description]');
  const previous=root.querySelector('[data-step-previous]');
  const next=root.querySelector('[data-step-next]');
  let active=0;
  function setStep(index,focus=false){
    active=Math.max(0,Math.min(stops.length-1,index));
    stops.forEach((stop,i)=>{
      if(i===active)stop.setAttribute('aria-current','step');
      else stop.removeAttribute('aria-current');
      stop.dataset.state=i<active?'complete':i===active?'current':'upcoming';
    });
    if(line)line.style.strokeDashoffset=String(100-active*25);
    if(count)count.textContent=String(active+1).padStart(2,'0')+' / '+String(stops.length).padStart(2,'0');
    if(heading)heading.textContent=labels[active][0];
    if(description)description.textContent=labels[active][1];
    previous.disabled=active===0;
    next.disabled=active===stops.length-1;
    if(focus)stops[active].focus();
  }
  stops.forEach((stop,i)=>{
    stop.addEventListener('click',()=>setStep(i));
    stop.addEventListener('keydown',event=>{
      const go={
        ArrowRight:Math.min(stops.length-1,i+1),
        ArrowDown:Math.min(stops.length-1,i+1),
        ArrowLeft:Math.max(0,i-1),
        ArrowUp:Math.max(0,i-1),
        Home:0,
        End:stops.length-1
      };
      if(Object.prototype.hasOwnProperty.call(go,event.key)){
        event.preventDefault();
        setStep(go[event.key],true);
      }
    });
  });
  previous.addEventListener('click',()=>setStep(active-1,true));
  next.addEventListener('click',()=>setStep(active+1,true));
  setStep(0);

  // Show the ACTUAL files powering the demonstration instead of fake samples.
  // Code is read from the same public site and never executed from the viewer.
  const sourceBox=document.querySelector('[data-source-code]');
  const sourceButtons=[...document.querySelectorAll('[data-source-file]')];
  const cache=new Map();
  let requested=0;
  async function showSource(file){
    const request=++requested;
    sourceButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.sourceFile===file)));
    if(!sourceBox)return;
    sourceBox.textContent='Loading '+file+'…';
    try{
      if(!cache.has(file)){
        const response=await fetch(file,{cache:'no-store'});
        if(!response.ok)throw Error('HTTP '+response.status);
        cache.set(file,await response.text());
      }
      if(request===requested)sourceBox.textContent=cache.get(file);
    }catch(error){
      if(request===requested)sourceBox.textContent='Source preview is unavailable. Use the source links below to view the file on GitHub.';
    }
  }
  sourceButtons.forEach(button=>button.addEventListener('click',()=>showSource(button.dataset.sourceFile)));
  const details=document.querySelector('[data-source-details]');
  details?.addEventListener('toggle',()=>{if(details.open)showSource('constellation-demo.js')});
})();