import {readFile,writeFile,mkdir} from 'node:fs/promises';
import sharp from 'sharp';
const root=new URL('../',import.meta.url).pathname;
const out=root+'public/art/';await mkdir(out,{recursive:true});
async function image(id,input,fields){
 const raw=typeof input==='string'&&input.startsWith('https:')?Buffer.from(await (await fetch(input)).arrayBuffer()):input;
 const meta=await sharp(raw).metadata();
 await sharp(raw).rotate().resize(2000,2000,{fit:'inside',withoutEnlargement:true}).webp({quality:90}).toFile(out+id+'.webp');
 await sharp(raw).rotate().resize(640,640,{fit:'inside',withoutEnlargement:true}).webp({quality:84}).toFile(out+id+'-thumb.webp');
 return {id,...fields,src:'/art/'+id+'.webp',thumb:'/art/'+id+'-thumb.webp',width:meta.width,height:meta.height};
}
const merch=JSON.parse(await readFile('/tmp/cole-sources/merch.json','utf8'));
const professional=[];
for(const group of merch){
 const label=group.gacha.name.replace(/【.*?】/g,'').trim(),used=new Set();
 const priorities=[/パーカー|フーディ|hoodie/i,/Tシャツ|Ｔシャツ|T-Shirt/i];
 for(const pattern of priorities){
  if(used.size>=4)break;
  const award=group.awards.find(a=>pattern.test(a.name)&&!used.has(a.id)&&a.imagePathArray?.length);if(!award)continue;
  used.add(award.id);
  const source='https://firebasestorage.googleapis.com/v0/b/akibaedenlot.appspot.com/o/'+encodeURIComponent(award.imagePathArray[0])+'?alt=media';
  const title=label+' / '+award.name.replace(/【.*?】/g,'').replace(/\\u3000/g,' ').trim();
  const id='professional-'+String(professional.length+1).padStart(2,'0');
  professional.push(await image(id,source,{title,alt:title,origin:'akiba-eden-lot',source,url:`https://lot.akiba-eden.com/gacha/?booth=${group.boothId}&gacha=${group.gachaId}`,project:label}));
  console.log(id,title);
 }
}
// Preserve the selected opening sequence when refreshing the imported work.
const featuredAwards=['WVDTcOhlbNsEewnWqacn','DPF3f6tjWBTJLPeI2mIX','6etsydbMQYPQjMO5W0Gp'];
const featuredRank=item=>{
 const rank=featuredAwards.findIndex(id=>item.source.includes(id));
 return rank<0?featuredAwards.length:rank;
};
professional.sort((a,b)=>featuredRank(a)-featuredRank(b));
const websites=[];
for(const [slug,title,url] of [['mirailoom','Mirai Loom','https://mirailoom.com/'],['akihabara-global','AKIBA Tourism & Promotion','https://akihabara.global/'],['akihabara-premium','Akihabara Premium Collection','https://www.akihabara-premium.com/'],['dub-agent','Tokyo Dub Agent','https://dub-agent.com/']]){
 websites.push(await image('website-'+slug,'/tmp/cole-sources/'+slug+'.png',{title,alt:title+' — website homepage',source:url,url,origin:'website-screenshot'}));
}
const ig=JSON.parse(await readFile('/tmp/cole-sources/instagram.json','utf8'));
const posts=ig.links.filter(a=>/\/(p|reel)\//.test(a.url));
const photos=ig.images.filter(a=>/^(Photo|Video) by Cole Masaki/.test(a.alt));
const personal=[];
const duplicates={'Cn021DCJkx4':'personal-08','CWIBbUirEe_':'personal-02','CVK9Tkors54':'personal-05','CSUJQJGJabS':'personal-06'};
const linkedLocal={};
for(let i=0;i<photos.length;i++){
 const photo=photos[i];if(photo.alt.startsWith('Video'))continue;
 const code=posts[i].url.split('/').filter(Boolean).pop(),title=photo.alt.replace('Photo by Cole Masaki on ','').replace(/\.$/,'');
 if(duplicates[code]){linkedLocal[duplicates[code]]={url:posts[i].url};continue;}
 personal.push(await image('instagram-'+code,photo.src,{title,alt:photo.alt,origin:'instagram',source:posts[i].url,url:posts[i].url}));
 console.log('Instagram',code,title);
}
await writeFile(root+'src/imported-work.json',JSON.stringify({professional,websites,personal},null,2)+'\n');
const current=JSON.parse(await readFile(root+'src/content.json','utf8')),byId=Object.fromEntries(current.map(c=>[c.id,c]));
const result=[{id:'professional',label:'Professional Work',shortLabel:'Client',items:professional},{id:'websites',label:'Websites',shortLabel:'Web',items:websites},{...byId.personal,label:'Personal Work',shortLabel:'Personal',items:[...personal,...byId.personal.items.filter(i=>i.origin!=='instagram').map(i=>({...i,...linkedLocal[i.id]}))]},byId.zine,byId.game,byId.drawings];
const short={logos:'Logos',zine:'Zine',game:'Game',drawings:'Drawing'};
for(const c of result)c.shortLabel=c.shortLabel||short[c.id];
await writeFile(root+'src/content.json',JSON.stringify(result,null,2)+'\n');
console.log('Imported',professional.length,'merchandise images,',websites.length,'websites,',personal.length,'Instagram photos.');
