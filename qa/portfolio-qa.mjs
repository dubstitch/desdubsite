import { chromium, webkit } from 'playwright';
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

    if(id==='home'){
      const links=await page.evaluate(()=>{
        const first=document.querySelector('#home .cta').getBoundingClientRect();
        const second=document.querySelector('#home .hero-secondary').getBoundingClientRect();
        const overlap=Math.max(0,Math.min(first.right,second.right)-Math.max(first.left,second.left))*Math.max(0,Math.min(first.bottom,second.bottom)-Math.max(first.top,second.top));
        return {overlap:Math.round(overlap),first:{x:first.x,y:first.y,width:first.width,height:first.height},second:{x:second.x,y:second.y,width:second.width,height:second.height}};
      });
      if(links.overlap>9)issues.push('HERO LINKS OVERLAP '+theme+' '+size.name+' '+JSON.stringify(links));
    }

    for(const control of m.controls)if(control.width>0&&(control.y<m.viewport.y-5||control.bottom>m.viewport.bottom+5))issues.push('CONTROL OUTSIDE '+theme+' '+size.name+' '+id+' '+control.name);
    summary.push({theme,screen:size.name,page:id,clipped,extraHeight:Math.round(m.inner.height-m.viewport.height),widthOver:Math.max(0,m.docWidth-m.windowWidth)});
    if((theme==='light'&&size.name==='iphone'&&['home','work'].includes(id))||(theme==='light'&&size.name==='phone-landscape'&&['home','work'].includes(id))||(theme==='light'&&size.name==='phone-landscape-short'&&id==='home')||(theme==='light'&&size.name==='iphone-mini'&&id==='home')||(theme==='dark'&&size.name==='desktop'&&id==='home')){
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

  if(theme==='dark'){
    await page.goto(origin+'/index.html?universe=1',{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(70);
    const geometry=await page.evaluate(()=>{
      const universe=document.getElementById('universe');
      const hexes=[...universe.querySelectorAll('.hex')];
      const rectangles=hexes.map(el=>el.getBoundingClientRect());
      const intersects=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
      let worst=0,which='';
      for(let i=0;i<rectangles.length;i++)for(let j=i+1;j<rectangles.length;j++){
        const area=intersects(rectangles[i],rectangles[j]);
        if(area>worst){worst=area;which=(i+1)+'/'+(j+1)}
      }
      const title=universe.querySelector('.universe-title').getBoundingClientRect();
      const close=universe.querySelector('.close').getBoundingClientRect();
      return {maxTileOverlap:Math.round(worst),which,titleCloseOverlap:Math.round(intersects(title,close)),tiles:rectangles.length};
    });
    if(geometry.maxTileOverlap>40||geometry.titleCloseOverlap>10)issues.push('UNIVERSE TILE COLLISION '+size.name+' '+JSON.stringify(geometry));
    if(['iphone','phone-landscape','desktop'].includes(size.name)){
      const file=output+'/universe-'+size.name+'.jpeg';
      await page.screenshot({path:file,type:'jpeg',quality:57});
      capture['universe-'+size.name]=file;
    }
  }
  if(['iphone','phone-landscape','desktop'].includes(size.name)) {
    const nav=await page.evaluate(()=>{
      const h=document.querySelector('.site-header-shell').getBoundingClientRect();
      const actions=[...document.querySelectorAll('.site-header-shell .site-header-actions > *')].filter(x=>getComputedStyle(x).display!=='none');
      return {height:Math.round(h.height),overflow:actions.some(el=>el.getBoundingClientRect().right>innerWidth+2)};
    });
    if(nav.overflow)issues.push('HEADER NAV OVERFLOW '+theme+' '+size.name+' '+JSON.stringify(nav));
  }
  if(size.width>size.height&&size.height<680){
    const carousel=await page.evaluate(()=>{
      const frame=document.querySelector('#work .work-grid').getBoundingClientRect();
      const first=document.querySelector('#work .work-grid .work').getBoundingClientRect();
      const cards=[...document.querySelectorAll('#work .work-grid .work')];
      return {width:frame.width,firstWidth:first.width,visibleSecond:Math.max(0,Math.min(frame.right,cards[1].getBoundingClientRect().right)-Math.max(frame.left,cards[1].getBoundingClientRect().left))};
    });
    if(carousel.firstWidth<carousel.width-8||carousel.visibleSecond>8)issues.push('HOME LANDSCAPE MULTICARD '+theme+' '+size.name+' '+JSON.stringify(carousel));
  }

    const heroLink=await page.evaluate(()=>document.querySelector('#home .cta')?.getAttribute('href'));
    if(heroLink!=='case-studies.html')issues.push('HERO WORK LINK INCORRECT '+size.name+' '+heroLink);
    const starCount=await page.evaluate(()=>document.querySelectorAll('.constellation-stop-number').length);
    if(starCount!==0)issues.push('UNEXPECTED CONSTELLATION NUMBERS '+size.name+' '+starCount);
  // Regression checks for the Universe, case study links and public component lab.
  if(theme==='dark'&&['iphone','desktop'].includes(size.name)){
    await page.goto(origin+'/index.html?universe=1',{waitUntil:'domcontentloaded'});
    const state=await page.evaluate(()=>({
      visible:document.getElementById('universe')?.classList.contains('open'),
      tiles:document.querySelectorAll('#universe .hex').length,
      lab:!!document.querySelector('#universe .hex[data-href="component-lab.html"]'),
      cards:document.querySelectorAll('.work').length,
      modals:document.querySelectorAll('.work-dialog').length
    }));
    if(!state.visible||state.tiles!==7||!state.lab||state.cards!==3||state.modals)issues.push('UNIVERSE REGRESSION '+size.name+' '+JSON.stringify(state));
    await page.locator('#universe .hex[data-href="component-lab.html"]').click();
    await page.waitForURL('**/component-lab.html');
    if(!await page.locator('.lab-note').isVisible())issues.push('MISSING PUBLIC LAB NOTE '+size.name);
    await page.getByRole('link',{name:'Universe'}).click();
    // The homepage intentionally removes the one-time universe query after opening.
    await page.locator('#universe.open').waitFor({state:'visible',timeout:10000});
    if(!await page.locator('#universe.open').isVisible())issues.push('BROKEN LAB RETURN TO UNIVERSE '+size.name);
  }
  await page.goto(origin+'/resume.html',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(70);
  const footer=await page.evaluate(()=>{
   const f=document.querySelector('.site-footer'),links=[...document.querySelectorAll('.site-footer-links a')];
   const r=f.getBoundingClientRect();
   return {width:r.width,docWidth:document.documentElement.scrollWidth,windowWidth:innerWidth,links:links.map(a=>{const b=a.getBoundingClientRect();return {width:b.width,height:b.height}})};
  });

  if(theme==='light'&&['iphone','phone-landscape'].includes(size.name)){
    const file=output+'/resume-top-'+size.name+'.jpeg';
    await page.screenshot({path:file,type:'jpeg',quality:55});
    capture['resume-top-'+size.name]=file;
  }
  const introGap=await page.evaluate(()=>{
    const header=document.querySelector('body > header').getBoundingClientRect();
    const intro=document.querySelector('.resume-intro');
    const eyebrow=intro.querySelector('.eyebrow').getBoundingClientRect();
    return {gap:Math.round(eyebrow.top-header.bottom),margin:getComputedStyle(intro).marginTop};
  });
  if(introGap.gap>65)issues.push('RESUME INTRO TOO LOW '+theme+' '+size.name+' '+JSON.stringify(introGap));
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
   await page.locator('.site-footer').screenshot({path:file,type:'jpeg',quality:55});
   capture['resume-footer-dark-iphone']=file;
  }
  await page.goto(origin+'/case-studies.html?project=anniversary#gallery',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(130);
  const gallery=await page.evaluate(()=>{
    const box=(e)=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,width:r.width,height:r.height}};
    return {width:document.documentElement.scrollWidth,client:innerWidth,head:box(document.querySelector('.site-header')),shell:box(document.querySelector('.gallery-shell')),frame:box(document.querySelector('.gallery-frame')),panel:box(document.querySelector('.work-panel')),controls:box(document.querySelector('.gallery-controls'))}
  });

  if(theme==='light'&&size.name==='phone-landscape'){
    const file=output+'/gallery-landscape.jpeg';
    await page.screenshot({path:file,type:'jpeg',quality:57});
    capture['gallery-landscape']=file;
  }
  if(size.width>size.height){
    const position=await page.evaluate(()=>{
      const frame=document.querySelector('.gallery-frame').getBoundingClientRect();
      const first=document.querySelector('.work-panel').getBoundingClientRect();
      return {left:Math.round(first.left-frame.left),right:Math.round(frame.right-first.right),frameWidth:Math.round(frame.width),panelWidth:Math.round(first.width)};
    });
    if(position.left<-4||position.right<-4)issues.push('GALLERY FIRST PANEL CROPPED '+theme+' '+size.name+' '+JSON.stringify(position));
  }
  if(gallery.width>gallery.client+2)issues.push('GALLERY HORIZONTAL OVERFLOW '+theme+' '+size.name);
  if(gallery.panel.bottom>gallery.controls.top+8)issues.push('GALLERY PANEL-CONTROLS OVERLAP '+theme+' '+size.name+' '+JSON.stringify(gallery));
  // Two main destinations with a shared footer below the gallery.
  const flow=await page.evaluate(()=>{
    const intro=document.getElementById('gallery-intro');
    const destination=document.getElementById('gallery');
    const footer=document.getElementById('more');
    const snap=getComputedStyle(document.documentElement).scrollSnapType;
    const d=destination.getBoundingClientRect(),f=footer.getBoundingClientRect();
    return {
      snap,introSnap:getComputedStyle(intro).scrollSnapAlign,
      gallerySnap:getComputedStyle(destination).scrollSnapAlign,
      galleryHeight:Math.round(d.height),
      visibleHeight:innerHeight-document.querySelector('.site-header').getBoundingClientRect().height,
      cardHeight:Math.round(document.querySelector('.gallery-frame').getBoundingClientRect().height),
      footerInside:destination.contains(footer),
      footerTopRelative:Math.round(f.top-d.top),
      footerBottomRelative:Math.round(f.bottom-d.top),
      invitationBottomSpace:Math.round(f.top-d.bottom),
      removedCue:!document.querySelector('.gallery-scroll-cue'),
      removedAxis:!document.querySelector('.gallery-axis'),
      sections:document.querySelectorAll('main > section').length
    };
  });
  if(flow.sections!==2||flow.footerInside||!flow.removedCue||!flow.removedAxis||
    flow.snap!=='none')
    issues.push('CASE TWO SECTION FLOW '+theme+' '+size.name+' '+JSON.stringify(flow));
  if(flow.invitationBottomSpace< -3)
    issues.push('CASE INVITATION OVERLAPS GALLERY '+theme+' '+size.name+' '+JSON.stringify(flow));
  // A short gallery crushed the cards and pinned the invitation to the bottom.
  if(flow.galleryHeight<flow.visibleHeight+65||
     flow.cardHeight<(size.width>size.height?265:400))
    issues.push('CASE GALLERY CRAMPED '+theme+' '+size.name+' '+JSON.stringify(flow));

  if(theme==='light'&&size.name==='iphone'){
    const file=output+'/gallery-light-iphone.jpeg';await page.screenshot({path:file,type:'jpeg',quality:55});capture['gallery-light-iphone']=file;
  }
  if(['iphone','desktop'].includes(size.name)){
    try{
      const violations=(await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze()).violations;
      for(const v of violations){issues.push('AXE '+theme+' '+size.name+' case-gallery '+v.id+' ('+v.impact+') '+v.nodes.length+' '+v.nodes.slice(0,2).map(n=>n.target.join(' ')).join(','));}
    }catch(e){issues.push('AXE ERROR '+e.message)}
  }

  // Snap to the second destination, confirm the shared invitation footer follows it,
  // and ensure vertical scroll inside a project is independent of page snapping.
  if(theme==='light'&&['iphone','phone-landscape','desktop'].includes(size.name)){
    await page.evaluate(()=>document.getElementById('gallery').scrollIntoView({behavior:'instant',block:'start'}));
    await page.waitForTimeout(200);
    const landing=await page.evaluate(()=>{
      const shell=document.getElementById('gallery').getBoundingClientRect();
      const footer=document.getElementById('more').getBoundingClientRect();
      const header=document.querySelector('.site-header').getBoundingClientRect();
      return {
        shellTop:Math.round(shell.top),
        footerBottom:Math.round(footer.bottom),
        viewportHeight:innerHeight,
        headerHeight:Math.round(header.height),
        scrollY:Math.round(scrollY)
      };
    });
    if(landing.scrollY<30||landing.shellTop>landing.headerHeight+20||
landing.footerBottom<landing.viewportHeight+40)
      issues.push('CASE TWO SECTION LANDING '+size.name+' '+JSON.stringify(landing));
    // A real vertical wheel/trackpad gesture should settle at the gallery snap point.
    if(size.name==='desktop'){
      await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
      await page.waitForTimeout(250);
      await page.mouse.move(80,200);
      await page.mouse.wheel(0,Math.round(size.height*.85));
      await page.waitForTimeout(950);
      const snapLanding=await page.evaluate(()=>{
        const el=document.getElementById('gallery').getBoundingClientRect();
        const header=document.querySelector('.site-header').getBoundingClientRect();
        return {galleryTop:Math.round(el.top),headerHeight:Math.round(header.height),scrollY:Math.round(scrollY)};
      });
      if(Math.abs(snapLanding.galleryTop-snapLanding.headerHeight)>32)
        issues.push('CASE VERTICAL GESTURE DOES NOT SNAP '+size.name+' '+JSON.stringify(snapLanding));
      await page.evaluate(()=>document.getElementById('gallery').scrollIntoView({behavior:'instant',block:'start'}));
      await page.waitForTimeout(170);
    }
    // Trigger the internal scroller, which should not force the parent to another section.
    await page.locator('.work-panel:first-child .panel-scroller').evaluate(el=>el.scrollTop=140);
    await page.waitForTimeout(160);
    const after=await page.evaluate(()=>({
      scrollY:Math.round(scrollY),
      panelScroll:document.querySelector('.work-panel:first-child .panel-scroller').scrollTop
    }));
    if(after.panelScroll<15||Math.abs(after.scrollY-landing.scrollY)>30)
      issues.push('CASE INTERNAL SCROLL ESCAPE '+size.name+' '+JSON.stringify({landing,after}));
    // A snap destination taller than the screen must still let the visitor reach
    // the invitation footer outside it.
    await page.evaluate(()=>window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
    await page.waitForTimeout(180);
    const endPosition=await page.evaluate(()=>{
      const section=document.getElementById('gallery').getBoundingClientRect();
      const footer=document.getElementById('more').getBoundingClientRect();
      return {
        footerTop:Math.round(footer.top),
        footerBottom:Math.round(footer.bottom),
        sectionBottom:Math.round(section.bottom),
        bottomSpace:Math.round(section.bottom-footer.bottom),
        viewportHeight:innerHeight,
        scrollY:Math.round(scrollY)
      };
    });
    if(endPosition.footerTop>=endPosition.viewportHeight-30||
       endPosition.footerBottom>endPosition.viewportHeight+5||
        endPosition.sectionBottom>endPosition.footerTop+4||endPosition.scrollY<=landing.scrollY)
      issues.push('CASE FOOTER UNREACHABLE AT SNAP END '+size.name+' '+JSON.stringify(endPosition));
    if(size.name==='iphone'){
      const file=output+'/gallery-footer-visible-iphone.jpeg';
      await page.screenshot({path:file,type:'jpeg',quality:55});
      capture['gallery-footer-visible-iphone']=file;
    }
  }
  if(theme==='light'&&['iphone','desktop'].includes(size.name)){
    await page.goto(origin+'/component-lab.html',{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(80);
    const lab=await page.evaluate(()=>({
      noteBackground:getComputedStyle(document.querySelector('.lab-note')).backgroundColor,
      noteColor:getComputedStyle(document.querySelector('.lab-note p')).color,
      cardBackground:getComputedStyle(document.querySelector('.component')).backgroundImage,
      cardText:getComputedStyle(document.querySelector('.component h2')).color
    }));
    try{
      const violations=(await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze()).violations;
      for(const v of violations)issues.push('LAB LIGHT AXE '+size.name+' '+v.id+' '+v.impact+' '+v.nodes.length+' '+v.nodes.slice(0,2).map(n=>n.target.join(' ')).join(','));
    }catch(e){issues.push('LAB LIGHT AXE ERROR '+size.name+' '+e.message)}
    if(size.name==='iphone'){
      const file=output+'/lab-light-iphone.jpeg';
      await page.locator('.lab-note').screenshot({path:file,type:'jpeg',quality:56});
      capture['lab-light-iphone']=file;
    }
    summary.push({theme,screen:size.name,page:'component-lab',...lab});
  }
  await context.close();
 }
}
await browser.close();
/* Separate WebKit pass catches Safari-style viewport, scrolling and font metrics. */
const safari=await webkit.launch({headless:true});
for(const theme of ['light','dark']){
 for(const size of [
  {name:'webkit-mini',width:320,height:568},
  {name:'webkit-iphone',width:390,height:844},
  {name:'webkit-iphone-landscape',width:844,height:390},
  {name:'webkit-tablet',width:768,height:1024},
  {name:'webkit-desktop',width:1440,height:900}
 ]){
  const context=await safari.newContext({viewport:{width:size.width,height:size.height},deviceScaleFactor:1,isMobile:size.width<500,hasTouch:size.width<500,reducedMotion:'reduce'});
  await context.addInitScript(theme=>localStorage.setItem('des-theme',theme),theme);
  const page=await context.newPage();
  page.on('pageerror',err=>issues.push('WEBKIT JS '+theme+' '+size.name+' '+err.message));
  await page.goto(origin+'/index.html#home',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(140);
  for(const id of ['home','work','story','approach','contact']){
    const m=await page.evaluate(id=>{
      const chapters=[...document.querySelectorAll('.chapter')];
      const i=chapters.findIndex(el=>el.id===id);
      chapters.forEach((el,n)=>{el.classList.toggle('is-revealed',i===n);el.inert=i!==n});
      document.getElementById('chapters').scrollTop=chapters[i].offsetTop;
      const frame=chapters[i].querySelector('.chapter-content').getBoundingClientRect();
      const box=chapters[i].querySelector('.chapter-content-inner').getBoundingClientRect();
      return {clipped:box.top<frame.top-2||box.bottom>frame.bottom+2,extraHeight:Math.round(box.height-frame.height),widthOver:Math.max(0,document.documentElement.scrollWidth-innerWidth)};
    },id);
    if(m.clipped)issues.push('WEBKIT CLIPPED '+theme+' '+size.name+' '+id+' '+m.extraHeight);
    if(m.widthOver>2)issues.push('WEBKIT HORIZONTAL PAGE OVERFLOW '+theme+' '+size.name+' '+id+' '+m.widthOver);
    summary.push({theme,screen:size.name,page:id,...m});
    if(theme==='light'&&size.name==='webkit-iphone-landscape'&&id==='work'){
      const file=output+'/webkit-light-landscape-work.jpeg';
      await page.screenshot({path:file,type:'jpeg',quality:58});capture['webkit-light-landscape-work']=file;
    }
    if(theme==='light'&&size.name==='webkit-iphone'&&id==='home'){
      const file=output+'/webkit-light-iphone-home.jpeg';
      await page.screenshot({path:file,type:'jpeg',quality:58});capture['webkit-light-iphone-home']=file;
    }
  }
  await page.goto(origin+'/resume.html',{waitUntil:'domcontentloaded'});
  const footerHeights=await page.locator('.site-footer-links a').evaluateAll(elements=>elements.map(el=>el.getBoundingClientRect().height));
  if(footerHeights.some(h=>h>80))issues.push('WEBKIT RESUME FOOTER STRETCHED '+theme+' '+size.name+' '+footerHeights);
  await page.goto(origin+'/case-studies.html?project=anniversary#gallery',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(100);
  const overlapping=await page.evaluate(()=>{
    const panel=document.querySelector('.work-panel').getBoundingClientRect();
    const controls=document.querySelector('.gallery-controls').getBoundingClientRect();
    return panel.bottom>controls.top+8;
  });
  if(overlapping)issues.push('WEBKIT GALLERY PANEL-CONTROLS OVERLAP '+theme+' '+size.name);
  const safariSnap=await page.evaluate(()=>{
    const intro=document.getElementById('gallery-intro');
    const project=document.getElementById('gallery');
    const footer=document.getElementById('more');
    const card=document.querySelector('.gallery-frame');
    const bottom=footer.getBoundingClientRect().top-project.getBoundingClientRect().bottom;
    return {
      snap:getComputedStyle(document.documentElement).scrollSnapType,
      intro:getComputedStyle(intro).scrollSnapAlign,
      gallery:getComputedStyle(project).scrollSnapAlign,
      projectHeight:project.getBoundingClientRect().height,
      cardHeight:card.getBoundingClientRect().height,
      bottomGap:bottom,
      viewportHeight:innerHeight
    };
  });
  if(safariSnap.snap!=='none'||safariSnap.bottomGap< -3)
    issues.push('WEBKIT CASE NAV OR BOTTOM GAP '+theme+' '+size.name+' '+JSON.stringify(safariSnap));
  if(theme==='light'&&size.name==='webkit-iphone'){
    const file=output+'/webkit-case-study-snap-iphone.jpeg';
    await page.screenshot({path:file,type:'jpeg',quality:59});
    capture['webkit-case-study-snap-iphone']=file;
  }
  await context.close();
 }
}
await safari.close();
console.log('QA_SUMMARY='+JSON.stringify(summary));
console.log('QA_ISSUES='+JSON.stringify(issues));
for(const [name,path] of Object.entries(capture)){
  const bytes=await fs.readFile(path);
  console.log('SCREENSHOT_BEGIN '+name+' '+bytes.toString('base64')+' SCREENSHOT_END');
}
console.log('QA_TOTAL_ISSUES='+issues.length);
if(issues.some(x=>/^(CONTROL OUTSIDE|JS |CLIPPED |HORIZONTAL|RESUME FOOTER STRETCHED|GALLERY PANEL|UNIVERSE REGRESSION|MISSING PUBLIC LAB NOTE|BROKEN LAB RETURN|HERO LINKS OVERLAP|UNIVERSE TILE COLLISION|HERO WORK LINK INCORRECT|UNEXPECTED CONSTELLATION NUMBERS|RESUME INTRO TOO LOW|GALLERY FIRST PANEL CROPPED|HEADER NAV OVERFLOW|HOME LANDSCAPE MULTICARD|CASE TWO SECTION FLOW|CASE INVITATION OVERLAPS GALLERY|CASE TWO SECTION LANDING|CASE INTERNAL SCROLL ESCAPE|CASE GALLERY CRAMPED|CASE VERTICAL GESTURE DOES NOT SNAP|CASE FOOTER UNREACHABLE AT SNAP END|WEBKIT CASE NAV OR BOTTOM GAP|LAB LIGHT AXE)/.test(x)))process.exitCode=1;
