// Validação de sintaxe TS/TSX sem executar a API. Exige npm install em apps/api.
const fs=require('fs'),path=require('path');
let ts;
try{ts=require('../apps/api/node_modules/typescript');}catch{
 try{ts=require('../apps/web/node_modules/typescript')}catch{
 console.error('Instale dependências em apps/api com npm install antes de executar este script.');process.exit(2);
 }}
let errors=[],count=0;
for(const base of ['../apps/api/src','../apps/web/src']){
 const root=path.resolve(__dirname,base);
 function scan(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){
  const p=path.join(dir,e.name);
  if(e.isDirectory()) scan(p);
  else if(/\.tsx?$/.test(p)){
   count++;const file=ts.createSourceFile(p,fs.readFileSync(p,'utf8'),ts.ScriptTarget.Latest,true,p.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
   for(const d of file.parseDiagnostics){let at=file.getLineAndCharacterOfPosition(d.start);errors.push(`${p}:${at.line+1}: ${ts.flattenDiagnosticMessageText(d.messageText,' ')}`);}
  }
 }}scan(root);
}
console.log(`TS/TSX verificados: ${count}; erros de sintaxe: ${errors.length}`);
for(const e of errors)console.error(e);
if(errors.length)process.exit(1);
