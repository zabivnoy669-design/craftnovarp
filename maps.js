"use strict";
(()=>{
 const $=id=>document.getElementById(id);
 const MAPS={
  'fort-zancudo':{
   width:2048,height:1792,image:'assets/maps/fort-zancudo.webp',focus:{x:1072,y:1024},
   key:'nova-pedia-map-fort-zancudo-v2',legacyKey:'nova-pedia-map-fort-zancudo-v1',
   alt:'Карта района Форт Занкудо из GTA V, повышенная детализация'
  },
  'federal-prison':{
   width:1536,height:1536,image:'assets/maps/federal-prison.webp?v=2',focus:{x:800,y:760},fitWidth:1050,initialMaxScale:1,
   key:'nova-pedia-map-federal-prison-v2',legacyKey:'nova-pedia-map-federal-prison-v1',migration:{factor:2,dx:-256,dy:-512},
   alt:'Карта федеральной тюрьмы Болингброк из GTA V, повышенная детализация'
  }
 };
 const viewport=$('mapViewport'),world=$('mapWorld'),image=$('mapImage'),canvas=$('drawingCanvas'),ctx=canvas.getContext('2d');
 const urlMap=new URLSearchParams(location.search).get('map');
 if(urlMap&&MAPS[urlMap])$('mapSelect').value=urlMap;
 let currentMap=MAPS[$('mapSelect').value]||MAPS['fort-zancudo'];
 if(currentMap!==MAPS['fort-zancudo']){
  image.src=currentMap.image;image.alt=currentMap.alt;image.width=currentMap.width;image.height=currentMap.height;
  canvas.width=currentMap.width;canvas.height=currentMap.height;
  world.style.width=`${currentMap.width}px`;world.style.height=`${currentMap.height}px`;
  image.style.width=`${currentMap.width}px`;image.style.height=`${currentMap.height}px`;
  canvas.style.width=`${currentMap.width}px`;canvas.style.height=`${currentMap.height}px`;
 }
 let strokes=[],mode='pan',color='#ff4c55',scale=1,tx=0,ty=0,active=null,gesture=null,previousSize=null;
 function sanitize(list){return Array.isArray(list)?list.filter(s=>s&&typeof s.size==='number'&&((Array.isArray(s.points)&&s.points.length)||(['arrow','circle'].includes(s.kind)&&s.start&&s.end))):[];}
 function loadStrokes(map){
  try{
   const current=localStorage.getItem(map.key),legacy=current===null&&map.legacyKey?localStorage.getItem(map.legacyKey):null;
   let saved=sanitize(JSON.parse(current??legacy??'[]'));
   if(current===null&&legacy!==null){
    const m=map.migration||{factor:4,dx:-768,dy:-1536};
    saved=saved.map(s=>{const migrated={...s,size:s.size*m.factor};if(Array.isArray(s.points))migrated.points=s.points.map(p=>({x:p.x*m.factor+m.dx,y:p.y*m.factor+m.dy}));if(s.start){migrated.start={x:s.start.x*m.factor+m.dx,y:s.start.y*m.factor+m.dy};migrated.end={x:s.end.x*m.factor+m.dx,y:s.end.y*m.factor+m.dy};}return migrated;});
    localStorage.setItem(map.key,JSON.stringify(saved));
   }
   return saved;
  }catch{return[];}
 }
 strokes=loadStrokes(currentMap);
 function status(text,good=true){const n=$('saveStatus');n.textContent=text;n.style.color=good?'#90c4a7':'#e5a193';}
 function save(){try{localStorage.setItem(currentMap.key,JSON.stringify(strokes));status('Сохранено в этом браузере');}catch{status('Не удалось сохранить: память браузера заполнена',false);}}
 function point(e){const r=viewport.getBoundingClientRect();return{x:(e.clientX-r.left-tx)/scale,y:(e.clientY-r.top-ty)/scale};}
 function draw(){
  ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,currentMap.width,currentMap.height);
  for(const s of strokes){
   if(!s)continue;ctx.globalCompositeOperation=s.erase?'destination-out':'source-over';ctx.strokeStyle=s.color||'#ff4c55';ctx.fillStyle=s.color||'#ff4c55';ctx.lineWidth=s.size||5;ctx.lineCap='round';ctx.lineJoin='round';
   if(s.kind==='arrow'&&s.start&&s.end){
    const dx=s.end.x-s.start.x,dy=s.end.y-s.start.y,len=Math.hypot(dx,dy);if(len<.5)continue;
    const angle=Math.atan2(dy,dx),head=Math.min(len*.55,Math.max(12,(s.size||5)*3.5));
    ctx.beginPath();ctx.moveTo(s.start.x,s.start.y);ctx.lineTo(s.end.x,s.end.y);ctx.stroke();
    ctx.beginPath();ctx.moveTo(s.end.x,s.end.y);ctx.lineTo(s.end.x-head*Math.cos(angle-.48),s.end.y-head*Math.sin(angle-.48));ctx.lineTo(s.end.x-head*Math.cos(angle+.48),s.end.y-head*Math.sin(angle+.48));ctx.closePath();ctx.fill();continue;
   }
   if(s.kind==='circle'&&s.start&&s.end){const radius=Math.hypot(s.end.x-s.start.x,s.end.y-s.start.y);ctx.beginPath();ctx.arc(s.start.x,s.start.y,radius,0,Math.PI*2);ctx.stroke();continue;}
   if(!Array.isArray(s.points)||!s.points.length)continue;
   if(s.points.length===1){ctx.beginPath();ctx.arc(s.points[0].x,s.points[0].y,Math.max(1,(s.size||5)/2),0,Math.PI*2);ctx.fill();continue;}
   ctx.beginPath();ctx.moveTo(s.points[0].x,s.points[0].y);for(let i=1;i<s.points.length;i++)ctx.lineTo(s.points[i].x,s.points[i].y);ctx.stroke();
  }
  ctx.restore();
 }
 function updateZoomControls(){$('zoomIn').disabled=scale>=.999;$('zoomOut').disabled=scale<=.181;}
 function apply(){world.style.transform=`translate(${tx}px,${ty}px) scale(${scale})`;updateZoomControls();}
 function initialView(){const r=viewport.getBoundingClientRect();scale=Math.min(currentMap.initialMaxScale||.8,Math.max(.18,r.width/(currentMap.fitWidth||1500)));tx=r.width/2-currentMap.focus.x*scale;ty=r.height/2-currentMap.focus.y*scale;apply();}
 function resize(){const r=viewport.getBoundingClientRect();if(!r.width||!r.height)return;if(!previousSize){initialView();}else{const cx=(previousSize.w/2-tx)/scale,cy=(previousSize.h/2-ty)/scale;tx=r.width/2-cx*scale;ty=r.height/2-cy*scale;apply();}previousSize={w:r.width,h:r.height};}
 function changeMap(id){
  const next=MAPS[id];if(!next||next===currentMap)return;
  currentMap=next;strokes=loadStrokes(currentMap);active=null;gesture=null;previousSize=null;
  image.src=currentMap.image;image.alt=currentMap.alt;image.width=currentMap.width;image.height=currentMap.height;
  canvas.width=currentMap.width;canvas.height=currentMap.height;
  world.style.width=`${currentMap.width}px`;world.style.height=`${currentMap.height}px`;
  image.style.width=`${currentMap.width}px`;image.style.height=`${currentMap.height}px`;
  canvas.style.width=`${currentMap.width}px`;canvas.style.height=`${currentMap.height}px`;
  viewport.setAttribute('aria-label',`Интерактивная карта: ${$('mapSelect').selectedOptions[0].textContent}`);
  draw();resize();status('Карта загружена · пометки сохраняются в этом браузере');
 }
 const modeIds={pan:'panMode',draw:'drawMode',arrow:'arrowMode',circle:'circleMode',erase:'eraseMode'};
 const modeHints={pan:'ЛКМ — перемещение · ПКМ — двигать в любом режиме · масштаб до 1:1',draw:'Зажми ЛКМ и веди для линии · ПКМ — перемещение карты',arrow:'Зажми ЛКМ в начале и протяни стрелку · ПКМ — карта',circle:'Зажми ЛКМ в центре и протяни до радиуса · ПКМ — карта',erase:'ЛКМ стирает пометки · ПКМ — перемещение карты'};
 function setMode(next){
  mode=next;viewport.classList.toggle('mode-pan',mode==='pan');viewport.classList.toggle('mode-draw',mode==='draw');viewport.classList.toggle('mode-erase',mode==='erase');viewport.classList.toggle('mode-shape',mode==='arrow'||mode==='circle');viewport.classList.remove('dragging');
  for(const [key,id] of Object.entries(modeIds)){$(id).classList.toggle('active',mode===key);$(id).setAttribute('aria-pressed',String(mode===key));}
  $('mapHint').textContent=modeHints[mode];
 }
 viewport.addEventListener('pointerdown',e=>{
  if(e.target.closest('.map-controls'))return;
  if(e.button===2){e.preventDefault();viewport.setPointerCapture(e.pointerId);gesture={kind:'pan',id:e.pointerId,startX:e.clientX,startY:e.clientY,tx,ty};viewport.classList.add('dragging');return;}
  if(e.button!==undefined&&e.button!==0)return;e.preventDefault();viewport.setPointerCapture(e.pointerId);
  if(mode==='pan'){gesture={kind:'pan',id:e.pointerId,startX:e.clientX,startY:e.clientY,tx,ty};viewport.classList.add('dragging');return;}
  const p=point(e);if(p.x<0||p.y<0||p.x>currentMap.width||p.y>currentMap.height)return;
  const brush=Number($('brushSize').value),size=brush/scale;
  if(mode==='arrow'||mode==='circle')active={kind:mode,start:p,end:p,color,size};
  else active={kind:'path',points:[p],color,size,erase:mode==='erase'};
  strokes.push(active);draw();gesture={kind:'draw',id:e.pointerId};
 });
 viewport.addEventListener('contextmenu',e=>e.preventDefault());
 viewport.addEventListener('pointermove',e=>{
  if(!gesture||gesture.id!==e.pointerId)return;
  if(gesture.kind==='pan'){tx=gesture.tx+(e.clientX-gesture.startX);ty=gesture.ty+(e.clientY-gesture.startY);apply();return;}
  if(gesture.kind==='draw'){
   const p=point(e);
   if(active.kind==='arrow'||active.kind==='circle'){active.end=p;draw();return;}
   if(p.x>=0&&p.y>=0&&p.x<=currentMap.width&&p.y<=currentMap.height){const prev=active.points[active.points.length-1];if(!prev||Math.hypot(p.x-prev.x,p.y-prev.y)>.6){active.points.push(p);draw();}}
  }
 });
 function finish(e){if(!gesture||gesture.id!==e.pointerId)return;const wasDraw=gesture.kind==='draw';gesture=null;active=null;viewport.classList.remove('dragging');if(wasDraw)save();}
 viewport.addEventListener('pointerup',finish);viewport.addEventListener('pointercancel',finish);viewport.addEventListener('lostpointercapture',()=>{if(gesture?.kind==='draw')save();gesture=null;active=null;viewport.classList.remove('dragging');});
 function zoomAt(px,py,factor){const old=scale;scale=Math.max(.18,Math.min(1,scale*factor));const ratio=scale/old;tx=px-(px-tx)*ratio;ty=py-(py-ty)*ratio;apply();}
 function centerZoom(factor){const r=viewport.getBoundingClientRect();zoomAt(r.width/2,r.height/2,factor);}
 $('zoomIn').addEventListener('click',()=>centerZoom(1.22));$('zoomOut').addEventListener('click',()=>centerZoom(1/1.22));$('resetBtn').addEventListener('click',initialView);
 viewport.addEventListener('wheel',e=>{e.preventDefault();const r=viewport.getBoundingClientRect();zoomAt(e.clientX-r.left,e.clientY-r.top,e.deltaY<0?1.12:1/1.12);},{passive:false});
 for(const [key,id] of Object.entries(modeIds))$(id).addEventListener('click',()=>setMode(key));
 $('mapSelect').addEventListener('change',e=>changeMap(e.target.value));
 document.querySelectorAll('.swatch').forEach(b=>b.addEventListener('click',()=>{color=b.dataset.color;document.querySelectorAll('.swatch').forEach(x=>x.classList.toggle('active',x===b));if(mode==='pan')setMode('draw');}));
 $('brushSize').addEventListener('input',e=>{$('brushValue').textContent=e.target.value;});
 $('undoBtn').addEventListener('click',()=>{if(strokes.length){strokes.pop();draw();save();}});
 $('clearBtn').addEventListener('click',()=>{if(!strokes.length)return;if(confirm('Удалить все пометки на карте в этом браузере?')){strokes=[];draw();save();}});
 document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!/input|textarea|select/i.test(document.activeElement.tagName)){e.preventDefault();$('undoBtn').click();}});
 if('ResizeObserver'in window)new ResizeObserver(resize).observe(viewport);else window.addEventListener('resize',resize);
 draw();resize();
})();
