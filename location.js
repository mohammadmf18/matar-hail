(() => {
 const button=document.getElementById('locate'),status=document.getElementById('location-status'),select=document.getElementById('place');
 let pending=false;
 button.addEventListener('click',()=>{
  if(pending)return;
  if(!window.isSecureContext||!navigator.geolocation){status.textContent='تحديد الموقع غير متاح هنا. افتح التطبيق عبر HTTPS في Chrome، أو اختر المنطقة يدويًا.';return;}
  pending=true;button.disabled=true;button.textContent='جارٍ تحديد موقعك…';status.textContent='اسمح بإذن الموقع في المتصفح. قد يستغرق تحديد الموقع عدة ثوانٍ.';
  function finish(){pending=false;button.disabled=false;button.textContent='📍 تحديث موقعي';}
  navigator.geolocation.getCurrentPosition(position=>{
   const {latitude,longitude,accuracy}=position.coords;
   if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180){finish();status.textContent='تعذر قراءة موقع صالح. حاول مرة أخرى أو اختر المنطقة يدويًا.';return;}
   places.current=[latitude,longitude];
   document.dispatchEvent(new CustomEvent('matar-position',{detail:{latitude,longitude,heading:position.coords.heading,speed:position.coords.speed}}));
   let option=[...select.options].find(o=>o.value==='current');
   if(!option){option=document.createElement('option');option.value='current';select.prepend(option);}
   option.textContent='موقعي الحالي 📍';select.value='current';
   layer='rain';select.dispatchEvent(new Event('change'));
   const distance=Number.isFinite(accuracy)?Math.round(accuracy):null;
   status.textContent='تم إظهار موقعك على الخريطة'+(distance!==null?' • دقة تقريبية ±'+distance+' متر':'')+(distance>1000?'؛ الموقع تقريبي، فعّل دقة الموقع العالية على هاتفك.':'.');
   finish();
  },error=>{
   const message=error.code===1?'لم يُسمح بالموقع. من إعدادات الموقع في Chrome اسمح بالوصول للموقع لهذا التطبيق، ثم أعد المحاولة.':error.code===3?'انتهت مهلة تحديد الموقع. فعّل خدمة الموقع في الهاتف وحاول مرة أخرى.':'تعذر تحديد الموقع. تأكد من تشغيل خدمة الموقع واتصال الإنترنت ثم أعد المحاولة.';
   status.textContent=message+' يمكنك اختيار المنطقة يدويًا.';finish();
  },{enableHighAccuracy:true,timeout:20000,maximumAge:30000});
 });
})();
