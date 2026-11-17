import { Controller,Get,Injectable,Module } from '@nestjs/common';
import { DbService } from '../db/db.service';
@Injectable() class DashboardService {constructor(private db:DbService){}
 async summary(){return this.db.one('SELECT * FROM v_dashboard_summary')}
 recent(){return this.db.q('SELECT * FROM v_sale_search ORDER BY sale_id DESC LIMIT 8')}
}
@Controller(['dashboard','painel']) class DashboardController {constructor(private svc:DashboardService){}
 @Get() summary(){return this.svc.summary()}
 @Get('recent') recent(){return this.svc.recent()}
}
@Module({controllers:[DashboardController],providers:[DashboardService]}) export class DashboardModule {}
