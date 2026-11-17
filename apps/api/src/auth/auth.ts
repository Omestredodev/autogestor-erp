import { Body, Controller, Get, Injectable, Module, Post, Req, SetMetadata, ExecutionContext, CanActivate, UnauthorizedException, ForbiddenException, BadRequestException, ServiceUnavailableException, HttpException, HttpStatus } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { DbService } from '../db/db.service';
import { payload, requiredText } from '../common/validation';

export type Actor = {id:number;name:string;email:string;profile:string;permissions:string[];mustChangePassword:boolean};
export const PUBLIC='publicRoute'; export const Public=()=>SetMetadata(PUBLIC,true);
export const PERMISSIONS='permissions'; export const Permissions=(...permissions:string[])=>SetMetadata(PERMISSIONS,permissions);
export const ROLES='roles'; export const Roles=(...roles:string[])=>SetMetadata(ROLES,roles);
export const ALLOW_PASSWORD_CHANGE='allowPasswordChange';
export const AllowPasswordChange=()=>SetMetadata(ALLOW_PASSWORD_CHANGE,true);

export function validEmail(raw:unknown):string {
 const email=requiredText(raw,'E-mail',200).toLowerCase();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException('E-mail inválido');
 return email;
}
export function validPassword(raw:unknown,field='Senha'):string {
 if(typeof raw!=='string'||raw.length<12||Buffer.byteLength(raw,'utf8')>72||!raw.trim())
  throw new BadRequestException(`${field}: use 12 ou mais caracteres (máximo de 72 bytes)`);
 if(raw.trim()!==raw)throw new BadRequestException(`${field}: retire espaços do início ou do fim`);
 return raw;
}
function existingPassword(raw:unknown):string {
 if(typeof raw!=='string'||!raw||Buffer.byteLength(raw,'utf8')>200)throw new BadRequestException('Informe uma senha válida');
 return raw;
}

// Limitador simples, por processo. Em produção também é necessário um rate-limit no proxy/Redis.
@Injectable() export class LoginLimiter {
 private attempts=new Map<string,{count:number;until:number}>();
 assert(key:string,limit:number){
  const now=Date.now(); if(this.attempts.size>10000){for(const [k,v] of this.attempts)if(v.until<now)this.attempts.delete(k);}
  const x=this.attempts.get(key);if(x&&x.until>now&&x.count>=limit)throw new HttpException('Muitas tentativas. Tente novamente mais tarde.',HttpStatus.TOO_MANY_REQUESTS);
 }
 fail(key:string){const now=Date.now(),x=this.attempts.get(key);this.attempts.set(key,{count:(x&&x.until>now?x.count:0)+1,until:now+15*60*1000});}
 success(key:string){this.attempts.delete(key);}
}

@Injectable()
export class AuthGuard implements CanActivate {
 constructor(private readonly jwt:JwtService, private readonly db:DbService, private readonly reflector:Reflector){}
 async canActivate(context:ExecutionContext):Promise<boolean> {
  if(this.reflector.getAllAndOverride<boolean>(PUBLIC,[context.getHandler(),context.getClass()]))return true;
  const request=context.switchToHttp().getRequest();
  const token=String(request.headers.authorization??'').match(/^Bearer\s+(.+)$/i)?.[1];
  if(!token)throw new UnauthorizedException('Faça login para continuar');
  let claims:{sub:number;ver:number};
  try{claims=await this.jwt.verifyAsync<{sub:number;ver:number}>(token,{issuer:'peca-aqui-api',audience:'peca-aqui-web'});}
  catch{throw new UnauthorizedException('Sessão inválida ou expirada');}
  if(!Number.isSafeInteger(claims.sub)||!Number.isSafeInteger(claims.ver))throw new UnauthorizedException('Sessão inválida');
  const row=await this.db.one(`SELECT u.id,u.name,u.email,u.session_version,u.must_change_password,p.name AS profile
   FROM users u JOIN profiles p ON p.id=u.profile_id
   WHERE u.id=$1 AND u.active AND u.approval_status='APPROVED' AND u.deleted_at IS NULL AND p.active`,[claims.sub]);
  if(!row||Number(row.session_version)!==claims.ver)throw new UnauthorizedException('Sessão revogada ou usuário inativo');
  const grants=await this.db.q(`SELECT perm.code FROM permissions perm JOIN profile_permissions pp ON pp.permission_id=perm.id
   JOIN users u ON u.profile_id=pp.profile_id WHERE u.id=$1 AND pp.allowed`,[claims.sub]);
  request.actor={id:Number(row.id),name:row.name,email:row.email,profile:row.profile,
   permissions:grants.map(x=>x.code),mustChangePassword:!!row.must_change_password} as Actor;
  const allowPasswordChange=this.reflector.getAllAndOverride<boolean>(ALLOW_PASSWORD_CHANGE,[context.getHandler(),context.getClass()]);
  if(row.must_change_password&&!allowPasswordChange)throw new ForbiddenException('Você precisa trocar a senha temporária para continuar');
  const roles=this.reflector.getAllAndOverride<string[]>(ROLES,[context.getHandler(),context.getClass()])??[];
  if(roles.length&&!roles.includes(request.actor.profile))throw new ForbiddenException('Perfil sem autorização');
  const required=this.reflector.getAllAndOverride<string[]>(PERMISSIONS,[context.getHandler(),context.getClass()])??[];
  if(required.some(p=>!request.actor.permissions.includes(p)))throw new ForbiddenException('Sem permissão para esta operação');
  return true;
 }
}
@Injectable() export class AuthService {
 constructor(private db:DbService,private jwt:JwtService,private limiter:LoginLimiter){}
 async register(input:unknown,ip:string){
  const d=payload(input),name=requiredText(d.name,'Nome',150),email=validEmail(d.email);
  const password=validPassword(d.password);if(password!==d.confirmPassword)throw new BadRequestException('As senhas não conferem');
  const rateKey='register:'+ip;this.limiter.assert(rateKey,5);this.limiter.fail(rateKey);
  const profile=await this.db.one("SELECT id FROM profiles WHERE name='SELLER' AND active");
  if(!profile)throw new ServiceUnavailableException('Cadastro temporariamente indisponível; perfil inicial não encontrado');
  const hash=await bcrypt.hash(password,12);
  try { await this.db.tx(null,c=>this.db.one(`INSERT INTO users(profile_id,name,email,password_hash,active,approval_status)
    VALUES ($1,$2,$3,$4,FALSE,'PENDING') RETURNING id`,[profile.id,name,email,hash],c)); }
  catch(e:any){if(e?.code!=='23505')throw e;}
  return {message:'Solicitação recebida. Se o cadastro for elegível, o administrador poderá aprová-lo. Você ainda não pode entrar.'};
 }
 async login(input:unknown,ip:string){
  const d=payload(input),email=validEmail(d.email);
  const password=existingPassword(d.password);
  const key='login:'+ip+':'+email;this.limiter.assert(key,6);
  const user=await this.db.one(`SELECT u.id,u.name,u.email,u.password_hash,u.active,u.session_version,u.must_change_password,
   u.approval_status,u.deleted_at,p.name AS profile,p.active AS profile_active
   FROM users u JOIN profiles p ON p.id=u.profile_id WHERE lower(u.email)=$1`,[email]);
  if(!user||!user.active||!user.profile_active||user.approval_status!=='APPROVED'||user.deleted_at||
   !user.password_hash||!(await bcrypt.compare(password,user.password_hash))){
   this.limiter.fail(key);throw new UnauthorizedException('Credenciais inválidas ou conta ainda não aprovada');
  }
  this.limiter.success(key);
  const token=await this.jwt.signAsync({sub:Number(user.id),ver:Number(user.session_version)},{expiresIn:'8h'});
  return {accessToken:token,user:{id:Number(user.id),name:user.name,email:user.email,profile:user.profile,mustChangePassword:user.must_change_password}};
 }
 async changePassword(input:unknown,actor:Actor){
  const d=payload(input),oldPassword=existingPassword(d.oldPassword),newPassword=validPassword(d.newPassword,'Nova senha');
  if(newPassword!==d.confirmPassword)throw new BadRequestException('As novas senhas não conferem');
  if(oldPassword===newPassword)throw new BadRequestException('A nova senha deve ser diferente da atual');
  return this.db.tx(actor.id,async c=>{
   const row=await this.db.one('SELECT password_hash FROM users WHERE id=$1 AND active AND deleted_at IS NULL FOR UPDATE',[actor.id],c);
   if(!row?.password_hash||!(await bcrypt.compare(oldPassword,row.password_hash)))throw new UnauthorizedException('Senha atual incorreta');
   const hash=await bcrypt.hash(newPassword,12);
   await this.db.q('UPDATE users SET password_hash=$1,must_change_password=FALSE,session_version=session_version+1 WHERE id=$2',[hash,actor.id],c);
   return {message:'Senha alterada. Faça login novamente com sua nova senha.'};
  });
 }
 async logout(actor:Actor){await this.db.tx(actor.id,c=>this.db.q('UPDATE users SET session_version=session_version+1 WHERE id=$1',[actor.id],c));return {message:'Sessão encerrada'};}
}
@Controller('auth') export class AuthController {
 constructor(private readonly auth:AuthService){}
 @Public() @Post('register') register(@Body() b:unknown,@Req() req:any){return this.auth.register(b,String(req.ip??'unknown'));}
 @Public() @Post('login') login(@Body() b:unknown,@Req() req:any){return this.auth.login(b,String(req.ip??'unknown'));}
 @AllowPasswordChange() @Get('me') me(@Req() req:any){return req.actor;}
 @AllowPasswordChange() @Post('change-password') change(@Body() b:unknown,@Req() req:any){return this.auth.changePassword(b,req.actor);}
 @AllowPasswordChange() @Post('logout') logout(@Req() req:any){return this.auth.logout(req.actor);}
}
@Module({imports:[JwtModule.register({secret:process.env.JWT_SECRET||'INVALID_MISSING_JWT_SECRET',
 signOptions:{issuer:'peca-aqui-api',audience:'peca-aqui-web'}})],
 providers:[AuthService,LoginLimiter,{provide:APP_GUARD,useClass:AuthGuard}],controllers:[AuthController],exports:[JwtModule]}) export class AuthModule {}
