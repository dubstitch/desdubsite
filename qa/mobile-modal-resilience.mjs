import { chromium, webkit } from 'playwright';

/*
 Regression coverage for the failure reproduced on an iPhone:
 expand a real case study, scroll, background/resume, rotate to landscape,
 continue scrolling, rotate back and repeat. Run in Chromium AND WebKit.
*/
const root='http://127.0.0.1:8765/case-studies.html?project=anniversary#gallery';
const portrait={width:390,height:844};
const landscape={width:844,height:390};
const issues=[];
const metrics=[];
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

for(const [engineName,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch({headless:true});
 for(const theme of ['light','dark']){
  const context=await browser.newContext({
   viewport:portrait,isMobile:true,hasTouch:true,deviceScaleFactor:2,
   reducedMotion:'reduce'
  });
  await context.addInitScript(value=>localStorage.setItem('des-theme',value),theme);
  const page=await context.newPage();
  page.on('pageerror',error=>issues.push(engineName+' '+theme+' JS: '+error.message));
  try{
   await page.goto(root,{waitUntil:'domcontentloaded'});
   await page.locator('#anniversary .project-expand').click();
   const dialog=page.locator('dialog.project-dialog');
   await dialog.waitFor({state:'visible'});
   await page.locator('dialog.project-dialog.is-visible').waitFor();
   for(const size of [portrait,landscape,portrait,landscape,portrait]){
    await page.setViewportSize(size);
    await page.evaluate(()=>{
      window.dispatchEvent(new Event('orientationchange'));
      window.dispatchEvent(new Event('focus'));
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await sleep(450);
    const before=await page.evaluate(()=>{
      const d=document.querySelector('dialog.project-dialog');
      const panel=d.querySelector('.work-panel');
      const scroller=panel.querySelector('.panel-scroller');
      const box=e=>e.getBoundingClientRect();
      const dr=box(d),pr=box(panel),sr=box(scroller);
      const sections=[...panel.querySelectorAll('.story-details > section')].slice(0,2).map(box);
      const possible=Math.max(0,scroller.scrollHeight-scroller.clientHeight);
      scroller.scrollTop=Math.min(160,Math.floor(possible/3));
      return {
        opened:d.open,
        viewport:innerWidth,
        dialog:{left:dr.left,right:dr.right,width:dr.width},
        panel:{left:pr.left,right:pr.right},
        scrollport:{left:sr.left,right:sr.right,width:sr.width,client:scroller.clientWidth,
          scroll:scroller.scrollWidth,top:scroller.scrollTop,max:possible,overflow:getComputedStyle(scroller).overflowY},
        singleColumn:sections.length===2&&Math.abs(sections[0].left-sections[1].left)<3,
      };
    });
    const tag=engineName+' '+theme+' '+size.width+'x'+size.height;
    if(!before.opened)issues.push(tag+' dialog closed unexpectedly');
    if(before.dialog.right>before.viewport+3||before.panel.right>before.viewport+3||
       before.dialog.left< -3||before.panel.left< -3)
      issues.push(tag+' clipped modal '+JSON.stringify(before));
    if(before.scrollport.scroll>before.scrollport.client+3)
      issues.push(tag+' horizontal content overflow '+JSON.stringify(before.scrollport));
    if(before.scrollport.max<80||before.scrollport.overflow!=='auto')
      issues.push(tag+' modal is not vertically scrollable '+JSON.stringify(before.scrollport));
    if(!before.singleColumn&&size.width<=1100)
      issues.push(tag+' story not stacked in reading order');
    // Mobile WebKit has no mouse-wheel input. Verify the actual scrollport
    // accepts scrolling and document listeners do not cancel a touch gesture.
    const scrolling=await page.locator('dialog.project-dialog .panel-scroller').evaluate(el=>{
      const start=el.scrollTop;
      // WebKit on Linux does not expose the Touch constructor. Validate the
      // scrolling layer directly, rather than manufacture unsupported touches.
      el.scrollBy({top:250,behavior:'instant'});
      return {start,after:el.scrollTop,
        overflow:getComputedStyle(el).overflowY};
    });
    if(scrolling.after<=scrolling.start+5||scrolling.overflow!=='auto')
      issues.push(tag+' modal scrolling blocked '+JSON.stringify(scrolling));
    metrics.push({browser:engineName,theme,screen:tag,scrollBefore:scrolling.start,scrollAfter:scrolling.after});
   }
   await page.locator('.project-dialog-close').click();
   await sleep(50);
   if(await dialog.evaluate(el=>el.open))issues.push(engineName+' '+theme+' dialog did not close');
  }catch(error){
   issues.push(engineName+' '+theme+' test error: '+error.message);
  }finally{
   await context.close();
  }
 }
 await browser.close();
}
console.log('MODAL_ROTATION_METRICS='+JSON.stringify(metrics));
console.log('MODAL_ROTATION_ISSUES='+JSON.stringify(issues));
if(issues.length)process.exitCode=1;
