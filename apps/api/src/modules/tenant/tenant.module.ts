import { Module } from '@nestjs/common';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';
import { PlatformTenantController } from './platform-tenant.controller';
import { PlatformTenantService } from './platform-tenant.service';

@Module({
  controllers: [TenantController, PlatformTenantController],
  providers: [TenantService, PlatformTenantService],
  exports: [TenantService, PlatformTenantService],
})
export class TenantsModule {}
