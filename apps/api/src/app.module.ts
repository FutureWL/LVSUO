import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_PIPE, APP_FILTER } from '@nestjs/core';

import { PrismaModule } from './common/prisma/prisma.module';
import { TenantModule } from './common/tenant/tenant.module';
import { PermissionModule } from './common/permission/permission.module';
import { AuditModule } from './common/audit/audit.module';
import { HealthModule } from './common/health/health.module';

import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { TenantsModule } from './modules/tenant/tenant.module';
import { LeadModule } from './modules/lead/lead.module';
import { ProductModule } from './modules/product/product.module';
import { QuoteModule } from './modules/quote/quote.module';
import { MatterModule } from './modules/matter/matter.module';
import { ClientModule } from './modules/client/client.module';
import { ConversationModule } from './modules/conversation/conversation.module';
import { TimeEntryModule } from './modules/time-entry/time-entry.module';
import { KnowledgeCardModule } from './modules/knowledge-card/knowledge-card.module';

import { JwtAuthGuard } from './common/auth/jwt-auth.guard';
import { TenantGuard } from './common/tenant/tenant.guard';
import { PermissionGuard } from './common/permission/permission.guard';
import { AuditInterceptor } from './common/audit/audit.interceptor';
import { GlobalExceptionFilter } from './common/filter/global-exception.filter';

@Module({
  imports: [
    // 配置
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),

    // 基础设施
    PrismaModule,
    TenantModule,
    PermissionModule,
    AuditModule,
    HealthModule,

    // 业务模块
    AuthModule,
    UserModule,
    TenantsModule,
    LeadModule,
    ClientModule,
    ProductModule,
    QuoteModule,
    MatterModule,
    ConversationModule,
    TimeEntryModule,
    KnowledgeCardModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}
