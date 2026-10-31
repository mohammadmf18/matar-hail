let currentHeading=null;
const headingNames=['شمال','شمال شرقي','شرق','جنوب شرقي','جنوب','جنوب غربي','غرب','شمال غربي'];
const normalizeHeading=angle=>((angle%360)+360)%360;
function attachHeadingToMap(map){
 let arrow=null;
 const north=L.control({position:'topright'});
 north.onAdd=()=>{const node=L.DomUtil.create('div','heading-north');node.textContent='↑ شمال';return node;};north.addTo(map);
 function draw(){
  if(arrow){map.removeLayer(arrow);arrow=null;}
  if(!places.current||!currentHeading||document.getElementById('place').value!=='current')return;
  const angle=Math.round(currentHeading.angle);
  const icon=L.divIcon({className:'heading-icon',html:'<span class="heading-pointer" style="transform:rotate('+angle+'deg)" aria-hidden="true">▲</span>',iconSize:[34,34],iconAnchor:[17,17]});
  arrow=L.marker(places.current,{icon,interactive:false,zIndexOffset:2000}).addTo(map);
 }
 document.addEventListener('matar-heading',draw);
 document.addEventListener('matar-position',draw);
 document.addEventListener('matar-map-change',draw);
 draw();
}
(() => {
 const button=document.getElementById('heading-toggle'),status=document.getElementById('heading-status');
 let active=false,awaiting=false,lastCompass=0,expiry,timer;
 function publish(angle,source){
  const a=normalizeHeading(angle);currentHeading={angle:a,source};
  status.textContent=source+': '+headingNames[Math.round(a/45)%8]+' • '+Math.round(a)+'°';
  document.dispatchEvent(new Event('matar-heading'));
  clearTimeout(expiry);expiry=setTimeout(()=>clear('توقفت قراءة الاتجاه. حرّك الهاتف قليلًا أو أعد تفعيل البوصلة.'),12000);
 }
 function clear(message){currentHeading=null;if(message)status.textContent=message;document.dispatchEvent(new Event('matar-heading'));}
 function orientation(e){
  if(!active||document.hidden)return;
  if(Number.isFinite(e.webkitCompassHeading)&&(e.webkitCompassAccuracy===undefined||e.webkitCompassAccuracy>=0)){lastCompass=Date.now();publish(e.webkitCompassHeading,'اتجاه الهاتف التقريبي');return;}
  if(e.absolute===true&&Number.isFinite(e.alpha)){
   const screenAngle=screen.orientation?.angle??0;
   if(screenAngle%180!==0){clear('أعد الهاتف للوضع الطولي، وضعه مسطحًا لقراءة البوصلة.');return;}
   if((Number.isFinite(e.beta)&&Math.abs(e.beta)>45)||(Number.isFinite(e.gamma)&&Math.abs(e.gamma)>45)){clear('ضع الهاتف مسطحًا وأعلاه باتجاه نظرك لقراءة البوصلة.');return;}
   lastCompass=Date.now();publish(360-e.alpha+screenAngle,'اتجاه الهاتف التقريبي');
  }
 }
 function stop(message){active=false;clearTimeout(timer);clearTimeout(expiry);window.removeEventListener('deviceorientationabsolute',orientation);window.removeEventListener('deviceorientation',orientation);button.textContent='🧭 إظهار اتجاهي';button.setAttribute('aria-pressed','false');clear(message);}
 button.addEventListener('click',async()=>{
  if(awaiting)return;
  if(active){stop('تم إيقاف البوصلة.');return;}
  if(!places.current){status.textContent='اضغط «موقعي الحالي» واسمح بالموقع أولًا، ثم فعّل اتجاهي.';return;}
  if(!window.isSecureContext||!window.DeviceOrientationEvent){status.textContent='هذا المتصفح لا يتيح بوصلة الهاتف. افتح التطبيق في Chrome على هاتفك.';return;}
  awaiting=true;
  try{
   if(typeof DeviceOrientationEvent.requestPermission==='function'){
    const permission=await DeviceOrientationEvent.requestPermission(true);
    if(permission!=='granted'){status.textContent='لم يُسمح بحساسات الاتجاه. فعّل إذن الحركة والاتجاه لهذا الموقع ثم أعد المحاولة.';return;}
   }
   active=true;lastCompass=0;button.textContent='إيقاف اتجاهي';button.setAttribute('aria-pressed','true');
   status.textContent='جارٍ قراءة البوصلة… ضع الهاتف مسطحًا بالوضع الطولي، وأعلاه باتجاه نظرك.';
   window.addEventListener('deviceorientationabsolute',orientation);window.addEventListener('deviceorientation',orientation);
   timer=setTimeout(()=>{if(active&&!lastCompass)status.textContent='لم تصل قراءة بوصلة موثوقة. تحقق من إذن حساسات الحركة، وجرّب تحريك الهاتف على شكل 8 بعيدًا عن المعادن.';},7000);
  }catch(e){status.textContent='تعذر تشغيل البوصلة في هذا المتصفح. تحقق من إذن الحساسات ثم حاول مرة أخرى.';}
  finally{awaiting=false;}
 });
 document.addEventListener('matar-position',e=>{
  if(active&&Date.now()-lastCompass<12000)return;
  const h=e.detail.heading,s=e.detail.speed;
  if(Number.isFinite(h)&&(s===null||s===undefined||s>0.5))publish(h,'اتجاه الحركة عند آخر تحديد للموقع');
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop('أعد تفعيل اتجاهي بعد العودة للتطبيق.');});
})();
