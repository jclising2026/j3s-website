(() => {
'use strict';
const endpoint='https://j3s-southville-main.up.railway.app/api/public/business-registration';
const form=document.getElementById('businessRegistration');
const training=document.getElementById('trainingFields');
const message=document.getElementById('formMessage');
const button=document.getElementById('submitRegistration');
const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);
const requestKey=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
let pendingPayload=null;
const options=['trial','training','both'];
function updateFields(){const selected=form.querySelector('input[name="option"]:checked');const visible=!!selected&&selected.value!=='trial';training.hidden=!visible;training.disabled=!visible;}
form.querySelectorAll('input[name="option"]').forEach(input=>input.addEventListener('change',updateFields));
const preset=new URLSearchParams(location.search).get('option');
if(options.includes(preset))form.querySelector('input[name="option"][value="'+preset+'"]').checked=true;
updateFields();
form.addEventListener('submit',async(event)=>{
 event.preventDefault();message.textContent='';
 const values=new FormData(form);
 const types=values.getAll('business_types');
 if(!types.length){message.textContent='Please select at least one business type.';message.focus();return;}
 const phone=String(values.get('phone')||'').replace(/[\s()-]/g,'').replace(/^\+?63/,'0');
 if(!/^09\d{9}$/.test(phone)){message.textContent='Please enter a valid Philippine mobile number: 09XXXXXXXXX or +639XXXXXXXXX.';message.focus();return;}
 const payload=Object.fromEntries(values);payload.business_types=types;payload.phone=phone;payload.branches=Number(payload.branches);payload.consent=values.get('consent')==='on';payload.request_key=requestKey;
 // Keep the same payload after a lost response so retrying cannot create a second registration.
 if(pendingPayload&&JSON.stringify(payload)!==JSON.stringify(pendingPayload)){message.textContent='Your previous submission may have been received. Retry using the same details, or email j3sbusiness@gmail.com before submitting different details.';message.focus();return;}
 pendingPayload=payload;button.disabled=true;button.textContent='Submitting…';
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),20000);
 try{
  const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});
  const data=await response.json();
  if(!response.ok||!data.success){if(response.status>=400&&response.status<500)pendingPayload=null;throw Error(data.error||'We could not confirm your registration. Please retry.');}
  form.hidden=true;document.getElementById('registrationReference').textContent=data.reference;
  document.getElementById('registrationNext').textContent=payload.option==='trial'?'We’ll contact you to discuss your business and arrange the POS trial.':payload.option==='training'?'We’ll contact you to confirm your AI training date, time and venue.':'We’ll contact you to arrange your POS trial and confirm your AI training schedule.';
  const success=document.getElementById('registrationSuccess');success.hidden=false;success.focus();success.scrollIntoView({block:'center',behavior:'smooth'});
 }catch(error){message.textContent=error.name==='AbortError'?'The connection timed out. Please retry with the same details; your registration will not be duplicated.':error instanceof TypeError?'Could not confirm your registration. Check your connection and retry with the same details.':error.message;message.focus();}
 finally{clearTimeout(timeout);button.disabled=false;button.textContent='Submit registration →';}
});
})();