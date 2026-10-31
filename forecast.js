(() => {
 const $=id=>document.getElementById(id);
 const named=Object.entries(places).map(([key,coordinates])=>({key,lat:coordinates[0],lon:coordinates[1],name:[...$('place').options].find(o=>o.value===key).textContent}));
 const points=[...named];
 for(const lat of [26.7,27.1,27.5,27.9,28.3])for(const lon of [40.7,41.1,41.5,41.9,42.3])points.push({lat,lon,name:'الموقع '+lat.toFixed(2)+'°، '+lon.toFixed(2)+'°'});
 let map,markers=[],data=[],times=[],selected=0,playing=null,loading=false,lastFetched=0;
 const clock=t=>new Date(t*1000).toLocaleString('ar-SA',{timeZone:'Asia/Riyadh',calendar:'gregory',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
 const value=v=>Number.isFinite(v)?v:'غير متاح';
 const color=v=>!Number.isFinite(v)?'#777':v===0?'#d7e3eb':v<1?'#58b4ed':v<3?'#168ae0':v<10?'#edb522':'#e44848';
 function stop(){if(playing)clearInterval(playing);playing=null;$('forecast-play').textContent='تشغيل التوقعات ▶';$('forecast-play').setAttribute('aria-pressed','false');}
 function values(i,t){const h=data[i]?.hourly;if(!h)return{rain:null,prob:null};const n=h.time.indexOf(t);return{rain:h.precipitation[n],prob:h.precipitation_probability[n]};}
 function render(index){
  if(!map||!times.length)return;
  selected=Math.max(0,Math.min(times.length-1,index));const t=times[selected];
  if(t*1000<=Date.now()){stop();$('forecast-status').textContent='انتهت صلاحية أول ساعة؛ جارٍ تحديث الساعات المستقبلية…';refresh();return;}
  $('forecast-timeline').value=selected;$('forecast-timeline').setAttribute('aria-valuetext',clock(t)+'، الساعة '+(selected+1)+' من 12');
  $('forecast-time').textContent='التوقع حتى '+clock(t)+' • '+(selected+1)+' / 12 • توقيت السعودية';
  points.forEach((p,i)=>{
   const v=values(i,t),marker=markers[i];
   marker.setStyle({fillColor:color(v.rain),color:p.key?'#06436a':'#fff',weight:p.key?3:1.5,fillOpacity:.9});
   const content=document.createElement('div');content.dir='rtl';
   for(const line of [p.name,'حتى '+clock(t),'المطر المتوقع: '+value(v.rain)+' ملم','احتمال المطر: '+value(v.prob)+'٪']){const item=document.createElement('div');item.textContent=line;content.append(item);}
   marker.bindPopup(content);
  });
  const key=$('place').value,i=points.findIndex(p=>p.key===key),v=values(i,t);
  $('forecast-selection').textContent=placeName()+': '+value(v.rain)+' ملم متوقعة خلال الساعة • احتمال المطر '+value(v.prob)+'٪';
 }
 async function refresh(){
  if(!map||loading)return;loading=true;stop();$('forecast-refresh').disabled=true;
  $('forecast-status').textContent='جارٍ جلب توقعات 12 ساعة للمواقع على الخريطة…';
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),25000);
  try{
   const params=new URLSearchParams({latitude:points.map(p=>p.lat).join(','),longitude:points.map(p=>p.lon).join(','),hourly:'precipitation,precipitation_probability',forecast_days:'3',timeformat:'unixtime',timezone:'Asia/Riyadh'});
   const res=await fetch('https://api.open-meteo.com/v1/forecast?'+params,{signal:controller.signal,cache:'no-store'});
   if(!res.ok)throw Error('Forecast unavailable');
   const d=await res.json();
   if(!Array.isArray(d)||d.length!==points.length||d.some(p=>!Array.isArray(p.hourly?.time)))throw Error('Invalid point forecasts');
   const next=d[0].hourly.time.filter(t=>t*1000>Date.now()).slice(0,12);
   if(next.length!==12)throw Error('Twelve future hours unavailable');
   data=d;times=next;lastFetched=Date.now();
   $('forecast-timeline').disabled=false;$('forecast-play').disabled=false;
   $('forecast-status').textContent='آخر جلب للتوقعات: '+new Date(lastFetched).toLocaleTimeString('ar-SA',{timeZone:'Asia/Riyadh'})+' • نقاط توقعات، وليست رادارًا.';
   render(0);
  }catch(e){
   $('forecast-status').textContent=data.length?'تعذر تحديث التوقعات؛ المعروض من آخر جلب ناجح. راجع وقت الجلب.':'تعذر جلب التوقعات. لا تعني الخريطة الخالية عدم وجود مطر. اضغط تحديث لإعادة المحاولة.';
   if(!data.length)$('forecast-time').textContent='توقعات 12 ساعة غير متاحة حاليًا';
  }finally{clearTimeout(timeout);loading=false;$('forecast-refresh').disabled=false;}
 }
 $('forecast-refresh').addEventListener('click',refresh);
 $('forecast-timeline').addEventListener('input',e=>{stop();render(Number(e.target.value))});
 $('forecast-play').addEventListener('click',()=>{if(playing){stop();return;}if(times.length!==12)return;$('forecast-play').textContent='إيقاف التوقعات ⏸';$('forecast-play').setAttribute('aria-pressed','true');render(0);playing=setInterval(()=>render((selected+1)%12),1200)});
 document.addEventListener('matar-map-change',e=>{
  if(!map)return;if(!e.detail.isForecast){stop();return;}
  map.invalidateSize();map.setView([e.detail.lat,e.detail.lon],7);
  if(data.length)render(selected);
  if(!lastFetched||Date.now()-lastFetched>1200000)refresh();
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
 setInterval(()=>{if(!document.hidden&&!$('forecast-view').hidden)refresh()},1200000);
 if(!window.L){$('forecast-status').textContent='تعذر تحميل الخريطة. يمكنك مراجعة جدول توقعات 12 ساعة أسفل الصفحة.';return;}
 const [lat,lon]=places[$('place').value];map=L.map('forecast-map',{center:[lat,lon],zoom:7,minZoom:5,maxZoom:11,scrollWheelZoom:false});
 L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · Forecast: <a href="https://open-meteo.com/">Open-Meteo</a>'}).addTo(map);
 markers=points.map(p=>{
  const marker=L.circleMarker([p.lat,p.lon],{radius:p.key?11:8,fillColor:'#777',color:'#fff',weight:1.5,fillOpacity:.4}).addTo(map);
  if(p.key)marker.bindTooltip(p.name,{permanent:true,direction:'top',offset:[0,-8],className:'forecast-city'});
  return marker;
 });
 L.control.scale({imperial:false}).addTo(map);refresh();
})();
