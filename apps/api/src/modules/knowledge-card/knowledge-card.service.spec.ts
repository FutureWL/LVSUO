import { KnowledgeCardService } from './knowledge-card.service';
import { makePrismaMock } from '../../common/test/prisma-mock';

/**
 * KnowledgeCardService 单测
 *  - findByTenant: 只取 reviewStatus=APPROVED
 *  - findByTenant(cardType): 加 cardType 过滤
 */

describe('KnowledgeCardService', () => {
  let service: KnowledgeCardService;
  let prisma: any;

  beforeEach(() => {
    prisma = makePrismaMock();
    service = new KnowledgeCardService(prisma);
  });

  function setupPrisma(spec: Record<string, any> = {}) {
    prisma = makePrismaMock(spec);
    service = new KnowledgeCardService(prisma);
  }

  describe('findByTenant', () => {
    it('默认只取 reviewStatus=APPROVED, 按 createdAt desc', async () => {
      const findManyFn = jest.fn().mockResolvedValue([{ id: 'c1' }]);
      setupPrisma({ 'knowledgeCard.findMany': findManyFn });

      const res = await service.findByTenant('t1');
      expect(res).toEqual([{ id: 'c1' }]);
      expect(findManyFn).toHaveBeenCalledWith({
        where: { tenantId: 't1', reviewStatus: 'APPROVED' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('传 cardType → 加过滤', async () => {
      const findManyFn = jest.fn().mockResolvedValue([]);
      setupPrisma({ 'knowledgeCard.findMany': findManyFn });

      await service.findByTenant('t1', 'JUDGMENT');
      expect(findManyFn).toHaveBeenCalledWith({
        where: { tenantId: 't1', cardType: 'JUDGMENT', reviewStatus: 'APPROVED' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
