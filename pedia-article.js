'use strict';
(async()=>{
 const cfg=window.NOVA_SUPABASE;if(!cfg||!window.supabase)return;
 const slug=new URLSearchParams(location.search).get('section');if(!slug)return;
 const db=window.supabase.createClient(cfg.url,cfg.publishableKey);
 try{
  const [{data:section,error:se},{data:articles,error:ae}]=await Promise.all([
   db.from('pedia_sections').select('*').eq('slug',slug).maybeSingle(),
   db.from('pedia_articles').select('*').eq('section_slug',slug).eq('is_published',true).order('sort_order').order('updated_at',{ascending:false})
  ]);
  if(se)throw se;if(ae)throw ae;if(!section)return;
  document.title=section.title+' — Nova RP Pedia';document.getElementById('articleTitle').textContent=section.title;document.getElementById('crumbTitle').textContent=section.title;
  const notice=document.getElementById('articleNotice');notice.textContent=articles.length?section.description:`В разделе «${section.title}» пока нет опубликованных статей.`;
  const meta=document.querySelector('.article-meta');meta.replaceChildren();const state=document.createElement('span');state.textContent=articles.length?`${articles.length} опубликовано(ы)`:'Материалов пока нет';meta.append(state);
  const article=document.querySelector('.article-layout article');article.replaceChildren();
  if(!articles.length){const p=document.createElement('p');p.className='article-block';p.textContent='Материалы добавит модератор Pedia.';article.append(p);}
  for(const row of articles){const block=document.createElement('section');block.className='article-block';const h=document.createElement('h2');h.textContent=row.title;block.append(h);if(row.summary){const sum=document.createElement('p');sum.className='article-summary';sum.textContent=row.summary;block.append(sum);}const body=document.createElement('div');body.className='article-content';body.style.whiteSpace='pre-wrap';body.style.lineHeight='1.9';body.style.color='#9eacc1';body.textContent=row.body;block.append(body);article.append(block);}
  const back=document.createElement('a');back.className='nav-button';back.href='home.html#sections';back.textContent='← К разделам Pedia';article.append(back);
  const sess=await db.auth.getSession();if(sess.data?.session){const mod=await db.rpc('pedia_is_moderator');if(mod.data===true){const edit=document.createElement('a');edit.href=`pedia-editor.html?section=${encodeURIComponent(slug)}`;edit.className='nav-button';edit.style.marginLeft='10px';edit.textContent='✎ Редактировать';article.append(edit);}}
 }catch(e){console.warn('Could not load editable Pedia article; showing bundled template.',e);}
})();
