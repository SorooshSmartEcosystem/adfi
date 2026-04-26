-- CreateTable
CREATE TABLE "onboarding_previews" (
    "id" UUID NOT NULL,
    "ip_hash" TEXT NOT NULL,
    "resume_token" TEXT NOT NULL,
    "business_description" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "email" TEXT,
    "saved_at" TIMESTAMP(3),
    "converted_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onboarding_previews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_previews_resume_token_key" ON "onboarding_previews"("resume_token");

-- CreateIndex
CREATE INDEX "onboarding_previews_ip_hash_created_at_idx" ON "onboarding_previews"("ip_hash", "created_at");

-- CreateIndex
CREATE INDEX "onboarding_previews_email_idx" ON "onboarding_previews"("email");
