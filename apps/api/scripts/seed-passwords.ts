import 'dotenv/config';
import pg from 'pg';
import bcrypt from 'bcryptjs';
async function main(){
 const password=process.env.DEMO_PASSWORD??'';
 if(password.length<12)throw new Error('Configure DEMO_PASSWORD com pelo menos 12 caracteres em apps/api/.env');
 const connectionString=process.env.DATABASE_URL;
 if(!connectionString)throw new Error('DATABASE_URL não configurada');
 const client=new pg.Client({connectionString,options:'-c search_path=peca_aqui,public'});
 await client.connect();
 try { const hash=await bcrypt.hash(password,12);
 const result=await client.query("UPDATE users SET password_hash=$1 WHERE email LIKE '%@demo.invalid' RETURNING email",[hash]);
 console.log('Senhas demonstrativas configuradas para:',result.rows.map(x=>x.email).join(', '));
 } finally { await client.end(); }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
