import { Body, Controller, Delete, Get, Injectable, Module, Param, Patch, Post, Query, Req, BadRequestException, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { DbService, Tx } from '../db/db.service';
import { Permissions, Roles, validEmail, validPassword } from '../auth/auth';
import { dbError, payload, positiveId, requiredText } from '../common/validation';

@Injectable() class AdminService {
 constructor(private readonly db:DbService){}
 users(){return this.db.q(`SELECT u.id,u.profile_id,u.name,u.email,u.active,u.approval_status,u.deleted_at,
   u.must_change_password,u.created_at,CASE WHEN u.approval_status='PENDING' THEN 'A DEFINIR' ELSE p.name END AS profile FROM users u
   JOIN profiles p ON p.id=u.profile_id ORDER BY u.id DESC LIMIT 200`);}
 profiles(){return this.db.q('SELECT id,name,active FROM profiles WHERE active ORDER BY id');}
 private async profileId(value:unknown,c:Tx){
  const id=positiveId(value);const p=await this.db.one('SELECT id,name FROM profiles WHERE id=$1 AND active',[id],c);
  if(!p)throw new BadRequestException('Perfil não encontrado');return id;
 }
 private async lockAdminChanges(c:Tx){await this.db.q('SELECT pg_advisory_xact_lock(33031,1)',[],c);}
 private async assertCanRemoveAdmin(target:any,c:Tx){
  if(target.profile!=='ADMIN'||!target.active||target.deleted_at)return;
  const x=await this.db.one(`SELECT count(*)::integer AS n FROM users u JOIN profiles p ON p.id=u.profile_id
   WHERE p.name='ADMIN' AND u.active AND u.approval_status='APPROVED' AND u.deleted_at IS NULL`,[],c);
  if(Number(x?.n??0)<=1)throw new ConflictException('É necessário manter pelo menos um administrador ativo');
 }
 private async target(id:unknown,c:Tx){
  const user=await this.db.one(`SELECT u.id,u.name,u.email,u.profile_id,u.active,u.approval_status,u.deleted_at,p.name AS profile
   FROM users u JOIN profiles p ON p.id=u.profile_id WHERE u.id=$1 FOR UPDATE`,[positiveId(id)],c);
  if(!user)throw new NotFoundException('Usuário não encontrado');return user;
 }
 private async wrap<T>(actorId:number,fn:(c:Tx)=>Promise<T>){
  try{return await this.db.tx(actorId,async c=>{await this.lockAdminChanges(c);return fn(c)});}catch(e){dbError(e)}
 }
 async addUser(input:unknown,actorId:number){
  const d=payload(input),name=requiredText(d.name,'Nome',150),email=validEmail(d.email);
  const supplied=d.password!==undefined&&d.password!=='';
  const temporaryPassword=supplied?validPassword(d.password):randomBytes(24).toString('base64url');
  const hash=await bcrypt.hash(temporaryPassword,12);
  return this.wrap(actorId,async c=>{
   const profileId=await this.profileId(d.profile_id,c);
   const row=await this.db.one(`INSERT INTO users(profile_id,name,email,password_hash,active,approval_status,must_change_password)
    VALUES($1,$2,$3,$4,TRUE,'APPROVED',TRUE)
    RETURNING id,profile_id,name,email,active,approval_status,must_change_password`,[profileId,name,email,hash],c);
   return {...row,temporaryPassword:supplied?null:temporaryPassword};
  });
 }
 async approve(id:unknown,input:unknown,actorId:number){
  const d=payload(input??{});
  return this.wrap(actorId,async c=>{
   const u=await this.target(id,c);
   if(u.deleted_at)throw new ConflictException('Usuário excluído não pode ser aprovado');
   if(u.approval_status!=='PENDING')throw new ConflictException('Apenas solicitações pendentes podem ser aprovadas');
   if(d.profile_id===undefined||d.profile_id===null||d.profile_id==='')
    throw new BadRequestException('Selecione o perfil do usuário antes de aprovar');
   const profileId=await this.profileId(d.profile_id,c);
   return this.db.one(`UPDATE users SET approval_status='APPROVED',active=TRUE,profile_id=$1,session_version=session_version+1
    WHERE id=$2 RETURNING id,name,email,active,approval_status,profile_id`,[profileId,u.id],c);
  });
 }
 async updateUser(id:unknown,input:unknown,actorId:number){
  const d=payload(input);
  if(!Object.keys(d).some(k=>['name','email','profile_id'].includes(k)))throw new BadRequestException('Informe nome, e-mail ou perfil');
  return this.wrap(actorId,async c=>{
   const u=await this.target(id,c);if(u.deleted_at)throw new ConflictException('Usuário já excluído');
   const name=d.name===undefined?u.name:requiredText(d.name,'Nome',150);
   const email=d.email===undefined?u.email:validEmail(d.email);
   const profileId=d.profile_id===undefined?u.profile_id:await this.profileId(d.profile_id,c);
   if(Number(u.id)===actorId&&profileId!==Number(u.profile_id))throw new ForbiddenException('Não é possível alterar seu próprio perfil');
   if(profileId!==Number(u.profile_id))await this.assertCanRemoveAdmin(u,c);
   return this.db.one(`UPDATE users SET name=$1,email=$2,profile_id=$3,session_version=session_version+1
    WHERE id=$4 RETURNING id,name,email,profile_id,active,approval_status`,[name,email,profileId,u.id],c);
  });
 }
 async deactivate(id:unknown,actorId:number){
  return this.wrap(actorId,async c=>{
   const u=await this.target(id,c);
   if(u.deleted_at)throw new ConflictException('Conta excluída');
   if(Number(u.id)===actorId)throw new ForbiddenException('Você não pode desativar a própria conta');
   await this.assertCanRemoveAdmin(u,c);
   return this.db.one('UPDATE users SET active=FALSE,session_version=session_version+1 WHERE id=$1 RETURNING id,active',[u.id],c);
  });
 }
 async reactivate(id:unknown,actorId:number){
  return this.wrap(actorId,async c=>{
   const u=await this.target(id,c);
   if(u.deleted_at)throw new ConflictException('Conta excluída não pode ser reativada');
   if(u.approval_status!=='APPROVED')throw new ConflictException('Aprove o cadastro antes de ativar');
   return this.db.one('UPDATE users SET active=TRUE,session_version=session_version+1 WHERE id=$1 RETURNING id,active',[u.id],c);
  });
 }
 async deleteUser(id:unknown,actorId:number){
  return this.wrap(actorId,async c=>{
   const u=await this.target(id,c);
   if(u.deleted_at)throw new ConflictException('Conta já excluída');
   if(Number(u.id)===actorId)throw new ForbiddenException('Você não pode excluir a própria conta');
   await this.assertCanRemoveAdmin(u,c);
   await this.db.q('UPDATE users SET active=FALSE,deleted_at=now(),session_version=session_version+1 WHERE id=$1',[u.id],c);
   return {deleted:true,id:Number(u.id),message:'Usuário excluído logicamente. Histórico preservado.'};
  });
 }
 async resetPassword(id:unknown,actorId:number){
  const temp=randomBytes(24).toString('base64url'),hash=await bcrypt.hash(temp,12);
  const result=await this.wrap(actorId,async c=>{
   const u=await this.target(id,c);
   if(u.deleted_at||u.approval_status!=='APPROVED')throw new ConflictException('Usuário indisponível para redefinição de senha');
   await this.db.q(`UPDATE users SET password_hash=$1,must_change_password=TRUE,session_version=session_version+1 WHERE id=$2`,[hash,u.id],c);
   return {id:Number(u.id),email:u.email};
  });
  return {...result,temporaryPassword:temp,message:'Senha temporária gerada. Copie agora: ela não será exibida novamente.'};
 }
 audit(entity='',limit=100){return this.db.q(`SELECT e.*,u.name AS actor_name FROM audit_events e LEFT JOIN users u ON u.id=e.actor_id
  WHERE ($1='' OR e.entity=$1) ORDER BY e.id DESC LIMIT $2`,[entity,Math.max(1,Math.min(200,Number(limit)||100))]);}
}
@Controller() class AdminController {
 constructor(private readonly svc:AdminService){}
 @Permissions('AUDIT_READ') @Get(['audit','auditoria']) audit(@Query('entity') e?:string,@Query('limit') lim?:string){return this.svc.audit(e,Number(lim)||100)}
 @Roles('ADMIN') @Get(['users','usuarios']) users(){return this.svc.users()}
 @Roles('ADMIN') @Get(['profiles','perfis']) profiles(){return this.svc.profiles()}
 @Roles('ADMIN') @Post(['users','usuarios']) user(@Body() b:unknown,@Req() r:any){return this.svc.addUser(b,r.actor.id)}
 @Roles('ADMIN') @Patch(['users/:id','usuarios/:id']) update(@Param('id') id:string,@Body() b:unknown,@Req() r:any){return this.svc.updateUser(id,b,r.actor.id)}
 @Roles('ADMIN') @Post(['users/:id/approve','usuarios/:id/approve']) approve(@Param('id') id:string,@Body() b:unknown,@Req() r:any){return this.svc.approve(id,b,r.actor.id)}
 @Roles('ADMIN') @Post(['users/:id/deactivate','usuarios/:id/deactivate']) deactivate(@Param('id') id:string,@Req() r:any){return this.svc.deactivate(id,r.actor.id)}
 @Roles('ADMIN') @Post(['users/:id/reactivate','usuarios/:id/reactivate']) reactivate(@Param('id') id:string,@Req() r:any){return this.svc.reactivate(id,r.actor.id)}
 @Roles('ADMIN') @Post(['users/:id/reset-password','usuarios/:id/reset-password']) reset(@Param('id') id:string,@Req() r:any){return this.svc.resetPassword(id,r.actor.id)}
 @Roles('ADMIN') @Delete(['users/:id','usuarios/:id']) remove(@Param('id') id:string,@Req() r:any){return this.svc.deleteUser(id,r.actor.id)}
}
@Module({controllers:[AdminController],providers:[AdminService]}) export class AdminModule {}
