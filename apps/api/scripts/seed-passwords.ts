/**
 * SOMENTE DESENVOLVIMENTO LOCAL: quatro contas de demonstração com senhas
 * públicas e diferentes. Nunca rodar contra produção / banco com dados reais.
 * As senhas são convertidas em hash bcrypt (cost 12) antes de chegar ao banco.
 */
import 'dotenv/config';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const demoAccounts = [
  {profile:'ADMIN', name:'Administrador Demo', email:'admin@demo.invalid', password:'Admin@PecaAqui#2026!'},
  {profile:'SELLER', name:'Vendedor Demo', email:'vendedor@demo.invalid', password:'Vendas@PecaAqui#2026!'},
  {profile:'STOCK', name:'Estoquista Demo', email:'estoque@demo.invalid', password:'Estoque@PecaAqui#2026!'},
  {profile:'FINANCE', name:'Financeiro Demo', email:'financeiro@demo.invalid', password:'Financeiro@PecaAqui#2026!'},
] as const;

async function main(){
  const urlRaw=process.env.DATABASE_URL;
  if(!urlRaw)throw new Error('DATABASE_URL ausente. Confira apps/api/.env');
  const url=new URL(urlRaw);
  if(process.env.NODE_ENV==='production'||!['localhost','127.0.0.1'].includes(url.hostname)||url.pathname!=='/peca_aqui')
    throw new Error('Script limitado ao banco de demonstração local peca_aqui em localhost/127.0.0.1.');
  const client=new pg.Client({connectionString:urlRaw,options:'-c search_path=peca_aqui,public'});
  await client.connect();
  try{
    await client.query('BEGIN');
    // Uma transação: se faltar perfil ou houver erro, nada será alterado.
    for(const demo of demoAccounts){
      const profile=await client.query<{id:string}>(
        'SELECT id FROM profiles WHERE name=$1 AND active=TRUE',[demo.profile]);
      if(profile.rowCount!==1)throw new Error(`Perfil ${demo.profile} não encontrado na Entrega 1`);
      const passwordHash=await bcrypt.hash(demo.password,12);
      await client.query(`INSERT INTO users(profile_id,name,email,password_hash,active,approval_status,deleted_at,must_change_password,session_version)
       VALUES($1,$2,$3,$4,TRUE,'APPROVED',NULL,FALSE,1)
       ON CONFLICT(email) DO UPDATE SET profile_id=EXCLUDED.profile_id, name=EXCLUDED.name,
        password_hash=EXCLUDED.password_hash,active=TRUE,approval_status='APPROVED',deleted_at=NULL,
        must_change_password=FALSE,session_version=users.session_version+1`,
        [profile.rows[0].id,demo.name,demo.email,passwordHash]);
    }
    await client.query('COMMIT');
    console.log('OK: quatro usuários demonstrativos ativos, aprovados, com perfis e senhas individuais.');
    console.log('CREDENCIAIS SOMENTE PARA TESTES LOCAIS:');
    for(const d of demoAccounts)console.log(`${d.profile.padEnd(8)} ${d.email.padEnd(24)} ${d.password}`);
    console.log('ATENÇÃO: executar auth:seed novamente redefine as quatro senhas acima e revoga sessões anteriores.');
  }catch(error){await client.query('ROLLBACK');throw error}
  finally{await client.end()}
}
main().catch(error=>{console.error('Erro no seed de demonstração:',error instanceof Error?error.message:error);process.exitCode=1});
