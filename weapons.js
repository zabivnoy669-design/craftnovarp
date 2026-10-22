"use strict";
(()=>{
 const $=id=>document.getElementById(id);let all=[];
 const node=(tag,text,cls)=>{const n=document.createElement(tag);n.textContent=text||'';if(cls)n.className=cls;return n;};
 function render(){
  const q=$('search').value.trim().toLocaleLowerCase('ru'),cat=$('category').value;
  const rows=all.filter(w=>{
   const hay=[w.name,w.category,w.damage_source,w.damage_head,w.damage_body,w.damage,w.notes].join(' ').toLocaleLowerCase('ru');
   return (!cat||w.category===cat)&&(!q||hay.includes(q));
  });
  const root=$('cards');root.replaceChildren();
  for(const w of rows){
   const card=node('article','','card');
   if(w.image){const art=node('div','','art'),img=document.createElement('img');img.className='item-icon-photo';img.src=w.image;img.alt=w.name;img.loading='lazy';img.decoding='async';art.append(img);card.append(art);}
   const damage=(w.damage_head!=null&&w.damage_body!=null)?`Голова: ${w.damage_head} · Тело: ${w.damage_body}`:(w.damage?.trim()||'Урон будет добавлен');
   card.append(node('div',w.category,'tag'),node('h2',w.name),node('div',damage,'damage'));
   if(w.notes)card.append(node('div',w.notes,'note'));
   root.append(card);
  }
  $('count').textContent=`Показано ${rows.length} из ${all.length} видов оружия`;
  if(!rows.length)$('status').textContent='По этому запросу оружие не найдено.';
 }
 async function load(){try{const r=await fetch('weapons-seed.json?v=20261022-damage1',{cache:'no-store'});if(!r.ok)throw Error('Не удалось загрузить список оружия.');all=await r.json();$('status').textContent='Урон указан отдельно для попаданий в голову и тело по присланным данным.';render();}catch(e){$('status').textContent=e.message;$('status').classList.add('error');}}
 $('search').addEventListener('input',render);$('category').addEventListener('change',render);$('refresh').onclick=load;load();
})();
