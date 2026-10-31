const places={hail:[27.5219,41.6907],baqaa:[27.885,42.406],jubbah:[28.006,40.939],shinan:[27.165,42.445],ghazalah:[26.79,41.32]};
const el=id=>document.getElementById(id);
let lastAlert='',requestId=0,controller,layer='rain';
const saved=localStorage.getItem('hail_place');
if(places[saved])el('place').value=saved;
el('notify').checked=localStorage.getItem('hail_notify')==='true';
const placeName=()=>el('place').selectedOptions[0].textContent;
const format=value=>typeof value==='number'&&Number.isFinite(value)?value:'—';
function updateMap(){
 const [lat,lon]=places[el('place').value],isRadar=layer==='radar',isForecast=layer==='rain';
 el('radar-view').hidden=!isRadar;el('forecast-view').hidden=!isForecast;el('rain-map').hidden=isRadar||isForecast;el('map-expand').hidden=isRadar||isForecast;
 el('map-title').textContent=(isRadar?'رادار الأمطار — ':isForecast?'توقعات 12 ساعة — ':'توقعات السحب — ')+placeName();
 el('map-badge').textContent=isRadar?'رادار رصد فعلي • قد تكون التغطية ناقصة':'توقعات مستقبلية • ليست رصدًا فعليًا';
 el('map-intro').textContent=isRadar?'آخر صور الرادار المتاحة. غياب الهطول في هذه الخدمة لا ينفي نزول المطر في حائل.':isForecast?'اختر ساعة من الساعات الـ12 القادمة لمشاهدة توقعات الهطول على الخريطة.':'توقعات سحب من Windy؛ استخدم شريط الوقت أسفلها.';
 for(const item of ['radar','rain','clouds'])el('layer-'+item).setAttribute('aria-pressed',String(layer===item));
 if(isRadar){el('map-status').textContent='الرصد المحلي غير مضمون التوفر؛ تحقق من الوقت والتغطية.';}
 else if(isForecast){el('map-status').textContent='الرموز الملونة توقعات للمواقع المحددة؛ اضغط أي نقطة لعرض التفاصيل.';}
 else{
  const params=new URLSearchParams({type:'map',location:'coordinates',metricRain:'mm',metricTemp:'°C',metricWind:'km/h',zoom:'7',overlay:'clouds',product:'ecmwf',level:'surface',lat,lon});
  const url='https://embed.windy.com/embed.html?'+params;el('rain-map').title='توقعات السحب — '+placeName();
  el('map-status').textContent='جارٍ تحميل توقعات السحب…';el('rain-map').src=url;el('map-expand').href=url;
 }
 document.dispatchEvent(new CustomEvent('matar-map-change',{detail:{lat,lon,isRadar,isForecast,name:placeName(),key:el('place').value}}));
}
el('rain-map').addEventListener('load',()=>{if(layer==='clouds')el('map-status').textContent='خريطة توقعات سحب؛ اختر الوقت من الشريط أسفلها.'});
for(const item of ['radar','rain','clouds'])el('layer-'+item).addEventListener('click',()=>{if(layer===item)return;layer=item;updateMap()});
function dailyCard(d,i){
 const card=document.createElement('article');card.className='stat';
 const name=document.createElement('div');name.className='day-name';name.textContent=new Date(d.time[i]+'T12:00:00').toLocaleDateString('ar-SA',{weekday:'long',month:'short',day:'numeric',calendar:'gregory'});
 const rain=document.createElement('div');rain.className='day-rain';rain.textContent=format(d.precipitation_sum[i])+' ملم';
 const detail=document.createElement('div');detail.className='day-detail';detail.textContent='احتمال المطر '+format(d.precipitation_probability_max[i])+'٪ • الحرارة '+format(d.temperature_2m_min[i])+'–'+format(d.temperature_2m_max[i])+'°';
 card.append(name,rain,detail);return card;
}
async function load(){
 const id=++requestId;
 if(controller)controller.abort();controller=new AbortController();
 const key=el('place').value,[lat,lon]=places[key];
 el('refresh').disabled=true;el('status').textContent='جارٍ جلب بيانات الطقس…';
 // Clear the previous region's values while fetching the new region.
 for(const field of ['temp','rain','prob'])el(field).textContent='—';
 el('updated').textContent='';el('hours').textContent='جارٍ التحميل…';el('days').textContent='جارٍ التحميل…';el('banner').style.display='none';
 try{
  const params=new URLSearchParams({latitude:lat,longitude:lon,current:'temperature_2m,precipitation',hourly:'precipitation_probability,precipitation',daily:'temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max',forecast_days:'3',timezone:'Asia/Riyadh'});
  const res=await fetch('https://api.open-meteo.com/v1/forecast?'+params,{cache:'no-store',signal:controller.signal});
  if(!res.ok)throw Error('Weather request failed');
  const d=await res.json();if(id!==requestId)return;
  const current=d.current,hours=d.hourly;
  const now=Date.now();
  let start=hours.time.findIndex(t=>new Date(t+'+03:00').getTime()>now);if(start<0)throw Error('No future forecasts');
  const rows=hours.time.slice(start,start+12).map((time,i)=>({time,prob:hours.precipitation_probability[start+i],rain:hours.precipitation[start+i]}));
  const max=Math.max(0,...rows.slice(0,4).map(r=>r.prob??0));
  el('temp').textContent=format(Math.round(current.temperature_2m))+'°';el('rain').textContent=format(current.precipitation)+' ملم';el('prob').textContent=max+'٪';
  el('updated').textContent='آخر تحديث: '+new Date().toLocaleTimeString('ar-SA')+' • توقيت بيانات الطقس: '+current.time.replace('T',' ')+' (السعودية)';
  el('hours').replaceChildren(...rows.map(r=>{const div=document.createElement('div');div.className='line';const a=document.createElement('span');a.textContent=r.time.slice(8,10)+'/'+r.time.slice(5,7)+' • '+r.time.slice(11);const b=document.createElement('span');b.textContent=`احتمال ${format(r.prob)}٪ • ${format(r.rain)} ملم`;div.append(a,b);return div}));
  el('days').replaceChildren(...d.daily.time.slice(0,3).map((_,i)=>dailyCard(d.daily,i)));
  const message=current.precipitation>0?'رُصد هطول في بيانات الطقس لهذه المنطقة':max>=60?'احتمال مرتفع لهطول الأمطار خلال الساعات القادمة':'';
  el('banner').style.display=message?'block':'none';el('banner').textContent=message?'🌧️ '+message:'';
  el('status').textContent='بيانات التوقعات متاحة — '+placeName();
  if(message&&el('notify').checked&&lastAlert!==key+message&&'Notification'in window&&Notification.permission==='granted'&&'serviceWorker'in navigator){
   navigator.serviceWorker.ready.then(reg=>reg.showNotification('مطر حائل',{body:message,icon:'icon-192.png',tag:'matar-hail-weather'})).catch(()=>{});lastAlert=key+message;
  }
  if(!message)lastAlert='';
 }catch(e){if(id===requestId&&e.name!=='AbortError'){el('status').textContent='تعذر تحديث البيانات. تحقق من الاتصال ثم حاول مرة أخرى.';el('hours').textContent='التوقعات غير متاحة حاليًا.';el('days').textContent='التوقعات غير متاحة حاليًا.';}}
 finally{if(id===requestId)el('refresh').disabled=false;}
}
el('refresh').addEventListener('click',load);
el('place').addEventListener('change',()=>{localStorage.setItem('hail_place',el('place').value);lastAlert='';updateMap();load()});
el('notify').addEventListener('change',async()=>{
 if(el('notify').checked){
  if(!('Notification'in window)||!window.isSecureContext||!('serviceWorker'in navigator)){alert('الإشعارات غير مدعومة في هذا السياق.');el('notify').checked=false;return;}
  const result=await Notification.requestPermission();if(result!=='granted'){el('notify').checked=false;alert('لم يتم منح إذن الإشعارات.');}
 }
 localStorage.setItem('hail_notify',el('notify').checked);
});
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
updateMap();load();setInterval(()=>{if(!document.hidden)load()},300000);
