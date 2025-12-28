import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PAYMENT_INFO_MODULE } from "../../../../../modules/payment-info"

type UpdatePaymentStatusBody = {
  payment_status: "pending" | "paid" | "awaiting"
}

// GET - Retrieve payment info for an order
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  try {
    const { data } = await query.graph({
      entity: "order",
      fields: ["id", "order_payment_info.*"],
      filters: { id },
    })

    if (!data || data.length === 0) {
      return res.status(404).json({
        message: "Order not found",
      })
    }

    res.json({
      payment_info: data[0]?.order_payment_info || null,
    })
  } catch (error: any) {
    console.error("Error fetching payment info:", error)
    res.status(500).json({
      message: error.message || "Failed to fetch payment info",
    })
  }
}

// POST - Update payment status
export async function POST(
  req: MedusaRequest<UpdatePaymentStatusBody>,
  res: MedusaResponse
) {
  const { id } = req.params
  const { payment_status } = req.body

  if (!payment_status || !["pending", "paid", "awaiting"].includes(payment_status)) {
    return res.status(400).json({
      message: "Valid payment_status is required (pending, paid, or awaiting)",
    })
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const paymentInfoService: any = req.scope.resolve(PAYMENT_INFO_MODULE)

  try {
    // Get linked payment info
    const { data: linkedData } = await query.graph({
      entity: "order",
      fields: ["id", "order_payment_info.*"],
      filters: { id },
    })

    if (!linkedData || linkedData.length === 0) {
      return res.status(404).json({
        message: "Order not found",
      })
    }

    const paymentInfo = linkedData[0]?.order_payment_info

    if (!paymentInfo) {
      return res.status(404).json({
        message: "Payment info not found for this order",
      })
    }

    // Update payment status using selector format
    const updated = await paymentInfoService.updateOrderPaymentInfos({
      selector: { id: paymentInfo.id },
      data: { payment_status },
    })

    res.json({
      success: true,
      payment_status,
      payment_info: updated,
    })
  } catch (error: any) {
    console.error("Error updating payment status:", error)
    res.status(500).json({
      message: error.message || "Failed to update payment status",
    })
  }
}
