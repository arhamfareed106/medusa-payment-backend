import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { PAYMENT_INFO_MODULE } from "../../../../modules/payment-info"
import { completeCartWorkflow } from "@medusajs/medusa/core-flows"
import { COD_FEE, calculateCODTotal } from "../../../../utils/payment-pricing"

type CodCompleteBody = {
  cart_id: string
}

export async function POST(
  req: MedusaRequest<CodCompleteBody>,
  res: MedusaResponse
) {
  const { cart_id } = req.body

  if (!cart_id) {
    return res.status(400).json({
      message: "Cart ID is required",
    })
  }

  const link = req.scope.resolve(ContainerRegistrationKeys.LINK)
  const paymentInfoService: any = req.scope.resolve(PAYMENT_INFO_MODULE)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  try {
    // Complete the cart to create order using the workflow
    const { result } = await completeCartWorkflow(req.scope).run({
      input: {
        id: cart_id,
      },
    })

    // result contains { id: string } - the order ID
    const orderId = result.id

    // Fetch the order details with summary totals
    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "*",
        "summary.*",
        "order_payment_info.*",
      ],
      filters: { id: orderId },
    })

    const order = orders[0] as any

    // Get the total from summary - in MedusaJS v2, totals are computed from order_summary
    const orderTotal = order.summary?.current_order_total ?? order.summary?.original_order_total ?? 0

    // Calculate the adjusted total with COD fee
    const originalTotal = orderTotal
    const adjustedTotal = calculateCODTotal(originalTotal)
    const adjustmentAmount = COD_FEE

    // Check if payment info already exists for this order
    if (order.order_payment_info) {
      // Update existing payment info with adjusted totals
      await paymentInfoService.updateOrderPaymentInfos({
        selector: { id: order.order_payment_info.id },
        data: {
          transaction_id: null,
          payment_status: "pending",
          payment_method: "cod",
          original_total: originalTotal,
          adjusted_total: adjustedTotal,
          adjustment_amount: adjustmentAmount,
        },
      })

      res.json({
        type: "order",
        order: {
          ...order,
          original_total: originalTotal,
          adjusted_total: adjustedTotal,
          adjustment_amount: adjustmentAmount,
        },
        payment_info: {
          ...order.order_payment_info,
          original_total: originalTotal,
          adjusted_total: adjustedTotal,
          adjustment_amount: adjustmentAmount,
        },
      })
      return
    }

    // Create payment info record for COD with adjusted totals
    const paymentInfo = await paymentInfoService.createOrderPaymentInfos({
      transaction_id: null,
      payment_status: "pending",
      payment_method: "cod",
      original_total: originalTotal,
      adjusted_total: adjustedTotal,
      adjustment_amount: adjustmentAmount,
    })

    // Link payment info to order
    await link.create({
      [Modules.ORDER]: {
        order_id: orderId,
      },
      [PAYMENT_INFO_MODULE]: {
        order_payment_info_id: paymentInfo.id,
      },
    })

    res.json({
      type: "order",
      order: {
        ...order,
        original_total: originalTotal,
        adjusted_total: adjustedTotal,
        adjustment_amount: adjustmentAmount,
      },
      payment_info: paymentInfo,
    })
  } catch (error: any) {
    console.error("COD completion error:", error)
    res.status(500).json({
      message: error.message || "Failed to complete COD order",
    })
  }
}
