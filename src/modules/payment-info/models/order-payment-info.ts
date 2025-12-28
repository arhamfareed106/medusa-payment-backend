import { model } from "@medusajs/framework/utils"

const OrderPaymentInfo = model.define("order_payment_info", {
  id: model.id().primaryKey(),
  transaction_id: model.text().nullable(),
  payment_status: model.enum(["pending", "paid", "awaiting"]).default("pending"),
  payment_method: model.enum(["cod", "bank_transfer"]).default("cod"),
  // Store the original order total before payment adjustments
  original_total: model.bigNumber().nullable(),
  // Store the adjusted total (with COD fee or Bank Transfer discount)
  adjusted_total: model.bigNumber().nullable(),
  // Store the adjustment amount (positive for fee, negative for discount)
  adjustment_amount: model.bigNumber().nullable(),
})

export default OrderPaymentInfo
