import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
async function bootstrap(){
 const secret=process.env.JWT_SECRET??'';
 if(secret.length<32 || secret.includes('ALTERE_')) throw new Error('Defina JWT_SECRET seguro (32+ caracteres) em apps/api/.env');
 if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL ausente');
 const app=await NestFactory.create(AppModule,{rawBody:false});
 app.setGlobalPrefix('api/v1');
 const configuredOrigins=(process.env.CORS_ORIGIN??'http://localhost:5173').split(',').map(x=>x.trim()).filter(Boolean);
 // Dev: o Vite usa 127.0.0.1:5173, mas muitos usuários abrem localhost:5173.
 // Em produção, somente as origens explicitamente configuradas serão permitidas.
 const allowedOrigins=new Set(process.env.NODE_ENV==='production' ? configuredOrigins :
   [...configuredOrigins,'http://127.0.0.1:5173','http://localhost:5173']);
 app.enableCors({origin:Array.from(allowedOrigins),credentials:false});
 await app.listen(Number(process.env.PORT??3001),'127.0.0.1');
 console.log(`Peça-Aqui API em http://localhost:${process.env.PORT??3001}/api/v1`);
}
bootstrap().catch(e=>{console.error(e);process.exitCode=1;});
