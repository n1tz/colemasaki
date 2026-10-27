// Import the four supplied originals without modifying them.
import {readFile,writeFile,copyFile,rm} from 'node:fs/promises';
import {join,basename} from 'node:path';
import sharp from 'sharp';
const sourceRoot=process.argv[2]||'/run/media/n1tz/Storage/Work';
const collections=JSON.parse(await readFile('src/content.json','utf8'));
async function artwork(id,source,title,alt){
 const input=join(sourceRoot,source),meta=await sharp(input).metadata();
 for(const [suffix,size,quality] of [['',2400,92],['-thumb',640,86]])await sharp(input).rotate().resize(size,size,{fit:'inside',withoutEnlargement:true}).webp({quality}).toFile(`public/art/${id}${suffix}.webp`);
 return {id,source:basename(source),title,alt,origin:'local-curated',src:`/art/${id}.webp`,thumb:`/art/${id}-thumb.webp`,width:meta.width,height:meta.height};
}
const professional=collections.find(c=>c.id==='professional');
const poster=await artwork('professional-komuro','Freelance/Komuro/komuroproj3B3.png','Japan Society of Aesthetic Plastic Surgery — 48th Annual Meeting','Conference poster combining a portrait, anatomical drawings, and the words Outer Beauty, Inner Confidence');
professional.items=professional.items.filter(i=>i.id!==poster.id);professional.items.splice(2,0,poster);
const personal=collections.find(c=>c.id==='personal');
const additions=await Promise.all([
 artwork('personal-rhinoplasty','Freelance/Komuro/KomuroNose1Test.png','Rhinoplasty','Black and white anatomical profile with measurement diagrams and Rhinoplasty typography'),
 artwork('personal-stein-inflated','Freelance/STEIN/inflatedstein1CCB.png','TAKARACUP STEIN','Metallic TAKARACUP lettering above inflated pink STEIN typography'),
 artwork('personal-stein-brain','Freelance/STEIN/SteinBrain1.3.png','STEIN — Brain','Inflated pink brain with a metallic Japanese character')
]);
additions[2].url=personal.items.find(i=>i.id==='instagram-C4hnuuIJCo0')?.url||'https://www.instagram.com/colemasaki/p/C4hnuuIJCo0/';
personal.items=personal.items.filter(i=>i.id!=='instagram-C4hnuuIJCo0'&&!additions.some(a=>a.id===i.id));personal.items.splice(4,0,...additions);
const imported=JSON.parse(await readFile('src/imported-work.json','utf8'));
for(const key of Object.keys(imported))imported[key]=imported[key].filter(i=>i.id!=='instagram-C4hnuuIJCo0');
await writeFile('src/imported-work.json',JSON.stringify(imported,null,2)+'\n');
for(const suffix of ['','-thumb'])await rm(`public/art/instagram-C4hnuuIJCo0${suffix}.webp`,{force:true});
const fonts={id:'fonts',label:'Fonts',items:[]};
for(const [family,title] of [['Gutz','GUTZ'],['Yomenee','Yomenee']]){
 await copyFile(join(sourceRoot,'Fonts',family+'.ttf'),'public/fonts/'+family+'.ttf');
 fonts.items.push({id:'font-'+family.toLowerCase(),title,alt:title+' — custom typeface specimen',source:family+'.ttf',origin:'custom-typeface',fontFamily:family,download:'/fonts/'+family+'.ttf',src:'/art/font-'+family.toLowerCase()+'.webp',thumb:'/art/font-'+family.toLowerCase()+'-thumb.webp',width:1400,height:1400});
}
const old=collections.findIndex(c=>c.id==='fonts');if(old>=0)collections.splice(old,1);
collections.splice(collections.findIndex(c=>c.id==='logos')+1,0,fonts);
await writeFile('src/content.json',JSON.stringify(collections,null,2)+'\n');
console.log(collections.map(c=>`${c.label}: ${c.items.length}`).join('\n'));
