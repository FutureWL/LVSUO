import { Global, Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';

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
  constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(PrismaModule.name);
  }

  async onModuleInit() {
    await this.prisma.$connect();
    this.logger.log('Prisma connected');
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }
}
