import { defineLink } from "@medusajs/framework/utils"
import OrderModule from "@medusajs/medusa/order"
import PaymentInfoModule from "../modules/payment-info"

export default defineLink(
  OrderModule.linkable.order,
  PaymentInfoModule.linkable.orderPaymentInfo
)
