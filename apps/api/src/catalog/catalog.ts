import { Body,Controller,Get,Injectable,Module,Param,Patch,Post,Query,Req,BadRequestException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { CrudService } from '../common/crud.service';
import { dbError,payload,positiveId,requiredText } from '../common/validation';
import { Permissions } from '../auth/auth';
@Injectable() class CatalogService {
 constructor(private readonly db:DbService,private readonly crud:CrudService){}
 products(q=''){return this.db.q(`SELECT ps.*,p.manufacturer_code,p.ean,p.oem_code,p.brand_id,p.category_id,p.unit_id,
 b.name AS brand,c.name AS category FROM v_product_stock ps JOIN products p ON p.id=ps.product_id
 JOIN brands b ON b.id=p.brand_id JOIN categories c ON c.id=p.category_id
 WHERE ($1='' OR p.internal_code ILIKE $2 OR p.description ILIKE $2 OR p.manufacturer_code ILIKE $2)
 ORDER BY p.id DESC LIMIT 200`,[q,`%${q}%`]);}
 detail(id:unknown){return this.crud.find('products',id)}
 detailEntity(entity:string,id:unknown){return this.crud.find(entity,id)}
 save(entity:string,body:unknown,actor:number,id?:unknown){return id===undefined?this.crud.create(entity,body,actor):this.crud.update(entity,id,body,actor)}
 list(entity:string,q=''){return this.crud.list(entity,q)}
 brands(){return this.db.q('SELECT * FROM brands ORDER BY name')}
 categories(){return this.db.q('SELECT * FROM categories ORDER BY name')}
 units(){return this.db.q('SELECT * FROM units ORDER BY symbol')}
 async options(entity:'brands'|'categories'|'units',input:unknown,actor:number){
  const d=payload(input);const name=requiredText(entity==='units'?d.symbol:d.name,entity==='units'?'Sigla':'Nome',120);
  return this.db.tx(actor,tx=>this.db.one(entity==='units'?
   'INSERT INTO units(symbol,description) VALUES($1,$2) RETURNING *':
   `INSERT INTO ${entity}(name) VALUES($1) RETURNING *`, entity==='units'?[name,requiredText(d.description,'Descrição',100)]:[name],tx));
 }
 async applications(product?:string,vehicle?:string){return this.db.q(`SELECT a.*,p.internal_code,p.description,v.manufacturer,v.model,v.engine,v.version,v.year_start,v.year_end
 FROM product_applications a JOIN products p ON p.id=a.product_id JOIN vehicles v ON v.id=a.vehicle_id
 WHERE ($1::bigint IS NULL OR a.product_id=$1) AND ($2::bigint IS NULL OR a.vehicle_id=$2) AND a.active ORDER BY a.id DESC LIMIT 200`,[product||null,vehicle||null]);}
 async addApplication(body:unknown,actor:number){const d=payload(body);const p=positiveId(d.product_id),v=positiveId(d.vehicle_id);
  try{return await this.db.tx(actor,tx=>this.db.one(`INSERT INTO product_applications(product_id,vehicle_id,notes) VALUES($1,$2,$3)
   ON CONFLICT(product_id,vehicle_id) DO UPDATE SET active=true,notes=EXCLUDED.notes RETURNING *`,[p,v,d.notes??null],tx));}catch(e){dbError(e)} }
 async removeApplication(id:unknown,actor:number){return this.db.tx(actor,tx=>this.db.one('UPDATE product_applications SET active=false WHERE id=$1 RETURNING *',[positiveId(id)],tx));}
 equivalences(product?:string){return this.db.q(`SELECT e.*,p.internal_code AS product_code,q.internal_code AS equivalent_code
 FROM v_equivalences_bidirectional e JOIN products p ON p.id=e.product_id JOIN products q ON q.id=e.equivalent_product_id
 WHERE e.active AND ($1::bigint IS NULL OR e.product_id=$1) ORDER BY e.equivalence_id LIMIT 200`,[product||null]);}
 async addEquivalent(body:unknown,actor:number){const d=payload(body);const a=positiveId(d.product_a_id),b=positiveId(d.product_b_id);if(a===b)throw new BadRequestException('Produtos devem ser diferentes');
  try{return await this.db.tx(actor,tx=>this.db.one(`INSERT INTO product_equivalences(product_a_id,product_b_id,created_by,notes)
   VALUES(LEAST($1::bigint,$2::bigint),GREATEST($1::bigint,$2::bigint),$3,$4)
   ON CONFLICT(product_a_id,product_b_id) DO UPDATE SET active=true,notes=EXCLUDED.notes RETURNING *`,[a,b,actor,d.notes??null],tx));}catch(e){dbError(e)} }
 async removeEquivalent(id:unknown,actor:number){return this.db.tx(actor,tx=>this.db.one('UPDATE product_equivalences SET active=false WHERE id=$1 RETURNING *',[positiveId(id)],tx));}
}
@Controller() class CatalogController {
 constructor(private readonly svc:CatalogService){}
 @Get(['products','produtos']) products(@Query('q') q?:string){return this.svc.products(q)}
 @Get(['products/:id','produtos/:id']) detail(@Param('id') id:string){return this.svc.detail(id)}
 @Permissions('PRODUCT_WRITE') @Post(['products','produtos']) add(@Body() b:unknown,@Req() r:any){return this.svc.save('products',b,r.actor.id)}
 @Permissions('PRODUCT_WRITE') @Patch(['products/:id','produtos/:id']) patch(@Param('id') id:string,@Body() b:unknown,@Req() r:any){return this.svc.save('products',b,r.actor.id,id)}
 @Get(['brands','marcas']) brands(){return this.svc.brands()}
 @Get(['categories','categorias']) categories(){return this.svc.categories()}
 @Get(['units','unidades']) units(){return this.svc.units()}
 @Permissions('PRODUCT_WRITE') @Post(['brands','marcas']) addBrand(@Body() b:unknown,@Req() r:any){return this.svc.options('brands',b,r.actor.id)}
 @Permissions('PRODUCT_WRITE') @Post(['categories','categorias']) addCategory(@Body() b:unknown,@Req() r:any){return this.svc.options('categories',b,r.actor.id)}
 @Permissions('PRODUCT_WRITE') @Post(['units','unidades']) addUnit(@Body() b:unknown,@Req() r:any){return this.svc.options('units',b,r.actor.id)}
 @Get(['vehicles','veiculos']) vehicles(@Query('q') q?:string){return this.svc.list('vehicles',q)}
 @Permissions('PRODUCT_WRITE') @Post(['vehicles','veiculos']) vehicle(@Body() b:unknown,@Req() r:any){return this.svc.save('vehicles',b,r.actor.id)}
 @Get(['applications','aplicacoes']) apps(@Query('productId') p?:string,@Query('vehicleId') v?:string){return this.svc.applications(p,v)}
 @Permissions('PRODUCT_WRITE') @Post(['applications','aplicacoes']) application(@Body() b:unknown,@Req() r:any){return this.svc.addApplication(b,r.actor.id)}
 @Permissions('PRODUCT_WRITE') @Patch(['applications/:id/deactivate','aplicacoes/:id/deactivate']) deactivateApp(@Param('id') id:string,@Req() r:any){return this.svc.removeApplication(id,r.actor.id)}
 @Get(['equivalences','equivalencias']) equivalents(@Query('productId') p?:string){return this.svc.equivalences(p)}
 @Permissions('PRODUCT_WRITE') @Post(['equivalences','equivalencias']) equivalent(@Body() b:unknown,@Req() r:any){return this.svc.addEquivalent(b,r.actor.id)}
 @Permissions('PRODUCT_WRITE') @Patch(['equivalences/:id/deactivate','equivalencias/:id/deactivate']) deactivateEq(@Param('id') id:string,@Req() r:any){return this.svc.removeEquivalent(id,r.actor.id)}
 @Get(['customers','clientes']) customers(@Query('q') q?:string){return this.svc.list('customers',q)}
 @Get(['customers/:id','clientes/:id']) customer(@Param('id') id:string){return this.svc.detailEntity('customers',id)}
 @Permissions('SALE_CONFIRM') @Post(['customers','clientes']) addCustomer(@Body() b:unknown,@Req() r:any){return this.svc.save('customers',b,r.actor.id)}
 @Permissions('SALE_CONFIRM') @Patch(['customers/:id','clientes/:id']) patchCustomer(@Param('id') id:string,@Body() b:unknown,@Req() r:any){return this.svc.save('customers',b,r.actor.id,id)}
 @Get(['suppliers','fornecedores']) suppliers(@Query('q') q?:string){return this.svc.list('suppliers',q)}
 @Permissions('PURCHASE_CONFIRM') @Post(['suppliers','fornecedores']) addSupplier(@Body() b:unknown,@Req() r:any){return this.svc.save('suppliers',b,r.actor.id)}
 @Permissions('PURCHASE_CONFIRM') @Patch(['suppliers/:id','fornecedores/:id']) patchSupplier(@Param('id') id:string,@Body() b:unknown,@Req() r:any){return this.svc.save('suppliers',b,r.actor.id,id)}
}
@Module({controllers:[CatalogController],providers:[CrudService,CatalogService]}) export class CatalogModule {}
