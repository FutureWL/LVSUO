import { Global, Module, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Global()
@Module({
  providers: [
    {
      provide: PrismaClient,
      useFactory: async () => {
        const client = new PrismaClient({
          log: ['warn', 'error'],
        });
        return client;
      },
    },
  ],
  exports: [PrismaClient],
})
export class PrismaModule implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaModule.name);

  constructor(private readonly prisma: PrismaClient) {}

  async onModuleInit() {
    await this.prisma.$connect();
    this.logger.log('Prisma connected');
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }
}
