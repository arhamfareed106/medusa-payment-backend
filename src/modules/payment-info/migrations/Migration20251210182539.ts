import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20251210182539 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "order_payment_info" ("id" text not null, "transaction_id" text null, "payment_status" text check ("payment_status" in ('pending', 'paid', 'awaiting')) not null default 'pending', "payment_method" text check ("payment_method" in ('cod', 'bank_transfer')) not null default 'cod', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "order_payment_info_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_order_payment_info_deleted_at" ON "order_payment_info" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "order_payment_info" cascade;`);
  }

}
