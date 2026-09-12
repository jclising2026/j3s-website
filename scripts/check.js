const fs=require('fs');
const vm=require('vm');
for(const path of ['customer-care.js','website-visit.js'])new vm.Script(fs.readFileSync(path,'utf8'),{filename:path});
const html=fs.readFileSync('index.html','utf8');
let count=0;
for(const match of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)){
  if(!match[2].trim())continue;
  if(match[1].includes('application/ld+json'))JSON.parse(match[2]);
  else new vm.Script(match[2],{filename:'index.html script '+(++count)});
}
for(const path of ['customer-care.css','CNAME','og-image.png'])if(!fs.existsSync(path))throw Error('Missing '+path);
if(fs.readFileSync('CNAME','utf8').trim()!=='j3sthebest.com')throw Error('Unexpected deployment domain');
console.log('PASS website scripts, structured data, local assets and domain');
