import {chromium,webkit} from 'playwright';

const cases=[
 {name:'small-portrait',width:320,height:568},
 {name:'iphone-se',width:375,height:667},
 {name:'iphone-portrait-short',width:390,height:700},
 {name:'iphone-portrait',width:390,height:844},
 {name:'iphone-16',width:393,height:852},
 {name:'iphone-large',width:430,height:932},
 {name:'phone-landscape',width:844,height:390},
 {name:'tablet',width:768,height:1024},
 {name:'desktop',width:1440,height:900}
];
const issues=[];
for(const [engineName,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch({headless:true});
 for(const size of cases){
  const ctx=await browser.newContext({
   viewport:{width:size.width,height:size.height},
   isMobile:size.width<600,hasTouch:size.width<600,
   deviceScaleFactor:1,
   reducedMotion:'reduce'
  });
  const page=await ctx.newPage();
  const name=engineName+' '+size.name;
  page.on('pageerror',e=>issues.push(name+' JavaScript error '+e.message));
  try{
   await page.goto('http://127.0.0.1:8765/index.html',{waitUntil:'networkidle'});
   await page.waitForTimeout(120);
   const details=await page.evaluate(()=>{
    const home=document.querySelector('#home');
    const scroll=home.querySelector('.chapter-content');
    const inner=home.querySelector('.chapter-content-inner');
    const first=home.querySelector('a.cta'),second=home.querySelector('a.hero-secondary');
    const next=home.querySelector('.next-section');
    const header=document.querySelector('header').getBoundingClientRect();
    const r=el=>{const x=el.getBoundingClientRect();return {
      left:x.left,right:x.right,top:x.top,bottom:x.bottom,height:x.height
    }};
    const topElement= document.elementFromPoint(Math.max(1,Math.min(inner.clientWidth-12,30)),Math.max(1,Math.min(scroll.getBoundingClientRect().bottom-7,inner.getBoundingClientRect().bottom-4)));
    return {viewport:{w:innerWidth,h:innerHeight},chapter:r(home),scroll:r(scroll),
      scrollHeight:scroll.scrollHeight,clientHeight:scroll.clientHeight,
      scrollable:scroll.scrollHeight>scroll.clientHeight+3,
      inner:r(inner),first:r(first),second:r(second),next:r(next),
      font:getComputedStyle(home.querySelector('h1')).fontSize,
      pFont:getComputedStyle(home.querySelector('p')).fontSize,
      footerText:next.textContent, headerBottom:header.bottom,
      documentWidth:document.documentElement.scrollWidth,
      peek:topElement?.className||topElement?.tagName,
      horizontalOverflow:document.documentElement.scrollWidth>innerWidth+3};
   });
   if(details.horizontalOverflow)issues.push(name+' horizontal overflow '+JSON.stringify(details));
   if(details.second.height<20||details.first.height<35)
     issues.push(name+' CTA too short '+JSON.stringify(details));
   if(details.first.bottom>details.second.top+1)
     issues.push(name+' CTAs overlap '+JSON.stringify(details));
   if(size.width<=430&&size.height>=700){
     if(details.second.bottom>details.scroll.bottom+2 ||
       details.first.bottom>details.scroll.bottom+2)
       issues.push(name+' CTA clipped on normal phone '+JSON.stringify(details));
     if(details.second.bottom>details.next.top-5)
       issues.push(name+' secondary CTA overlaps next chapter control '+JSON.stringify(details));
   }
   if(size.width<=430&&size.height<700){
     if(details.scrollable){
       await page.locator('#home .chapter-content').evaluate(e=>{e.scrollTop=e.scrollHeight;});
       const reach=await page.evaluate(()=>{
         const s=document.querySelector('#home .chapter-content');
         const a=document.querySelector('#home .hero-secondary').getBoundingClientRect();
         const r=s.getBoundingClientRect();
         return {bottom:a.bottom,limit:r.bottom,scroll:s.scrollTop};
       });
       if(reach.bottom>reach.limit+2)issues.push(name+' cannot reach philosophy link by inner scroll '+JSON.stringify(reach));
     }
   }
   if(size.width===390&&size.height===844&&engineName==='chromium'&&process.env.SHOW_SHOTS==='1'){
     const b=await page.screenshot({type:'jpeg',quality:65});
     console.log('HERO_FIT_SCREENSHOT:'+b.toString('base64'));
   }
   if(size.width===844&&engineName==='chromium'&&process.env.SHOW_SHOTS==='1'){
     const b=await page.screenshot({type:'jpeg',quality:55});
     console.log('HERO_FIT_LANDSCAPE:'+b.toString('base64'));
   }
  }catch(e){issues.push(name+' test error '+e.message);}
  await ctx.close();
 }
 await browser.close();
}
console.log('HERO_FIT_ISSUES='+JSON.stringify(issues));
if(issues.length)process.exitCode=1;
