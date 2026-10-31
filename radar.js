(() => {
 const $=id=>document.getElementById(id);
 let map,marker,coverage,radarLayer,frames=[],host='',selected=0,timer=null,refreshing=false,requestNumber=0;
 const options={tileSize:512,zoomOffset:-1,maxNativeZoom:7,maxZoom:10,minZoom:3,updateWhenIdle:true,keepBuffer:1};
 const timeText=t=>new Date(t*1000).toLocaleString('ar-SA',{timeZone:'Asia/Riyadh',calendar:'gregory',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
 function stop(){if(timer){clearInterval(timer);timer=null;}$('radar-play').textContent='تشغيل الحركة ▶';$('radar-play').setAttribute('aria-pressed','false');}
 function freshness(){
  if(!frames.length)return;
  const age=Math.max(0,Math.floor((Date.now()/1000-frames[frames.length-1].time)/60));
  const stale=age>30;
  $('radar-freshness').classList.toggle('radar-warning',stale);
  $('radar-freshness').textContent=(stale?'تنبيه: آخر إطار متأخر — ':'آخر إطار متاح — ')+'تم تجميعه منذ '+age+' دقيقة. هذا لا يؤكد حداثة الرادار المحلي.';
 }
 function showFrame(index){
  if(!map||!frames.length)return;
  selected=Math.max(0,Math.min(frames.length-1,index));
  const frame=frames[selected];
  $('radar-timeline').value=selected;
  $('radar-timeline').setAttribute('aria-valuetext',timeText(frame.time)+(selected===frames.length-1?'، أحدث إطار':'، إطار سابق'));
  $('radar-time').textContent=(selected===frames.length-1?'أحدث إطار رادار: ':'إطار رادار سابق: ')+timeText(frame.time)+' • توقيت السعودية';
  if(radarLayer)map.removeLayer(radarLayer);
  radarLayer=L.tileLayer(host+frame.path+'/512/{z}/{x}/{y}/2/0_0.png',{...options,opacity:.8,zIndex:400,attribution:'Weather data by <a href="https://www.rainviewer.com/">RainViewer</a>'});
  let failed=false;
  const thisLayer=radarLayer;
  thisLayer.on('tileerror',()=>{
   if(thisLayer!==radarLayer)return;failed=true;
   $('radar-freshness').classList.add('radar-warning');
   $('radar-freshness').textContent='تعذر تحميل بعض صور الرادار؛ لا تعتمد على فراغ الخريطة. أوقف الحركة واضغط تحديث الرادار أو افتح المصدر.';
  });
  thisLayer.on('load',()=>{if(thisLayer===radarLayer&&!failed)freshness()});
  thisLayer.addTo(map);freshness();
 }
 async function refresh(){
  if(!map||refreshing)return;
  refreshing=true;stop();$('radar-refresh').disabled=true;
  const request=++requestNumber;
  $('radar-freshness').textContent='جارٍ جلب أحدث قائمة صور الرادار…';
  const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),20000);
  try{
   const response=await fetch('https://api.rainviewer.com/public/weather-maps.json',{cache:'no-store',signal:abort.signal});
   if(!response.ok)throw Error('Radar metadata unavailable');
   const data=await response.json();
   const valid=(data.radar?.past||[]).filter(f=>Number.isFinite(f.time)&&typeof f.path==='string'&&/^\/v2\/radar\/[a-zA-Z0-9_-]+$/.test(f.path)).sort((a,b)=>a.time-b.time);
   if(!valid.length||new URL(data.host).protocol!=='https:')throw Error('No radar frames');
   if(request!==requestNumber)return;
   frames=valid;host=data.host.replace(/\/$/,'');
   $('radar-timeline').max=frames.length-1;$('radar-timeline').disabled=false;
   $('radar-play').disabled=frames.length<2;$('radar-latest').disabled=false;
   const coverageUrl=host+'/v2/coverage/0/512/{z}/{x}/{y}/0/0_0.png';
   if(!coverage){
    coverage=L.tileLayer(coverageUrl,{...options,opacity:.45,zIndex:300});
    coverage.on('tileerror',()=>{$('coverage-note').textContent='تعذر تحميل قناع التغطية. لا يمكن تأكيد تغطية المكان من الخريطة.'});
    if($('radar-coverage').checked)coverage.addTo(map);
   }
   showFrame(frames.length-1);
  }catch(e){
   $('radar-freshness').classList.add('radar-warning');
   $('radar-freshness').textContent=frames.length?'تعذر تحديث الرادار؛ الصور المعروضة من آخر جلب ناجح. تحقق من وقت الإطار ثم أعد المحاولة.':'بيانات الرادار غير متاحة حاليًا. لا يمكن الحكم على وجود أمطار من الخريطة.';
   if(!frames.length)$('radar-time').textContent='لا توجد صورة رادار متاحة';
  }finally{clearTimeout(timeout);refreshing=false;$('radar-refresh').disabled=false;}
 }
 function init(){
  if(!window.L){$('radar-freshness').textContent='تعذر تحميل مكتبة الخريطة. تحقق من الإنترنت ثم أعد فتح التطبيق، أو افتح رابط المصدر أدناه.';return;}
  const [lat,lon]=places[$('place').value];
  map=L.map('radar-map',{center:[lat,lon],zoom:7,minZoom:4,maxZoom:10,scrollWheelZoom:false});
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);
  marker=L.circleMarker([lat,lon],{radius:7,color:'#fff',weight:3,fillColor:'#075985',fillOpacity:1}).addTo(map).bindTooltip(placeName());
  L.control.scale({imperial:false}).addTo(map);
 if(typeof attachHeadingToMap==='function')attachHeadingToMap(map);
  $('radar-map').insertAdjacentHTML('afterend','<p id="coverage-note" class="radar-note" style="padding:0 18px">اللون الداكن يبين المناطق خارج نطاق التغطية المنشور؛ القناع لا يبين أعطال الرادار اللحظية.</p>');
  if(!$('radar-view').hidden)refresh();
 }
 $('radar-refresh').addEventListener('click',refresh);
 $('radar-timeline').addEventListener('input',e=>{stop();showFrame(Number(e.target.value))});
 $('radar-latest').addEventListener('click',()=>{stop();showFrame(frames.length-1)});
 $('radar-play').addEventListener('click',()=>{
  if(timer){stop();return;}if(frames.length<2)return;
  $('radar-play').textContent='إيقاف الحركة ⏸';$('radar-play').setAttribute('aria-pressed','true');
  showFrame(0);timer=setInterval(()=>showFrame((selected+1)%frames.length),1500);
 });
 $('radar-coverage').addEventListener('change',e=>{if(!coverage||!map)return;if(e.target.checked)coverage.addTo(map);else map.removeLayer(coverage)});
 document.addEventListener('matar-map-change',e=>{
  if(!map)return;
  if(!e.detail.isRadar){stop();return;}
  if(!frames.length)refresh();
  map.invalidateSize();map.setView([e.detail.lat,e.detail.lon],7);marker.setLatLng([e.detail.lat,e.detail.lon]).setTooltipContent(e.detail.name);
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
 setInterval(()=>{if(!document.hidden&& !$('radar-view').hidden)refresh()},300000);
 init();
})();
