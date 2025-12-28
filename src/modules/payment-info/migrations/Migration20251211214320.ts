import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20251211214320 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "order_payment_info" add column if not exists "original_total" numeric null, add column if not exists "adjusted_total" numeric null, add column if not exists "adjustment_amount" numeric null, add column if not exists "raw_original_total" jsonb null, add column if not exists "raw_adjusted_total" jsonb null, add column if not exists "raw_adjustment_amount" jsonb null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "order_payment_info" drop column if exists "original_total", drop column if exists "adjusted_total", drop column if exists "adjustment_amount", drop column if exists "raw_original_total", drop column if exists "raw_adjusted_total", drop column if exists "raw_adjustment_amount";`);
  }

}
