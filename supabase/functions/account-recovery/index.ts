// Supabase Edge Function: account-recovery
// Deploy with gateway Verify JWT OFF; enroll validates the user's JWT explicitly.
// Never put SUPABASE_SERVICE_ROLE_KEY in HTML or browser JavaScript.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
const encoder = new TextEncoder();
const hex = (b: ArrayBuffer | Uint8Array) => Array.from(new Uint8Array(b instanceof Uint8Array ? b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength) : b)).map(v=>v.toString(16).padStart(2,'0')).join('');
const unhex = (s: string) => new Uint8Array(s.match(/.{2}/g)!.map(v=>parseInt(v,16)));
async function sha(s: string) { return hex(await crypto.subtle.digest('SHA-256',encoder.encode(s))); }
async function derive(secret: string, salt: Uint8Array, iterations=210000) {
 const key = await crypto.subtle.importKey('raw',encoder.encode(secret),'PBKDF2',false,['deriveBits']);
 return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations},key,256));
}
function equal(a:string,b:string){let diff=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0;}
function normalizedSecret(v: unknown){return typeof v==='string'?v.normalize('NFKC').trim():'';}
async function loginEmail(login: string){const v=login.trim().toLowerCase();if(v.includes('@'))return v;if(!/^[a-z0-9_]{3,24}$/.test(v))throw Error('Ник: 3–24 латинских буквы, цифры или _.');return (await sha(v))+'@accounts.novarp.invalid';}
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'';
 const allowed=(Deno.env.get('ALLOWED_ORIGINS')||'https://craftnovarp.netlify.app').split(',').map(v=>v.trim());
 const headers={'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':allowed.includes(origin)?origin:allowed[0],'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin','Cache-Control':'no-store'};
 const reply=(status:number,message:string)=>new Response(JSON.stringify({message}),{status,headers});
 if(origin&&!allowed.includes(origin))return reply(403,'Этот адрес сайта не разрешён.');
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply(405,'Требуется POST.');
 try {
  const text=await req.text();if(text.length>5000)return reply(413,'Слишком большой запрос.');
  let data;try{data=JSON.parse(text)}catch{return reply(400,'Некорректный запрос.');}
  if(!['enroll','reset'].includes(data.action))return reply(400,'Неизвестное действие.');
  const url=Deno.env.get('SUPABASE_URL')!,serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const attempt=async(bucket:string,max:number)=>{const r=await admin.rpc('pedia_recovery_take_attempt',{p_bucket:bucket,p_max:max});if(r.error)throw Error('Не настроена база восстановления.');return r.data===true;};
  // Account-based limiter remains effective even if IP headers are spoofed.
  const ip=req.headers.get('x-forwarded-for')?.split(',')[0].trim()||'unknown';
  const ipHash=await sha('ip:'+serviceKey+':'+ip);
  if(!await attempt('ip:'+ipHash,30))return reply(429,'Слишком много попыток. Подождите 15 минут.');
  const secret=normalizedSecret(data.secret);
  if(secret.length<16||secret.length>200)return reply(400,'Секретная фраза должна содержать 16–200 символов.');
  if(typeof data.password!=='string'||data.password.length<8||data.password.length>128)return reply(400,'Пароль должен содержать 8–128 символов.');
  if(data.action==='enroll'){
   const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
   const auth=await admin.auth.getUser(token);const user=auth.data.user;
   if(auth.error||!user?.email)return reply(401,'Сначала войдите в аккаунт.');
   if(!await attempt('enroll:'+user.id,5))return reply(429,'Слишком много попыток. Подождите 15 минут.');
   // Require the current password before replacing a recovery secret.
   const verifier=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
   const check=await verifier.auth.signInWithPassword({email:user.email,password:data.password});
   if(check.error||check.data.user?.id!==user.id)return reply(403,'Неверный текущий пароль.');
   const salt=crypto.getRandomValues(new Uint8Array(16));
   const digest=await derive(secret,salt);
   const saved=await admin.from('pedia_recovery_secrets').upsert({user_id:user.id,login_hash:await sha(user.email.toLowerCase()),salt:hex(salt),digest,iterations:210000,updated_at:new Date().toISOString()});
   if(saved.error)throw Error('Не удалось сохранить секрет. Проверьте SQL-настройку восстановления.');
   return reply(200,'Секрет восстановления сохранён. Запишите его в безопасном месте.');
  }
  if(typeof data.login!=='string'||data.login.length>254)return reply(400,'Укажите никнейм.');
  const email=await loginEmail(data.login),loginHash=await sha(email);
  if(!await attempt('account:'+loginHash,5))return reply(429,'Слишком много попыток. Подождите 15 минут.');
  const found=await admin.from('pedia_recovery_secrets').select('*').eq('login_hash',loginHash).maybeSingle();
  if(found.error)throw Error('Не настроена база восстановления.');
  const row=found.data;
  // Perform a derivation for missing accounts too; no account-existence disclosure.
  const digest=await derive(secret,row?unhex(row.salt):new Uint8Array(16),row?.iterations||210000);
  if(!row||!equal(digest,row.digest))return reply(400,'Неверный никнейм или секрет восстановления.');
  // Atomic, one-time consumption prevents two concurrent uses of the same secret.
  const consumed=await admin.from('pedia_recovery_secrets').delete().eq('user_id',row.user_id).eq('digest',row.digest).select('user_id');
  if(consumed.error||!consumed.data?.length)return reply(400,'Секрет уже использован. Обратитесь к администратору.');
  const updated=await admin.auth.admin.updateUserById(row.user_id,{password:data.password});
  if(updated.error)return reply(500,'Не удалось изменить пароль. Секрет уже использован; обратитесь к администратору.');
  return reply(200,'Пароль изменён. Войдите и сохраните новый секрет восстановления. Старый секрет больше не действует.');
 }catch(e){console.error('account-recovery failure');return reply(500,e instanceof Error?e.message:'Ошибка восстановления.');}
});
