import { chromium, webkit } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
const root='http://127.0.0.1:8765/';
const cases=[
 {name:'small-phone',width:320,height:568},
 {name:'phone',width:390,height:844},
 {name:'landscape',width:844,height:390},
 {name:'tablet',width:768,height:1024},
 {name:'desktop',width:1440,height:900}
];
const failures=[];
const error=(e,t,d,message)=>failures.push(e+' '+t+' '+d+' '+message);
for(const [engineName,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch({headless:true});
 for(const theme of ['light','dark']){
  for(const device of cases){
   const context=await browser.newContext({viewport:{width:device.width,height:device.height},reducedMotion:'reduce',
     isMobile:device.width<500,hasTouch:device.width<500});
   await context.addInitScript(t=>localStorage.setItem('des-theme',t),theme);
   const page=await context.newPage();
   page.on('pageerror',e=>error(engineName,theme,device.name,'JS '+e.message));
   await page.goto(root+'index.html#home',{waitUntil:'domcontentloaded'});
   await page.waitForTimeout(125);
   const home=await page.evaluate(()=>{
    const r=document.querySelector('.hero-identity').getBoundingClientRect();
    const h=document.querySelector('.home-header').getBoundingClientRect();
    const c=document.querySelector('#stardust');
    return {name:r.top,head:h.bottom,starPresent:!!c,
      starW:c?.width??0,starH:c?.height??0,
      blend:c?getComputedStyle(c).mixBlendMode:null,
      next:document.querySelector('#home .next-section')?.textContent,
      featured:document.querySelector('#work .work-grid .work strong')?.textContent};
   });
   if(home.starPresent&&(home.starW<device.width||home.starH<device.height||(theme==='light'&&home.blend==='screen')))
    error(engineName,theme,device.name,'star rendering '+JSON.stringify(home));
   if(home.name<home.head+2&&device.height>740)
    error(engineName,theme,device.name,'name near header '+JSON.stringify(home));
   if(!home.next?.includes('See what I built')||!home.featured?.includes('WCFCC'))
    error(engineName,theme,device.name,'chapter transition / work order '+JSON.stringify(home));
   await page.evaluate(()=>{
    const p=[...document.querySelectorAll('.chapter')],surface=document.querySelector('#chapters');
    p.forEach(x=>{x.inert=x.id!=='approach';x.classList.toggle('is-revealed',x.id==='approach');});
    surface.scrollTop=document.querySelector('#approach').offsetTop;
   });
   await page.waitForTimeout(80);
   const links=await page.evaluate(()=>{
    const el=[...document.querySelectorAll('#approach .approach-links .philosophy-link')];
    const a=el[0]?.getBoundingClientRect(),b=el[1]?.getBoundingClientRect();
    const overlap=a&&b?Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*
      Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)):999;
    const gap=a&&b?(b.top>=a.bottom?b.top-a.bottom:b.left>=a.right?b.left-a.right:0):999;
    return {count:el.length,overlap,gap,rects:[a?.toJSON(),b?.toJSON()]};
   });
   if(links.count!==2||links.overlap>1||(device.width<500&&links.gap>40))
    error(engineName,theme,device.name,'approach link layout '+JSON.stringify(links));
   if(process.env.SHOW_SHOTS==='1'&&theme==='light'&&engineName==='chromium'&&device.name==='phone'){
    const shot=await page.screenshot({type:'jpeg',quality:46});
    console.log('QA_SCREENSHOT_BASE64:approach-light:'+shot.toString('base64'));
    await page.evaluate(()=>{
     const p=[...document.querySelectorAll('.chapter')];
     p.forEach(x=>{x.inert=x.id!=='home';x.classList.toggle('is-revealed',x.id==='home');});
     document.querySelector('#chapters').scrollTop=0;
    });
    await page.waitForTimeout(55);
    const shot2=await page.screenshot({type:'jpeg',quality:46});
    console.log('QA_SCREENSHOT_BASE64:home-light:'+shot2.toString('base64'));
   }
   await page.goto(root+'case-studies.html?project=wcfcc#gallery',{waitUntil:'domcontentloaded'});
   await page.waitForTimeout(170);
   const nav=await page.evaluate(()=>{
    const stars=[...document.querySelectorAll('.case-grid-nav .nav-star')];
    const r=stars.map(x=>x.getBoundingClientRect());
    const left=document.querySelector('#prev-project').getBoundingClientRect();
    const right=document.querySelector('#next-project').getBoundingClientRect();
    const btn=document.querySelector('#wcfcc .project-expand');
    const sty=getComputedStyle(btn),label=getComputedStyle(btn.querySelector('span'));
    return {n:stars.length,stars:r.map(x=>({left:x.left,right:x.right})),
      arrowLeftRight:left.right,arrowRightLeft:right.left,
      label:btn.textContent.trim(),labelColor:label.color,
      labelVisible:label.visibility,
      buttonWidth:btn.getBoundingClientRect().width,
      scroller:getComputedStyle(document.querySelector('#wcfcc .panel-scroller')).overflowY,
      buttonBg:sty.backgroundColor};
   });
   const collision=nav.stars.some((r,i)=>i&&r.left<nav.stars[i-1].right-1)||
      nav.stars[0]?.left<=nav.arrowLeftRight+1||
      nav.stars.at(-1)?.right>=nav.arrowRightLeft-2;
   if(nav.n!==4||collision)error(engineName,theme,device.name,'constellation collision '+JSON.stringify(nav));
   if(nav.labelColor!=='rgb(255, 250, 252)'||nav.labelVisible!=='visible'||
      nav.buttonWidth>220||nav.scroller!=='hidden')
    error(engineName,theme,device.name,'collapsed card and text '+JSON.stringify(nav));
   await page.locator('.case-grid-nav .nav-star').nth(3).click();
   await page.waitForTimeout(85);
   if(await page.locator('.case-grid-nav .nav-star').nth(3).getAttribute('aria-current')!=='step')
    error(engineName,theme,device.name,'fourth star failed to navigate');
   await page.locator('.case-grid-nav .nav-star').first().click();
   await page.waitForTimeout(85);
   if(process.env.SHOW_SHOTS==='1'&&theme==='light'&&engineName==='chromium'&&device.name==='phone'){
    const shot=await page.screenshot({type:'jpeg',quality:46});
    console.log('QA_SCREENSHOT_BASE64:gallery-light:'+shot.toString('base64'));
   }
   await page.locator('#wcfcc .project-expand').click();
   const dlg=page.locator('dialog.project-dialog');
   await dlg.waitFor({state:'visible'});
   await page.locator('dialog.project-dialog.is-visible').waitFor({state:'attached',timeout:2500});
   await page.waitForTimeout(55);
   const modal=await page.evaluate(()=>{
    const d=document.querySelector('dialog.project-dialog');
    const panel=d.querySelector('.work-panel').getBoundingClientRect();
    const x=d.querySelector('.project-dialog-close').getBoundingClientRect();
    return {open:d.open,visible:d.classList.contains('is-visible'),
      width:x.width,top:x.top,cardTop:panel.top,right:x.right,cardRight:panel.right,
      overflow:getComputedStyle(d.querySelector('.panel-scroller')).overflowY};
   });
   if(!modal.open||!modal.visible||modal.width>43||
      modal.top<modal.cardTop+5||modal.right>modal.cardRight+4||modal.overflow!=='auto')
    error(engineName,theme,device.name,'modal bounds '+JSON.stringify(modal));
   if(process.env.SHOW_SHOTS==='1'&&theme==='light'&&engineName==='chromium'&&device.name==='phone'){
    const shot=await page.screenshot({type:'jpeg',quality:46});
    console.log('QA_SCREENSHOT_BASE64:modal-light:'+shot.toString('base64'));
   }
   await dlg.locator('.project-dialog-close').click();
   await page.waitForTimeout(85);
   if(await dlg.evaluate(el=>el.open))
    error(engineName,theme,device.name,'X failed to close dialog');
   if(device.name==='phone'||device.name==='desktop'){
    const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
    for(const v of axe.violations.filter(x=>['serious','critical'].includes(x.impact)))
     error(engineName,theme,device.name,'AXE '+v.id+' '+v.nodes.slice(0,3).map(n=>n.target.join(',')).join(';'));
   }
   await context.close();
  }
 }
 await browser.close();
}
console.log('NOV09_QA_ISSUES='+JSON.stringify(failures));
if(failures.length)process.exitCode=1;
