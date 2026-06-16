-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "tenant_name" VARCHAR(255) NOT NULL,
    "tenant_type" VARCHAR(50) NOT NULL,
    "deployment_mode" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "mobile" VARCHAR(50),
    "email" VARCHAR(100),
    "password_hash" VARCHAR(255) NOT NULL,
    "real_name" VARCHAR(100) NOT NULL,
    "role_type" VARCHAR(100) NOT NULL,
    "license_no" VARCHAR(100),
    "user_status" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_accounts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "platform" VARCHAR(100) NOT NULL,
    "account_name" VARCHAR(255) NOT NULL,
    "account_id" VARCHAR(255) NOT NULL,
    "owner_type" VARCHAR(50) NOT NULL,
    "owner_user_id" TEXT,
    "responsible_lawyer_id" TEXT,
    "operated_by_third_party" BOOLEAN NOT NULL DEFAULT false,
    "third_party_name" VARCHAR(255),
    "filing_status" VARCHAR(50) NOT NULL DEFAULT 'UNFILED',
    "risk_level" VARCHAR(50) NOT NULL DEFAULT 'LOW',
    "status" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_contents" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "account_id" TEXT,
    "content_type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content_text" TEXT NOT NULL,
    "media_file_id" TEXT,
    "ai_risk_result" JSONB,
    "review_status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    "risk_level" VARCHAR(50) NOT NULL DEFAULT 'LOW',
    "published_url" VARCHAR(500),
    "published_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "source_channel" VARCHAR(100) NOT NULL,
    "source_account_id" TEXT,
    "client_name" VARCHAR(255) NOT NULL,
    "contact_mobile" VARCHAR(50),
    "contact_email" VARCHAR(100),
    "legal_issue_type" VARCHAR(100),
    "urgency_level" VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
    "emotional_state" VARCHAR(50) NOT NULL DEFAULT 'NEUTRAL',
    "intake_status" VARCHAR(50) NOT NULL DEFAULT 'NEW_LEAD',
    "assigned_lawyer_id" TEXT,
    "recommended_product_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intake_triages" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "facts_summary" TEXT,
    "evidence_summary" TEXT,
    "urgency_reason" TEXT,
    "triage_result" VARCHAR(100),
    "recommended_product_id" TEXT,
    "should_transfer_to_lawyer" BOOLEAN NOT NULL DEFAULT false,
    "ai_generated" BOOLEAN NOT NULL DEFAULT false,
    "lawyer_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intake_triages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_service_products" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "product_name" VARCHAR(255) NOT NULL,
    "product_type" VARCHAR(100) NOT NULL,
    "applicable_scenarios" TEXT,
    "excluded_scenarios" TEXT,
    "service_scope" TEXT,
    "excluded_scope" TEXT,
    "deliverables" TEXT,
    "required_materials" TEXT,
    "price_type" VARCHAR(50),
    "base_price" DECIMAL(18,2),
    "delivery_days" INTEGER,
    "requires_lawyer" BOOLEAN NOT NULL DEFAULT true,
    "requires_partner_approval" BOOLEAN NOT NULL DEFAULT false,
    "risk_disclosure_template_id" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legal_service_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_quotes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "lead_id" TEXT,
    "client_id" TEXT,
    "matter_id" TEXT,
    "product_id" TEXT,
    "service_scope" TEXT,
    "excluded_scope" TEXT,
    "lawyer_fee" DECIMAL(18,2),
    "third_party_costs" JSONB,
    "payment_schedule" TEXT,
    "additional_fee_conditions" TEXT,
    "risk_disclosure_id" TEXT,
    "approved_by" TEXT,
    "client_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "client_name" VARCHAR(255) NOT NULL,
    "client_type" VARCHAR(50) NOT NULL,
    "credit_code" VARCHAR(100),
    "industry" VARCHAR(100),
    "contact_name" VARCHAR(100),
    "contact_mobile" VARCHAR(50),
    "contact_email" VARCHAR(100),
    "risk_level" VARCHAR(50) NOT NULL DEFAULT 'LOW',
    "health_score" INTEGER NOT NULL DEFAULT 100,
    "status" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matters" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "matter_no" VARCHAR(100) NOT NULL,
    "matter_title" VARCHAR(255) NOT NULL,
    "matter_type" VARCHAR(100),
    "dispute_amount" DECIMAL(18,2),
    "status" VARCHAR(100) NOT NULL DEFAULT 'LEAD',
    "confidentiality_level" VARCHAR(50) NOT NULL DEFAULT 'L3_MATTER_TEAM',
    "responsible_partner_id" TEXT,
    "lead_lawyer_id" TEXT,
    "billing_type" VARCHAR(50) NOT NULL,
    "budget_amount" DECIMAL(18,2),
    "opened_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lushi_conversations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "client_id" TEXT,
    "lead_id" TEXT,
    "matter_id" TEXT,
    "conversation_type" VARCHAR(50) NOT NULL,
    "channel" VARCHAR(50) NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "summary" TEXT,
    "risk_level" VARCHAR(50) NOT NULL DEFAULT 'LOW',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lushi_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lushi_messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_type" VARCHAR(50) NOT NULL,
    "sender_id" TEXT NOT NULL,
    "content_type" VARCHAR(50) NOT NULL,
    "content" TEXT NOT NULL,
    "audio_file_id" TEXT,
    "visibility" VARCHAR(50) NOT NULL,
    "ai_generated" BOOLEAN NOT NULL DEFAULT false,
    "lawyer_approved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lushi_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_entries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "matter_id" TEXT,
    "client_id" TEXT,
    "user_id" TEXT NOT NULL,
    "task_id" TEXT,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3),
    "duration_minutes" INTEGER,
    "work_type" VARCHAR(100),
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "billing_rate" DECIMAL(18,2),
    "internal_description" TEXT,
    "client_description" TEXT,
    "source" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'RUNNING',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_quality_checks" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "lead_id" TEXT,
    "matter_id" TEXT,
    "check_type" VARCHAR(100) NOT NULL,
    "checked_object_type" VARCHAR(100),
    "checked_object_id" TEXT,
    "score" INTEGER,
    "risk_flags" JSONB,
    "reviewer_id" TEXT,
    "review_comments" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_quality_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_cards" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "source_matter_id" TEXT,
    "title" VARCHAR(255) NOT NULL,
    "card_type" VARCHAR(100) NOT NULL,
    "practice_area" VARCHAR(100),
    "issue_tags" VARCHAR(500),
    "content" TEXT NOT NULL,
    "risk_notes" TEXT,
    "reusable_templates" TEXT,
    "visibility" VARCHAR(50) NOT NULL DEFAULT 'FIRM',
    "desensitized" BOOLEAN NOT NULL DEFAULT false,
    "review_status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    "reviewed_by" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" VARCHAR(100) NOT NULL,
    "resource_type" VARCHAR(100),
    "resource_id" TEXT,
    "data_level" VARCHAR(50),
    "ip" VARCHAR(50),
    "user_agent" TEXT,
    "input" JSONB,
    "output" JSONB,
    "result" VARCHAR(50) NOT NULL DEFAULT 'SUCCESS',
    "trace_id" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tenants_tenant_type_idx" ON "tenants"("tenant_type");

-- CreateIndex
CREATE INDEX "tenants_status_idx" ON "tenants"("status");

-- CreateIndex
CREATE INDEX "users_tenant_id_role_type_idx" ON "users"("tenant_id", "role_type");

-- CreateIndex
CREATE INDEX "users_tenant_id_user_status_idx" ON "users"("tenant_id", "user_status");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_username_key" ON "users"("tenant_id", "username");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_mobile_key" ON "users"("tenant_id", "mobile");

-- CreateIndex
CREATE INDEX "marketing_accounts_tenant_id_platform_idx" ON "marketing_accounts"("tenant_id", "platform");

-- CreateIndex
CREATE INDEX "marketing_accounts_tenant_id_status_idx" ON "marketing_accounts"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "marketing_contents_tenant_id_review_status_idx" ON "marketing_contents"("tenant_id", "review_status");

-- CreateIndex
CREATE INDEX "marketing_contents_tenant_id_content_type_idx" ON "marketing_contents"("tenant_id", "content_type");

-- CreateIndex
CREATE INDEX "marketing_contents_tenant_id_published_at_idx" ON "marketing_contents"("tenant_id", "published_at");

-- CreateIndex
CREATE INDEX "leads_tenant_id_intake_status_idx" ON "leads"("tenant_id", "intake_status");

-- CreateIndex
CREATE INDEX "leads_tenant_id_source_channel_idx" ON "leads"("tenant_id", "source_channel");

-- CreateIndex
CREATE INDEX "leads_tenant_id_created_at_idx" ON "leads"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "intake_triages_tenant_id_lead_id_idx" ON "intake_triages"("tenant_id", "lead_id");

-- CreateIndex
CREATE INDEX "intake_triages_tenant_id_triage_result_idx" ON "intake_triages"("tenant_id", "triage_result");

-- CreateIndex
CREATE INDEX "legal_service_products_tenant_id_product_type_idx" ON "legal_service_products"("tenant_id", "product_type");

-- CreateIndex
CREATE INDEX "legal_service_products_tenant_id_status_idx" ON "legal_service_products"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "fee_quotes_tenant_id_status_idx" ON "fee_quotes"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "fee_quotes_tenant_id_lead_id_idx" ON "fee_quotes"("tenant_id", "lead_id");

-- CreateIndex
CREATE INDEX "fee_quotes_tenant_id_client_id_idx" ON "fee_quotes"("tenant_id", "client_id");

-- CreateIndex
CREATE INDEX "clients_tenant_id_client_type_idx" ON "clients"("tenant_id", "client_type");

-- CreateIndex
CREATE INDEX "clients_tenant_id_health_score_idx" ON "clients"("tenant_id", "health_score");

-- CreateIndex
CREATE UNIQUE INDEX "matters_matter_no_key" ON "matters"("matter_no");

-- CreateIndex
CREATE INDEX "matters_tenant_id_status_idx" ON "matters"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "matters_tenant_id_client_id_idx" ON "matters"("tenant_id", "client_id");

-- CreateIndex
CREATE INDEX "matters_tenant_id_lead_lawyer_id_idx" ON "matters"("tenant_id", "lead_lawyer_id");

-- CreateIndex
CREATE INDEX "matters_tenant_id_confidentiality_level_idx" ON "matters"("tenant_id", "confidentiality_level");

-- CreateIndex
CREATE INDEX "lushi_conversations_tenant_id_user_id_started_at_idx" ON "lushi_conversations"("tenant_id", "user_id", "started_at");

-- CreateIndex
CREATE INDEX "lushi_conversations_tenant_id_matter_id_idx" ON "lushi_conversations"("tenant_id", "matter_id");

-- CreateIndex
CREATE INDEX "lushi_conversations_tenant_id_conversation_type_idx" ON "lushi_conversations"("tenant_id", "conversation_type");

-- CreateIndex
CREATE INDEX "lushi_messages_conversation_id_created_at_idx" ON "lushi_messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "time_entries_tenant_id_user_id_start_time_idx" ON "time_entries"("tenant_id", "user_id", "start_time");

-- CreateIndex
CREATE INDEX "time_entries_tenant_id_matter_id_idx" ON "time_entries"("tenant_id", "matter_id");

-- CreateIndex
CREATE INDEX "time_entries_tenant_id_status_idx" ON "time_entries"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "service_quality_checks_tenant_id_check_type_created_at_idx" ON "service_quality_checks"("tenant_id", "check_type", "created_at");

-- CreateIndex
CREATE INDEX "service_quality_checks_tenant_id_matter_id_idx" ON "service_quality_checks"("tenant_id", "matter_id");

-- CreateIndex
CREATE INDEX "knowledge_cards_tenant_id_card_type_idx" ON "knowledge_cards"("tenant_id", "card_type");

-- CreateIndex
CREATE INDEX "knowledge_cards_tenant_id_visibility_idx" ON "knowledge_cards"("tenant_id", "visibility");

-- CreateIndex
CREATE INDEX "knowledge_cards_tenant_id_review_status_idx" ON "knowledge_cards"("tenant_id", "review_status");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_action_created_at_idx" ON "audit_logs"("tenant_id", "action", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_user_id_created_at_idx" ON "audit_logs"("tenant_id", "user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_data_level_idx" ON "audit_logs"("tenant_id", "data_level");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_accounts" ADD CONSTRAINT "marketing_accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_accounts" ADD CONSTRAINT "marketing_accounts_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_contents" ADD CONSTRAINT "marketing_contents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_contents" ADD CONSTRAINT "marketing_contents_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "marketing_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_contents" ADD CONSTRAINT "marketing_contents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_lawyer_id_fkey" FOREIGN KEY ("assigned_lawyer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intake_triages" ADD CONSTRAINT "intake_triages_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intake_triages" ADD CONSTRAINT "intake_triages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_service_products" ADD CONSTRAINT "legal_service_products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_quotes" ADD CONSTRAINT "fee_quotes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_quotes" ADD CONSTRAINT "fee_quotes_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_quotes" ADD CONSTRAINT "fee_quotes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_quotes" ADD CONSTRAINT "fee_quotes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "legal_service_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matters" ADD CONSTRAINT "matters_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matters" ADD CONSTRAINT "matters_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matters" ADD CONSTRAINT "matters_responsible_partner_id_fkey" FOREIGN KEY ("responsible_partner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matters" ADD CONSTRAINT "matters_lead_lawyer_id_fkey" FOREIGN KEY ("lead_lawyer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lushi_conversations" ADD CONSTRAINT "lushi_conversations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lushi_conversations" ADD CONSTRAINT "lushi_conversations_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "matters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lushi_messages" ADD CONSTRAINT "lushi_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "lushi_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "matters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_quality_checks" ADD CONSTRAINT "service_quality_checks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_quality_checks" ADD CONSTRAINT "service_quality_checks_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_cards" ADD CONSTRAINT "knowledge_cards_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_cards" ADD CONSTRAINT "knowledge_cards_source_matter_id_fkey" FOREIGN KEY ("source_matter_id") REFERENCES "matters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_cards" ADD CONSTRAINT "knowledge_cards_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_cards" ADD CONSTRAINT "knowledge_cards_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
