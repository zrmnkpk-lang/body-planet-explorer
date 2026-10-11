import {mkdirSync,copyFileSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const dir=new URL('../assets/',import.meta.url);mkdirSync(dir,{recursive:true});
const sources={'maya-sport':'exec-ea2f9053-b69f-4e87-aeb2-429d37cf6a19.png','maya-body-analysis':'exec-b8aa109e-dde4-45cd-bdbb-a5c9ea2e965d.png','alex-account':'exec-d5231c7c-38df-4d2c-9d9d-f0eddfa0263e.png','riverlands-planet':'exec-d30f41dc-02ec-4d67-92c5-0178e2cef917.png'};
const prompts=JSON.parse(readFileSync(new URL('./assets-prompts.json',import.meta.url),'utf8'));
const assets=[];
for(const [name,file] of Object.entries(sources)){
 const source='C:/Users/xiaochuan/.codex/generated_images/01a10d42-990b-7301-8d13-8bb8c7c79639/'+file,target=new URL(name+'.png',dir);copyFileSync(source,target);
 const b=readFileSync(target);assets.push({name,file:'assets/'+name+'.png',original_generation_file:file,bytes:b.length,width:b.readUInt32BE(16),height:b.readUInt32BE(20),colorType:b[25],sha256:createHash('sha256').update(b).digest('hex'),prompt:prompts.assets.find(a=>a.name===name).prompt,status:'design-illustration-not-runtime-asset'});
}
writeFileSync(new URL('../assets.json',import.meta.url),JSON.stringify({tool:'built-in imagegen',assets},null,2)+'\n');console.log(JSON.stringify(assets.map(({prompt,...a})=>a)));
