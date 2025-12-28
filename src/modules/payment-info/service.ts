import { MedusaService } from "@medusajs/framework/utils"
import OrderPaymentInfo from "./models/order-payment-info"

class PaymentInfoModuleService extends MedusaService({
  OrderPaymentInfo,
}) {}

export default PaymentInfoModuleService
