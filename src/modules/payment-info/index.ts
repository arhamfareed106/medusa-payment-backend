import PaymentInfoModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const PAYMENT_INFO_MODULE = "paymentInfoModuleService"

export default Module(PAYMENT_INFO_MODULE, {
  service: PaymentInfoModuleService,
})
