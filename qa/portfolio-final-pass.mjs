import {chromium,webkit} from 'playwright';
const cases=[
 {name:'tiny-portrait',width:320,height:568},
 {name:'iphone-portrait',width:390,height:844},
 {name:'wide-phone',width:430,height:932},
 {name:'short-landscape',width:667,height:320},
 {name:'phone-landscape',width:844,height:390},
 {name:'tablet-portrait',width:768,height:1024},
 {name:'tablet-landscape',width:1024,height:768},
 {name:'desktop',width:1440,height:900}
];
const expected=['wcfcc','dublist','anniversary','asce2027'];
const destinations=[
 ['Selected work','case-studies.html'],['Wade List','case-studies.html?project=dublist#gallery'],
 ['ASCE 2027','case-studies.html?project=asce2027#gallery'],['My philosophy','philosophy.html'],
 ['Résumé','resume.html'],['Component lab','component-lab.html'],['Contact','mailto:desireewade5@gmail.com']
];
const issues=[];const fail=(where,message)=>issues.push(where+' '+message);
const intersect=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
for(const [engineName,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch({headless:true});
 for(const screen of cases){
  const context=await browser.newContext({viewport:{width:screen.width,height:screen.height},isMobile:screen.width<550,hasTouch:screen.width<550,reducedMotion:'reduce'});
  const page=await context.newPage();
  page.on('pageerror',e=>fail(engineName+' '+screen.name,'JS '+e.message));
  for(const theme of ['dark','light']){
   const where=engineName+' '+screen.name+' '+theme;
   try{
    await page.goto('http://127.0.0.1:8765/index.html',{waitUntil:'networkidle'});
    await page.evaluate(t=>localStorage.setItem('des-theme',t),theme);
    await page.goto('http://127.0.0.1:8765/index.html?universe=1',{waitUntil:'networkidle'});
    const map=await page.evaluate(()=>{
      const root=document.querySelector('.solar-system'),o=root.getBoundingClientRect();
      const planets=[...root.querySelectorAll('.planet')].map(el=>{
        const r=el.getBoundingClientRect();
        return {name:el.getAttribute('aria-label'),href:el.dataset.href,target:el.dataset.target,
          left:r.left,right:r.right,top:r.top,bottom:r.bottom,
          cx:r.left+r.width/2,cy:r.top+r.height/2};
      });
      const title=document.querySelector('.universe-title').getBoundingClientRect();
      const close=document.querySelector('#close-universe').getBoundingClientRect();
      return {center:{x:o.left+o.width/2,y:o.top+o.height/2},
        orbit:{w:o.width,h:o.height,left:o.left,right:o.right,top:o.top,bottom:o.bottom},
        planets,close:{left:close.left,right:close.right,top:close.top,bottom:close.bottom},
        title:{left:title.left,right:title.right,top:title.top,bottom:title.bottom},
        viewport:{w:innerWidth,h:innerHeight},
        overflow:document.documentElement.scrollWidth-innerWidth};
    });
    if(map.planets.length!==7||map.overflow>2)
      fail(where,'inventory or document overflow '+JSON.stringify(map));
    if(Math.abs(map.orbit.w-map.orbit.h)>2)
      fail(where,'orbit container is not circular '+JSON.stringify(map.orbit));
    const radii=map.planets.map(p=>Math.hypot(p.cx-map.center.x,p.cy-map.center.y));
    if(Math.max(...radii)-Math.min(...radii)>1.5)
      fail(where,'planets are not equidistant from circle center '+JSON.stringify(radii));
    const sortedAngles=map.planets.map(p=>Math.atan2(p.cy-map.center.y,p.cx-map.center.x));
    const differences=sortedAngles.map((angle,i)=>{
      const other=sortedAngles[(i+1)%sortedAngles.length];
      return (other-angle+Math.PI*4)%(Math.PI*2);
    });
    if(differences.some(d=>Math.abs(d-2*Math.PI/7)>.022))
      fail(where,'planet angles are uneven '+JSON.stringify(differences));
    map.planets.forEach((p,i)=>{
      if(p.name!==destinations[i][0]||p.href!==destinations[i][1]||p.target)
        fail(where,'destination mismatch '+JSON.stringify(p));
      if(p.left<-2||p.right>map.viewport.w+2||p.top<-2||p.bottom>map.viewport.h+2)
        fail(where,'planet clipped '+JSON.stringify(p));
      for(let j=i+1;j<map.planets.length;j++){
       if(intersect(p,map.planets[j])>60)fail(where,'planet buttons overlap '+i+'/'+j+' '+intersect(p,map.planets[j]));
      }
    });
    if(intersect(map.title,map.close)>12)fail(where,'close button overlaps title');
    if(map.planets.some(p=>intersect(p,map.title)>65))
      fail(where,'planet overlaps title');
    if(theme==='light'){
      await page.locator('#close-universe').focus();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      const focus=await page.locator('#close-universe').evaluate(el=>({
        visible:el.matches(':focus-visible'),outline:getComputedStyle(el).outlineColor,
        width:getComputedStyle(el).outlineWidth
      }));
      if(!focus.visible||focus.outline!=='rgb(84, 33, 77)'||focus.width!=='4px')
        fail(where,'low contrast close focus '+JSON.stringify(focus));
    }
    await page.goto('http://127.0.0.1:8765/index.html',{waitUntil:'domcontentloaded'});
    const homeOrder=await page.locator('#work .work-grid .work').evaluateAll(nodes=>nodes.map(n=>new URL(n.href).searchParams.get('project')));
    if(JSON.stringify(homeOrder)!==JSON.stringify(expected))
      fail(where,'home work order '+JSON.stringify(homeOrder));
    await page.goto('http://127.0.0.1:8765/case-studies.html',{waitUntil:'domcontentloaded'});
    const gallery=await page.evaluate(()=>({
      order:[...document.querySelectorAll('.work-panel')].map(n=>n.dataset.projectId),
      stars:[...document.querySelectorAll('.case-grid-nav .nav-star')].map(n=>n.getAttribute('aria-label')),
      numbers:[...document.querySelectorAll('.panel-number')].map(n=>n.textContent.trim())
    }));
    if(JSON.stringify(gallery.order)!==JSON.stringify(expected)||
       gallery.stars.length!==4||
       gallery.numbers.some((n,i)=>!n.includes(String(i+1).padStart(2,'0')+' / 04')))
      fail(where,'gallery wrong order '+JSON.stringify(gallery));
    if(screen.name==='iphone-portrait'||screen.name==='desktop'){
      await page.goto('http://127.0.0.1:8765/component-lab.html',{waitUntil:'networkidle'});
      const stat=await page.evaluate(()=>({
        wip:document.querySelector('.lab-wip')?.textContent.toLowerCase().includes('work in progress'),
        examples:document.querySelectorAll('.component').length,
        stops:document.querySelectorAll('[data-constellation-demo] [data-step]').length,
        oldSlider:document.querySelectorAll('.slider,.slide,.crumb,.hero-demo').length,
        source:!!document.querySelector('[data-source-code]'),
        overflow:document.documentElement.scrollWidth-innerWidth
      }));
      if(!stat.wip||stat.examples!==1||stat.stops!==5||stat.oldSlider||!stat.source||stat.overflow>2)
        fail(where,'lab not clean and interactive '+JSON.stringify(stat));
      await page.locator('[data-step-next]').click();
      const step=await page.evaluate(()=>({
        active:document.querySelector('[data-step][aria-current="step"]')?.dataset.step,
        count:document.querySelector('[data-step-count]')?.textContent,
        offset:document.querySelector('[data-progress-line]')?.style.strokeDashoffset
      }));
      if(step.active!=='1'||step.count!=='02 / 05'||step.offset!=='75')
        fail(where,'constellation next step '+JSON.stringify(step));
      await page.locator('[data-step="1"]').focus();
      await page.keyboard.press('End');
      if(await page.locator('[data-step="4"][aria-current="step"]').count()!==1)
        fail(where,'constellation keyboard End failed');
      await page.locator('[data-source-details]').evaluate(el=>el.open=true);
      await page.waitForFunction(()=>document.querySelector('[data-source-code]')?.textContent.includes('function setStep'),null,{timeout:5000});
      await page.locator('[data-source-file="constellation-lab-finish.css"]').click();
      await page.waitForFunction(()=>document.querySelector('[data-source-code]')?.textContent.includes('.lab-arc'),null,{timeout:5000});
    }
   }catch(error){fail(where,'test exception '+error.message)}
  }
  await context.close();
 }
 await browser.close();
}
console.log('FINAL_PORTFOLIO_ISSUES='+JSON.stringify(issues));
if(issues.length)process.exitCode=1;
