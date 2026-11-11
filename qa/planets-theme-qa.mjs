import {chromium,webkit} from 'playwright';
const sizes=[
 {name:'small-portrait',width:320,height:568},
 {name:'iphone',width:390,height:844},
 {name:'large-phone',width:430,height:932},
 {name:'phone-landscape',width:844,height:390},
 {name:'short-landscape',width:667,height:320},
 {name:'tablet',width:768,height:1024},
 {name:'desktop',width:1440,height:900}
];
const issues=[];
const fail=(label,msg)=>issues.push(label+' '+msg);
const intersects=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
for(const [browserName,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch({headless:true});
 for(const size of sizes){
  const context=await browser.newContext({
   viewport:{width:size.width,height:size.height},
   isMobile:size.width<600,hasTouch:size.width<600,
   reducedMotion:'reduce'
  });
  const page=await context.newPage();
  page.on('pageerror',err=>fail(browserName+' '+size.name,'JS '+err.message));
  for(const theme of ['dark','light']){
   const where=browserName+' '+size.name+' '+theme;
   try{
    await page.goto('http://127.0.0.1:8765/index.html',{waitUntil:'networkidle'});
    await page.evaluate(mode=>{localStorage.setItem('des-theme',mode);},theme);
    await page.reload({waitUntil:'networkidle'});
    const toggle=page.locator('[data-theme-toggle]').first();
    const themeMarkup=await toggle.evaluate(el=>{
      const b=el.getBoundingClientRect();
      return {label:el.getAttribute('aria-label'),orbit:!!el.querySelector('.theme-orbit'),
       sun:!!el.querySelector('.theme-glyph--sun'),moon:!!el.querySelector('.theme-glyph--moon'),
       left:b.left,right:b.right,top:b.top,bottom:b.bottom,viewport:innerWidth,
       width:b.width,height:b.height};
    });
    if(!themeMarkup.orbit||!themeMarkup.sun||!themeMarkup.moon||
       themeMarkup.right>themeMarkup.viewport+2||themeMarkup.left<0||themeMarkup.width<32)
       fail(where,'theme control out of viewport or icon missing '+JSON.stringify(themeMarkup));
    if(themeMarkup.label!==(theme==='dark'?'Switch to light mode':'Switch to dark mode'))
       fail(where,'wrong toggle accessible action '+JSON.stringify(themeMarkup));
    await page.goto('http://127.0.0.1:8765/index.html?universe=1',{waitUntil:'networkidle'});
    await page.locator('#universe.open').waitFor({state:'visible'});
    const metrics=await page.evaluate(()=>{
      const universe=document.querySelector('#universe');
      const nodes=[...universe.querySelectorAll('.planet')];
      const sphere=universe.querySelector('.planet-sphere');
      const title=universe.querySelector('.universe-title').getBoundingClientRect();
      const close=universe.querySelector('.close').getBoundingClientRect();
      const rects=nodes.map(el=>{
        const r=el.getBoundingClientRect();
        const sr=el.querySelector('.planet-sphere').getBoundingClientRect();
        return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height,
          sphereDiameter:sr.width, label:el.querySelector('strong').textContent,
          visible:getComputedStyle(el).visibility,href:el.dataset.href,target:el.dataset.target};
      });
      return {rects,title:{left:title.left,right:title.right,top:title.top,bottom:title.bottom},
        close:{left:close.left,right:close.right,top:close.top,bottom:close.bottom},
        count:nodes.length,
        visibility:getComputedStyle(universe).visibility,
        overflow:document.documentElement.scrollWidth-innerWidth,
        width:innerWidth,height:innerHeight,
        oldHex:universe.querySelectorAll('.hex').length,
        ring:getComputedStyle(universe.querySelector('.planet--cases .planet-sphere'),'::before').content
      };
    });
    if(metrics.count!==7||metrics.oldHex||metrics.visibility!=='visible'||metrics.ring==='none')
      fail(where,'planet inventory or ring missing '+JSON.stringify(metrics));
    if(metrics.overflow>3)fail(where,'horizontal scroll overflow '+JSON.stringify(metrics));
    for(let i=0;i<metrics.rects.length;i++){
      const r=metrics.rects[i];
      if(r.left<-2||r.right>metrics.width+2||r.top<0||r.bottom>metrics.height+2||
         r.sphereDiameter<35||r.visible!=='visible'){
        fail(where,'planet clipped '+(i+1)+' '+JSON.stringify(r)+' screen '+metrics.width+'x'+metrics.height);
      }
      for(let j=i+1;j<metrics.rects.length;j++){
        if(intersects(r,metrics.rects[j])>60)
          fail(where,'planets collide '+(i+1)+' and '+(j+1));
      }
    }
    if(intersects(metrics.title,metrics.close)>12)fail(where,'title overlaps close');
    if(intersects(metrics.title,metrics.rects[0])>50)fail(where,'title overlaps first planet');
    if(browserName==='chromium'&&theme==='dark'&&
       ['iphone','phone-landscape','desktop'].includes(size.name)&&process.env.SHOW_SHOTS==='1'){
      const shot=await page.screenshot({type:'jpeg',quality:55});
      console.log('PLANET_SHOT:'+size.name+':'+shot.toString('base64'));
    }
    await page.keyboard.press('Escape');
    if(await page.locator('#universe.open').count())
      fail(where,'Escape failed to close universe');
    const before=await page.evaluate(()=>document.documentElement.dataset.theme);
    await toggle.click();
    const after=await page.evaluate(()=>document.documentElement.dataset.theme);
    if(after===before)fail(where,'theme toggle did not change theme');
   }catch(e){fail(where,'test error '+e.message)}
  }
  await context.close();
 }
 await browser.close();
}
console.log('PLANETS_THEME_ISSUES='+JSON.stringify(issues));
if(issues.length)process.exitCode=1;
