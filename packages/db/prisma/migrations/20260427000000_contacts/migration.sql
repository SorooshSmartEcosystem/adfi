-- CreateTable
CREATE TABLE "contacts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "channel" "MessageChannel" NOT NULL,
    "external_id" TEXT NOT NULL,
    "display_name" TEXT,
    "avatar_url" TEXT,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contacts_user_id_channel_external_id_key" ON "contacts"("user_id", "channel", "external_id");

-- CreateIndex
CREATE INDEX "contacts_user_id_last_seen_at_idx" ON "contacts"("user_id", "last_seen_at");

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
