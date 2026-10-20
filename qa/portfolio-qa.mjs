import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';

const origin='http://127.0.0.1:8765';
const sizes=[
 {name:'iphone-mini',width:320,height:568},
 {name:'iphone-se',width:375,height:667},
 {name:'iphone-compact',width:360,height:640},
 {name:'iphone',width:390,height:844},
 {name:'iphone-large',width:430,height:932},
 {name:'phone-landscape',width:844,height:390},
 {name:'phone-landscape-short',width:667,height:375},
 {name:'phone-landscape-wide',width:896,height:414},
 {name:'tablet',width:768,height:1024},
 {name:'tablet-landscape',width:1024,height:768},
 {name:'short-laptop',width:1024,height:600},
 {name:'desktop',width:1440,height:900},
 {name:'large-desktop',width:1920,height:1080}
];
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const issues=[];
const summary=[];
const output='/tmp/portfolio-visual';
await fs.mkdir(output,{recursive:true});
const capture={};
for(const theme of ['light','dark']){
 for(const size of sizes){
  const context=await browser.newContext({viewport:{width:size.width,height:size.height},deviceScaleFactor:1,isMobile:size.width<500,hasTouch:size.width<500,reducedMotion:'reduce'});
  await context.addInitScript(theme=>localStorage.setItem('des-theme',theme),theme);
  const page=await context.newPage();
  page.on('pageerror',e=>issues.push('JS '+theme+' '+size.name+': '+e.message));
  await page.goto(origin+'/index.html#home',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(150);
  for(const id of ['home','work','story','approach','contact']){
    await page.evaluate(id=>{const pages=[...document.querySelectorAll('.chapter')],surface=document.getElementById('chapters'),index=pages.findIndex(p=>p.id===id);pages.forEach((p,i)=>{p.classList.toggle('is-revealed',i===index);p.inert=i!==index});surface.scrollTop=pages[index].offsetTop;},id);
    await page.waitForTimeout(70);
    const m=await page.evaluate(id=>{
      const chapter=document.getElementById(id);
      const inner=chapter.querySelector('.chapter-content-inner');
      const viewport=chapter.querySelector('.chapter-content');
      const bounds=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right}};
      const c=bounds(viewport),i=bounds(inner),v=bounds(chapter);
      const controls=[...inner.querySelectorAll('a,button')].map(el=>({name:el.textContent.trim().slice(0,30),...bounds(el)}));
      return {chapter:id,viewport:c,inner:i,chapterRect:v,innerScrollHeight:viewport.scrollHeight,innerClientHeight:viewport.clientHeight,docWidth:document.documentElement.scrollWidth,windowWidth:innerWidth,controls};
    },id);
    const clipped=m.inner.y<m.viewport.y-2||m.inner.bottom>m.viewport.bottom+2;
    if(clipped)issues.push('CLIPPED '+theme+' '+size.name+' '+id+' '+JSON.stringify({inner:m.inner,viewport:m.viewport}));
    if(m.docWidth>m.windowWidth+2)issues.push('HORIZONTAL PAGE OVERFLOW '+theme+' '+size.name+' '+id+' '+m.docWidth+'/'+m.windowWidth);
    for(const control of m.controls)if(control.width>0&&(control.y<m.viewport.y-5||control.bottom>m.viewport.bottom+5))issues.push('CONTROL OUTSIDE '+theme+' '+size.name+' '+id+' '+control.name);
    summary.push({theme,screen:size.name,page:id,clipped,extraHeight:Math.round(m.inner.height-m.viewport.height),widthOver:Math.max(0,m.docWidth-m.windowWidth)});
    if((theme==='light'&&size.name==='iphone'&&['home','work'].includes(id))||(theme==='light'&&size.name==='phone-landscape'&&id==='work')||(theme==='light'&&size.name==='iphone-mini'&&id==='home')||(theme==='dark'&&size.name==='desktop'&&id==='home')){
      const name=theme+'-'+size.name+'-'+id;
      const file=output+'/'+name+'.jpeg';
      await page.screenshot({path:file,type:'jpeg',quality:56,fullPage:false});
      capture[name]=file;
    }
  }
  if(['iphone','desktop'].includes(size.name)){
    for(const section of ['home','work']){
      await page.goto(origin+'/index.html#'+section,{waitUntil:'domcontentloaded'});
      await page.waitForTimeout(170);
      try{
        const violations=(await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze()).violations;
        for(const v of violations)issues.push('AXE '+theme+' '+size.name+' homepage-'+section+' '+v.id+' ('+v.impact+') '+v.nodes.length+' '+v.nodes.slice(0,2).map(n=>n.target.join(' ')).join(','));
      }catch(e){issues.push('AXE ERROR '+theme+' '+size.name+' homepage-'+section+' '+e.message)}
    }
  }
  await page.goto(origin+'/resume.html',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(70);
  const footer=await page.evaluate(()=>{
   const f=document.querySelector('.resume-footer'),links=[...document.querySelectorAll('.resume-footer-links a')];
   const r=f.getBoundingClientRect();
   return {width:r.width,docWidth:document.documentElement.scrollWidth,windowWidth:innerWidth,links:links.map(a=>{const b=a.getBoundingClientRect();return {width:b.width,height:b.height}})};
  });
  if(footer.docWidth>footer.windowWidth+2)issues.push('RESUME HORIZONTAL OVERFLOW '+theme+' '+size.name+' '+footer.docWidth);
  if(footer.links.some(l=>l.height>80))issues.push('RESUME FOOTER STRETCHED '+theme+' '+size.name+' '+JSON.stringify(footer.links));
  if(['iphone','desktop'].includes(size.name)){
    try{
      const violations=(await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze()).violations;
      for(const v of violations)issues.push('AXE '+theme+' '+size.name+' résumé '+v.id+' ('+v.impact+') '+v.nodes.length+' '+v.nodes.slice(0,2).map(n=>n.target.join(' ')).join(','));
    }catch(e){issues.push('AXE ERROR '+theme+' '+size.name+' résumé '+e.message)}
  }
  if(theme==='dark'&&size.name==='iphone'){
   const file=output+'/resume-footer-dark-iphone.jpeg';
   await page.locator('.resume-footer').screenshot({path:file,type:'jpeg',quality:55});
   capture['resume-footer-dark-iphone']=file;
  }
  await page.goto(origin+'/case-studies.html?project=anniversary#gallery',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(130);
  const gallery=await page.evaluate(()=>{
    const box=(e)=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,width:r.width,height:r.height}};
    return {width:document.documentElement.scrollWidth,client:innerWidth,head:box(document.querySelector('.site-header')),shell:box(document.querySelector('.gallery-shell')),frame:box(document.querySelector('.gallery-frame')),panel:box(document.querySelector('.work-panel')),controls:box(document.querySelector('.gallery-controls'))}
  });
  if(gallery.width>gallery.client+2)issues.push('GALLERY HORIZONTAL OVERFLOW '+theme+' '+size.name);
  if(gallery.panel.bottom>gallery.controls.top+8)issues.push('GALLERY PANEL-CONTROLS OVERLAP '+theme+' '+size.name+' '+JSON.stringify(gallery));
  if(theme==='light'&&size.name==='iphone'){
    const file=output+'/gallery-light-iphone.jpeg';await page.screenshot({path:file,type:'jpeg',quality:55});capture['gallery-light-iphone']=file;
  }
  if(['iphone','desktop'].includes(size.name)){
    try{
      const violations=(await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze()).violations;
      for(const v of violations){issues.push('AXE '+theme+' '+size.name+' case-gallery '+v.id+' ('+v.impact+') '+v.nodes.length+' '+v.nodes.slice(0,2).map(n=>n.target.join(' ')).join(','));}
    }catch(e){issues.push('AXE ERROR '+e.message)}
  }
  await context.close();
 }
}
await browser.close();
console.log('QA_SUMMARY='+JSON.stringify(summary));
console.log('QA_ISSUES='+JSON.stringify(issues));
for(const [name,path] of Object.entries(capture)){
  const bytes=await fs.readFile(path);
  console.log('SCREENSHOT_BEGIN '+name+' '+bytes.toString('base64')+' SCREENSHOT_END');
}
console.log('QA_TOTAL_ISSUES='+issues.length);
if(issues.some(x=>x.startsWith('JS ')||x.startsWith('CLIPPED ')||x.startsWith('HORIZONTAL')||x.startsWith('RESUME FOOTER STRETCHED')||x.startsWith('GALLERY PANEL')))process.exitCode=1;
