import { chromium, webkit } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
const base='http://127.0.0.1:8765/';
const failures=[];
const views=[
 {name:'iphone-mini',width:320,height:568},
 {name:'iphone',width:390,height:844},
 {name:'phone-landscape',width:844,height:390},
 {name:'tablet',width:768,height:1024},
 {name:'desktop',width:1440,height:900}
];
const report=(browser,view,message)=>failures.push(browser+' '+view+' '+message);
for(const [engineName,engine] of [['chromium',chromium],['webkit',webkit]]) {
 const browser=await engine.launch({headless:true});
 for(const device of views){
  const ctx=await browser.newContext({
   viewport:{width:device.width,height:device.height},
   isMobile:device.width<600,hasTouch:device.width<600,
   reducedMotion:'reduce'
  });
  await ctx.addInitScript(()=>localStorage.setItem('des-theme','dark'));
  const page=await ctx.newPage();
  page.on('pageerror',err=>report(engineName,device.name,'runtime '+err.message));
  await page.goto(base+'index.html#work',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(130);
  const firstHome=await page.locator('#work .work-grid .work').first().innerText();
  if(!firstHome.includes('WCFCC'))report(engineName,device.name,'WCFCC not featured first on homepage');
  await page.goto(base+'case-studies.html#gallery',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(180);
  const metrics=await page.evaluate(()=>{
   const cards=[...document.querySelectorAll('#project-track .work-panel')];
   const a=cards[0].getBoundingClientRect(),b=cards[1].getBoundingClientRect();
   const rail=document.getElementById('project-track');
   return {
    firstId:cards[0].id,
    gap:Math.round(b.left-a.right),
    railGap:getComputedStyle(rail).gap,
    count:cards.length,
    totalWidth:document.documentElement.scrollWidth,
    viewport:innerWidth,
    expand:cards[0].querySelector('.project-expand')!==null,
    navFirst:document.querySelector('.case-grid-nav button')?.getAttribute('aria-label')
   };
  });
  if(metrics.firstId!=='wcfcc'||metrics.count!==5||!metrics.navFirst?.includes('WCFCC'))
   report(engineName,device.name,'case study order '+JSON.stringify(metrics));
  if(metrics.gap<18||!metrics.expand)report(engineName,device.name,'no breathing room '+JSON.stringify(metrics));
  if(metrics.totalWidth>metrics.viewport+3)report(engineName,device.name,'horizontal body overflow '+JSON.stringify(metrics));
  if(device.name==='iphone'&&process.env.SHOW_SHOTS==='1'){
    const shot=await page.screenshot({type:'jpeg',quality:43});
    console.log('GALLERY_SHOT_BASE64:'+engineName+':'+shot.toString('base64'));
  }
  const trigger=page.locator('#wcfcc .project-expand');
  await trigger.click();
  const dialog=page.locator('dialog.project-dialog');
  await dialog.waitFor({state:'visible'});
  // WebKit can defer requestAnimationFrame during layout after showModal.
  // Wait for the real animation class instead of assuming 110 ms is enough.
  await page.waitForFunction(
    ()=>document.querySelector('dialog.project-dialog')?.classList.contains('is-visible'),
    null,{timeout:2300}
  );
  const state=await page.evaluate(()=>{
   const dlg=document.querySelector('dialog.project-dialog');
   const p=dlg.querySelector('.work-panel');
   return {open:dlg.open,animated:dlg.classList.contains('is-visible'),
    title:p?.querySelector('h2')?.textContent,
    scroller:!!p?.querySelector('.panel-scroller'),close:!!dlg.querySelector('.project-dialog-close'),
    trapped:document.activeElement===dlg.querySelector('.project-dialog-close')};
  });
  if(!state.open||!state.animated||!state.scroller||!state.close||!state.trapped)
   report(engineName,device.name,'modal failed '+JSON.stringify(state));
  const accessibility=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
  for(const v of accessibility.violations.filter(v=>['serious','critical'].includes(v.impact)))
   report(engineName,device.name,'AXE '+v.id+' '+v.nodes.slice(0,3).map(n=>n.target.join(',')).join(';'));
  if(device.name==='iphone'&&process.env.SHOW_SHOTS==='1'){
   const shot=await page.screenshot({type:'jpeg',quality:42});
   console.log('MODAL_SHOT_BASE64:'+engineName+':'+shot.toString('base64'));
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(80);
  const closed=await page.evaluate(()=>({
   modal:document.querySelector('dialog.project-dialog').open,
   cards:document.querySelectorAll('#project-track .work-panel').length,
   placeholder:document.querySelectorAll('.work-panel-placeholder').length,
   body:document.body.classList.contains('project-modal-active'),
   focused:document.activeElement?.classList.contains('project-expand')
  }));
  if(closed.modal||closed.cards!==4||closed.placeholder!==0||closed.body||!closed.focused)
   report(engineName,device.name,'modal did not restore card '+JSON.stringify(closed));
  await page.locator('#wcfcc .project-expand').click();
  await page.locator('dialog.project-dialog').waitFor({state:'visible'});
  await page.locator('.project-dialog-close').click();
  await page.waitForTimeout(70);
  if(await page.locator('dialog.project-dialog').evaluate(el=>el.open))
   report(engineName,device.name,'close button did not close dialog');
  // Vertical wheel input is the second entry path, alongside explicit tap.
  if(!(engineName==='webkit'&&device.width<600)){
    await page.locator('#wcfcc .panel-scroller').hover();
    await page.mouse.wheel(0,170);
    await page.waitForTimeout(110);
    if(!(await page.locator('dialog.project-dialog').evaluate(el=>el.open)))
      report(engineName,device.name,'scroll-to-expand did not open project');
    else {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(80);
    }
  }
  await page.goto(base+'case-studies.html?project=anniversary#gallery',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(180);
  const direct=await page.locator('#anniversary').evaluate(el=>el.classList.contains('is-revealed'));
  if(!direct)report(engineName,device.name,'legacy deep links no longer work');
  await ctx.close();
 }
 await browser.close();
}
console.log('IMMERSIVE_QA_ISSUES='+JSON.stringify(failures));
if(failures.length)process.exitCode=1;
