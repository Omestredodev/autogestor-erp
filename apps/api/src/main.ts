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
 app.enableCors({origin:(process.env.CORS_ORIGIN??'http://localhost:5173').split(',').map(x=>x.trim()),credentials:false});
 await app.listen(Number(process.env.PORT??3001),'127.0.0.1');
 console.log(`Peça-Aqui API em http://localhost:${process.env.PORT??3001}/api/v1`);
}
bootstrap().catch(e=>{console.error(e);process.exitCode=1;});
