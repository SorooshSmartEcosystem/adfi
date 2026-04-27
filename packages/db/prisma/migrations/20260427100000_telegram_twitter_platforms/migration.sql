-- Add Telegram + Twitter providers and the WEBSITE_ARTICLE platform.
-- Also relax the (user_id, provider) uniqueness on connected_accounts to
-- (user_id, provider, external_id) so a user can attach multiple bots /
-- channels / pages under the same provider.

-- AlterEnum: Provider
ALTER TYPE "Provider" ADD VALUE IF NOT EXISTS 'TELEGRAM';
ALTER TYPE "Provider" ADD VALUE IF NOT EXISTS 'TELEGRAM_CHANNEL';
ALTER TYPE "Provider" ADD VALUE IF NOT EXISTS 'TWITTER';

-- AlterEnum: Platform
ALTER TYPE "Platform" ADD VALUE IF NOT EXISTS 'TWITTER';
ALTER TYPE "Platform" ADD VALUE IF NOT EXISTS 'TELEGRAM';
ALTER TYPE "Platform" ADD VALUE IF NOT EXISTS 'WEBSITE_ARTICLE';

-- AlterEnum: MessageChannel
ALTER TYPE "MessageChannel" ADD VALUE IF NOT EXISTS 'TELEGRAM';

-- DropIndex + AddIndex on connected_accounts
DROP INDEX IF EXISTS "connected_accounts_user_id_provider_key";
CREATE UNIQUE INDEX IF NOT EXISTS "connected_accounts_user_id_provider_external_id_key"
  ON "connected_accounts" ("user_id", "provider", "external_id");
