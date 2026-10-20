import { mkdir,writeFile } from 'node:fs/promises';
const decode=v=>v.stringValue??v.booleanValue??(v.integerValue!==undefined?Number(v.integerValue):v.doubleValue??(v.mapValue?Object.fromEntries(Object.entries(v.mapValue.fields||{}).map(([k,x])=>[k,decode(x)])):v.arrayValue?(v.arrayValue.values||[]).map(decode):null));
const base='https://firestore.googleapis.com/v1/projects/akibaedenlot/databases/(default)/documents/';
await mkdir('/tmp/cole-sources',{recursive:true});
const source=await (await fetch(base+'pickupGachas?pageSize=100')).json();
const output=[];
for(const doc of source.documents){
 const fields=Object.fromEntries(Object.entries(doc.fields).map(([k,v])=>[k,decode(v)]));if(!fields.isPublic)continue;
 const path=`boothes/${fields.boothId}/gachas/${fields.gachaId}`;
 const g=await(await fetch(base+path)).json();
 const a=await(await fetch(base+path+'/awards?pageSize=100')).json();
 output.push({...fields,gacha:Object.fromEntries(Object.entries(g.fields||{}).map(([k,v])=>[k,decode(v)])),awards:(a.documents||[]).map(d=>({id:d.name.split('/').pop(),...Object.fromEntries(Object.entries(d.fields).map(([k,v])=>[k,decode(v)]))}))});
 console.log(output.at(-1).gacha.name,output.at(-1).awards.length);
}
await writeFile('/tmp/cole-sources/merch.json',JSON.stringify(output,null,2));
