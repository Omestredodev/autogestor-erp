import { Body,Controller,Get,Injectable,Module,Param,Patch,Post,Query,Req, BadRequestException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { Permissions,Roles } from '../auth/auth';
import { dbError,payload,positiveId,requiredText } from '../common/validation';
import bcrypt from 'bcryptjs';
@Injectable() class AdminService {
 constructor(private readonly db:DbService){}
 users(){return this.db.q(`SELECT u.id,u.profile_id,u.name,u.email,u.active,u.created_at,p.name AS profile FROM users u JOIN profiles p ON p.id=u.profile_id ORDER BY u.id LIMIT 150`);}
 profiles(){return this.db.q('SELECT * FROM profiles ORDER BY id')}
 async addUser(input:unknown,actor:number){const d=payload(input);const password=requiredText(d.password,'Senha',200);if(password.length<12)throw new BadRequestException('Senha com mínimo de 12 caracteres');
  const hash=await bcrypt.hash(password,12);
  try{return await this.db.tx(actor,c=>this.db.one('INSERT INTO users(profile_id,name,email,password_hash) VALUES($1,$2,$3,$4) RETURNING id,profile_id,name,email,active',[
   positiveId(d.profile_id),requiredText(d.name,'Nome'),requiredText(d.email,'Email').toLowerCase(),hash],c));}catch(e){dbError(e)} }
 async updateUser(id:unknown,input:unknown,actor:number){const d=payload(input);if(typeof d.active!=='boolean')throw new BadRequestException('active deve ser booleano');
  return this.db.tx(actor,c=>this.db.one('UPDATE users SET active=$1 WHERE id=$2 RETURNING id,profile_id,name,email,active',[d.active,positiveId(id)],c));}
 audit(entity='',limit=100){return this.db.q(`SELECT e.*,u.name AS actor_name FROM audit_events e LEFT JOIN users u ON u.id=e.actor_id WHERE ($1='' OR e.entity=$1) ORDER BY e.id DESC LIMIT $2`,[entity,Math.max(1,Math.min(200,Number(limit)||100))]);}
}
@Controller() class AdminController {
 constructor(private readonly svc:AdminService){}
 @Permissions('AUDIT_READ') @Get(['audit','auditoria']) audit(@Query('entity') e?:string,@Query('limit') lim?:string){return this.svc.audit(e,Number(lim)||100)}
 @Roles('ADMIN') @Get(['users','usuarios']) users(){return this.svc.users()}
 @Roles('ADMIN') @Get(['profiles','perfis']) profiles(){return this.svc.profiles()}
 @Roles('ADMIN') @Post(['users','usuarios']) user(@Body() b:unknown,@Req() r:any){return this.svc.addUser(b,r.actor.id)}
 @Roles('ADMIN') @Patch(['users/:id','usuarios/:id']) update(@Param('id') id:string,@Body() b:unknown,@Req() r:any){return this.svc.updateUser(id,b,r.actor.id)}
}
@Module({controllers:[AdminController],providers:[AdminService]}) export class AdminModule {}
