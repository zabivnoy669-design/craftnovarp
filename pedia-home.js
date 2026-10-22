'use strict';
(async()=>{
 const cfg=window.NOVA_SUPABASE,grid=document.querySelector('.pedia-grid');
 if(!cfg||!window.supabase||!grid)return;
 const db=window.supabase.createClient(cfg.url,cfg.publishableKey);
 const safe=(tag,text,cls)=>{const n=document.createElement(tag);n.textContent=text||'';if(cls)n.className=cls;return n;};
 try{
  const {data:sections,error}=await db.from('pedia_sections').select('*').eq('is_active',true).order('sort_order');
  if(error)throw error;
  if(!sections||!sections.length)return;
  grid.replaceChildren();
  for(const s of sections){
   const a=document.createElement('a');a.className='pedia-tile';a.href=s.href||`article.html?section=${encodeURIComponent(s.slug)}`;
   a.append(safe('div',s.icon||'◇','tile-icon'),safe('h3',s.title),safe('p',s.description));
   const state=safe('div','',`tile-state${s.is_tool?' live':''}`);
   let stateText=s.slug==='weapons'?'Каталог оружия':(s.is_tool?'Рабочие инструменты':'Раздел готовится');
   if(!s.is_tool){const r=await db.from('pedia_articles').select('id',{count:'exact',head:true}).eq('section_slug',s.slug).eq('is_published',true);if(!r.error&&r.count)stateText=`${r.count} ${r.count===1?'статья':'статей'}`;}
   state.append(safe('span',stateText),safe('span','↗'));a.append(state);grid.append(a);
  }
  const count=document.querySelector('#sections .section-bar span');if(count)count.textContent=`${sections.length} разделов · редактируется модератором`;
  const session=await db.auth.getSession();if(session.data?.session){const r=await db.rpc('pedia_is_moderator');if(r.data===true){const nav=document.querySelector('.pedia-side');if(nav){const link=safe('a','✎  Редактор Pedia','side-link');link.href='pedia-editor.html';nav.append(link);}const tools=document.querySelector('.pedia-content');if(tools){const a=document.createElement('a');a.href='pedia-editor.html';a.className='ready-link';a.style.marginTop='14px';a.append(safe('div','✎','tile-icon'));const d=document.createElement('div');d.append(safe('strong','Редактировать энциклопедию'),safe('small','Управление разделами и статьями'));a.append(d,safe('b','→'));tools.insertBefore(a,document.querySelector('#sections'));}}}
 }catch(e){console.warn('Pedia sections are using bundled fallback until setup is complete.',e);}
})();
