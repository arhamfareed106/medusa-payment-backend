import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params

  if (!id) {
    return res.status(400).json({
      message: "Order ID is required",
    })
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  try {
    // Fetch the order with linked payment info
    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "total",
        "currency_code",
        "order_payment_info.id",
        "order_payment_info.payment_method",
        "order_payment_info.payment_status",
        "order_payment_info.transaction_id",
        "order_payment_info.original_total",
        "order_payment_info.adjusted_total",
        "order_payment_info.adjustment_amount",
      ],
      filters: { id },
    })

    const order = orders[0] as any

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      })
    }

    const paymentInfo = order.order_payment_info || null

    res.json({
      payment_info: paymentInfo,
    })
  } catch (error: any) {
    console.error("Error fetching payment info:", error)
    res.status(500).json({
      message: error.message || "Failed to fetch payment info",
    })
  }
}
