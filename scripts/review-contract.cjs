const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'..');
const read=x=>fs.readFileSync(path.join(root,x),'utf8');
const groups=[
 ['auth','apps/api/src/auth/auth.ts',['login','@Get(\'me\')']],
 ['catalog','apps/api/src/catalog/catalog.ts',['products','equivalences','applications']],
 ['operations','apps/api/src/operations/operations.ts',['confirm_purchase','confirm_sale','confirm_return','cancel_sale','adjust_stock']],
 ['finance','apps/api/src/finance/finance.ts',['create_closing','register_payment']],
 ['reminders','apps/api/src/reminders/reminders.ts',['reminder_recipients']],
 ['dashboard','apps/api/src/dashboard/dashboard.ts',['v_dashboard_summary']],
 ['admin','apps/api/src/admin/admin.ts',['Roles(\'ADMIN\')']]
];let failures=0;
for(const [name,file,terms] of groups){let code=read(file),missing=terms.filter(term=>!code.includes(term));if(missing.length){console.error(`FALTANDO ${name}:`,missing);failures++;}else console.log('OK',name);}
for(const f of ['apps/web/src/App.tsx','apps/web/src/views/styles.css','README_ENTREGA_2.md'])if(!fs.existsSync(path.join(root,f))){console.error('FALTANDO',f);failures++;}
if(failures)process.exit(1);console.log('Contrato estático de presença dos módulos: OK. Não substitui testes de execução.');
