import { Body, Controller, Get, Injectable, Module, Post, Req, SetMetadata, ExecutionContext, CanActivate, UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { DbService } from '../db/db.service';
import { payload, requiredText } from '../common/validation';

export type Actor = {id:number; name:string; email:string; profile:string; permissions:string[]};
export const PUBLIC='publicRoute'; export const Public=()=>SetMetadata(PUBLIC,true);
export const PERMISSIONS='permissions'; export const Permissions=(...permissions:string[])=>SetMetadata(PERMISSIONS,permissions);
export const ROLES='roles'; export const Roles=(...roles:string[])=>SetMetadata(ROLES,roles);

@Injectable()
export class AuthGuard implements CanActivate {
 constructor(private readonly jwt:JwtService, private readonly db:DbService, private readonly reflector:Reflector){}
 async canActivate(context:ExecutionContext):Promise<boolean> {
  if(this.reflector.getAllAndOverride<boolean>(PUBLIC,[context.getHandler(),context.getClass()])) return true;
  const request=context.switchToHttp().getRequest();
  const token=String(request.headers.authorization??'').match(/^Bearer\s+(.+)$/i)?.[1];
  if(!token) throw new UnauthorizedException('Faça login para continuar');
  try {
    const claims=await this.jwt.verifyAsync<{sub:number}>(token);
    const row=await this.db.one(`SELECT u.id,u.name,u.email,p.name AS profile
      FROM users u JOIN profiles p ON p.id=u.profile_id WHERE u.id=$1 AND u.active AND p.active`,[claims.sub]);
    if(!row) throw new UnauthorizedException();
    const grants=await this.db.q(`SELECT perm.code FROM permissions perm JOIN profile_permissions pp ON pp.permission_id=perm.id
      JOIN users u ON u.profile_id=pp.profile_id WHERE u.id=$1 AND pp.allowed`,[claims.sub]);
    request.actor={...row,id:Number(row.id),permissions:grants.map(x=>x.code)} as Actor;
    const roles=this.reflector.getAllAndOverride<string[]>(ROLES,[context.getHandler(),context.getClass()])??[];
    if(roles.length&&!roles.includes(request.actor.profile)) throw new ForbiddenException('Perfil sem autorização');
    const required=this.reflector.getAllAndOverride<string[]>(PERMISSIONS,[context.getHandler(),context.getClass()])??[];
    if(required.some(p=>!request.actor.permissions.includes(p))) throw new ForbiddenException('Sem permissão para esta operação');
    return true;
  } catch(e) {
    if(e instanceof ForbiddenException) throw e;
    throw new UnauthorizedException('Sessão inválida, expirada ou usuário inativo');
  }
 }
}
@Injectable() export class AuthService {
 constructor(private db:DbService,private jwt:JwtService){}
 async login(input: unknown){
  const data=payload(input); const email=requiredText(data.email,'E-mail',200).toLowerCase();
  const pass=requiredText(data.password,'Senha',200);
  const user=await this.db.one(`SELECT u.id,u.name,u.email,u.password_hash,u.active,p.name AS profile
    FROM users u JOIN profiles p ON p.id=u.profile_id WHERE lower(u.email)=$1`,[email]);
  if(!user||!user.active||!user.password_hash||!(await bcrypt.compare(pass,user.password_hash))) throw new UnauthorizedException('Credenciais inválidas');
  const token=await this.jwt.signAsync({sub:Number(user.id)}, {expiresIn:'8h'});
  return {accessToken:token, user:{id:Number(user.id), name:user.name,email:user.email,profile:user.profile}};
 }
}
@Controller('auth') export class AuthController {
 constructor(private auth:AuthService){}
 @Public() @Post('login') login(@Body() body:unknown){return this.auth.login(body);}
 @Get('me') me(@Req() req:any){return req.actor;}
}
@Module({imports:[JwtModule.register({secret:process.env.JWT_SECRET||'INVALID_MISSING_JWT_SECRET', signOptions:{issuer:'peca-aqui-api',audience:'peca-aqui-web'}})],
 providers:[AuthService,{provide:APP_GUARD,useClass:AuthGuard}], controllers:[AuthController], exports:[JwtModule]}) export class AuthModule {}
