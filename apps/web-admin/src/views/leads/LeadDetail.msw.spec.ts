// @vitest-environment happy-dom
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { mountView, makeTestRouter } from '@/test/view-test-helpers';
import { type Router } from 'vue-router';
import { server, http, HttpResponse } from '@/test/msw';
import LeadDetail from './LeadDetail.vue';

/**
 * LeadDetail 端到端(MSW + 真实 router)
 *  - onMounted → GET /leads/:id + /users + /service-products → 详情
 *  - 分配律师:open dialog → select → POST → reload
 *  - 结构化分诊:open → fill → POST /triage → reload
 *  - 转为客户:open → fill → POST /clients/convert-from-lead → reload
 *  - 创建报价 → router.push /quotes/create?leadId=...
 */

const SAMPLE_LEAD = {
  id: 'l1',
  clientName: '王五',
  sourceChannel: '抖音',
  legalIssueType: '劳动',
  urgencyLevel: 'URGENT',
  emotionalState: '焦虑',
  intakeStatus: 'NEW_LEAD',
  contactMobile: '13800138000',
  contactEmail: 'wang@example.com',
  assignedLawyer: null,
  triages: [],
};

const SAMPLE_USERS = [
  { id: 'u1', realName: '王律师', roleType: 'LAWYER' },
  { id: 'u2', realName: '张合伙人', roleType: 'PARTNER' },
];

const SAMPLE_PRODUCTS = [{ id: 'p1', productName: '法律咨询(小时)' }];

let router: Router;

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());

beforeEach(async () => {
  vi.restoreAllMocks();
  localStorage.clear();
  router = await makeTestRouter(
    [
      { path: '/leads/:id', name: 'lead-detail', component: LeadDetail, meta: { public: true } },
      { path: '/quotes/create', name: 'quote-create' },
    ],
    '/leads/l1',
  );
});

async function mountDetail() {
  server.use(
    http.get(/\/api\/leads\/l1/, () => HttpResponse.json(SAMPLE_LEAD)),
    http.get(/\/api\/users/, () => HttpResponse.json(SAMPLE_USERS)),
    http.get(/\/api\/service-products/, () => HttpResponse.json(SAMPLE_PRODUCTS)),
  );
  return await mountView(LeadDetail, { router });
}

describe('LeadDetail 端到端(MSW)', () => {
  it('onMounted → 3 路并发加载 + 详情显示', async () => {
    const w = await mountDetail();
    const vm = w.vm as any;
    expect(vm.lead).toBeTruthy();
    expect(vm.lead.clientName).toBe('王五');
    expect(vm.users.length).toBe(2);
    expect(vm.products.length).toBe(1);
    expect(w.text()).toContain('王五');
    expect(w.text()).toContain('抖音');
    expect(w.text()).toContain('劳动');
  });

  it('分配律师:POST /leads/:id/assign-lawyer + reload', async () => {
    let postUrl = '';
    let postBody: any = null;
    server.use(
      http.get(/\/api\/leads\/l1/, () => HttpResponse.json(SAMPLE_LEAD)),
      http.get(/\/api\/users/, () => HttpResponse.json(SAMPLE_USERS)),
      http.get(/\/api\/service-products/, () => HttpResponse.json(SAMPLE_PRODUCTS)),
      http.post(/\/api\/leads\/.+\/assign-lawyer/, async ({ request }) => {
        postUrl = request.url;
        postBody = await request.json();
        return HttpResponse.json({ ok: true });
      }),
    );
    const w = await mountDetail();
    (w.vm as any).assignDialog = true;
    (w.vm as any).selectedLawyer = 'u1';
    await (w.vm as any).assignLawyer();
    await flushPromises();
    await flushPromises();
    expect(postUrl).toContain('/leads/l1/assign-lawyer');
    expect(postBody.lawyerId).toBe('u1');
    expect((w.vm as any).assignDialog).toBe(false);
  });

  it('结构化分诊:POST /leads/:id/triage + reload', async () => {
    let postUrl = '';
    let postBody: any = null;
    server.use(
      http.get(/\/api\/leads\/l1/, () => HttpResponse.json(SAMPLE_LEAD)),
      http.get(/\/api\/users/, () => HttpResponse.json(SAMPLE_USERS)),
      http.get(/\/api\/service-products/, () => HttpResponse.json(SAMPLE_PRODUCTS)),
      http.post(/\/api\/leads\/.+\/triage/, async ({ request }) => {
        postUrl = request.url;
        postBody = await request.json();
        return HttpResponse.json({ ok: true });
      }),
    );
    const w = await mountDetail();
    (w.vm as any).triageDialog = true;
    (w.vm as any).triageForm.factsSummary = '被解雇,要求赔偿';
    (w.vm as any).triageForm.evidenceSummary = '劳动合同 1 份';
    (w.vm as any).triageForm.urgencyReason = '濒临失业';
    (w.vm as any).triageForm.triageResult = 'STRUCTURED_DIAGNOSIS';
    (w.vm as any).triageForm.recommendedProductId = 'p1';
    (w.vm as any).triageForm.shouldTransferToLawyer = true;
    await (w.vm as any).submitTriage();
    await flushPromises();
    await flushPromises();
    expect(postUrl).toContain('/leads/l1/triage');
    expect(postBody.factsSummary).toBe('被解雇,要求赔偿');
    expect(postBody.recommendedProductId).toBe('p1');
    expect(postBody.shouldTransferToLawyer).toBe(true);
    expect((w.vm as any).triageDialog).toBe(false);
  });

  it('转为客户:POST /clients/convert-from-lead + reload', async () => {
    let postUrl = '';
    let postBody: any = null;
    server.use(
      http.get(/\/api\/leads\/l1/, () => HttpResponse.json(SAMPLE_LEAD)),
      http.get(/\/api\/users/, () => HttpResponse.json(SAMPLE_USERS)),
      http.get(/\/api\/service-products/, () => HttpResponse.json(SAMPLE_PRODUCTS)),
      http.post(/\/api\/clients\/convert-from-lead/, async ({ request }) => {
        postUrl = request.url;
        postBody = await request.json();
        return HttpResponse.json({ id: 'c1', ...postBody }, { status: 201 });
      }),
    );
    const w = await mountDetail();
    (w.vm as any).convertDialog = true;
    (w.vm as any).convertForm.clientName = '王五';
    (w.vm as any).convertForm.clientType = 'INDIVIDUAL';
    (w.vm as any).convertForm.contactName = '王五';
    (w.vm as any).convertForm.contactMobile = '13800138000';
    await (w.vm as any).convertToClient();
    await flushPromises();
    await flushPromises();
    expect(postUrl).toContain('/clients/convert-from-lead');
    expect(postBody.leadId).toBe('l1');
    expect(postBody.clientName).toBe('王五');
    expect(postBody.clientType).toBe('INDIVIDUAL');
    expect((w.vm as any).convertDialog).toBe(false);
  });

  it('创建报价 → router.push /quotes/create?leadId=l1', async () => {
    const w = await mountDetail();
    await (w.vm as any).quoteForLead();
    await flushPromises();
    await flushPromises();
    expect(router.currentRoute.value.name).toBe('quote-create');
    expect(router.currentRoute.value.query.leadId).toBe('l1');
  });
});
