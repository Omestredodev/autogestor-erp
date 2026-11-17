import { Module, Controller, Get } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from './db/db.module';
import { AuthModule, Public } from './auth/auth';
import { CatalogModule } from './catalog/catalog';
import { OperationsModule } from './operations/operations';
import { FinanceModule } from './finance/finance';
import { RemindersModule } from './reminders/reminders';
import { AdminModule } from './admin/admin';
import { DashboardModule } from './dashboard/dashboard';
@Controller('health') class HealthController { @Public() @Get() health(){return {status:'ok',service:'peca-aqui-api'};} }
@Module({imports:[ConfigModule.forRoot({isGlobal:true}),DbModule,AuthModule,CatalogModule,OperationsModule,FinanceModule,RemindersModule,AdminModule,DashboardModule],controllers:[HealthController]})
export class AppModule {}
