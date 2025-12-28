import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  COD_FEE,
  BANK_TRANSFER_DISCOUNT_PERCENT,
  getPaymentAdjustment,
} from "../../../../../utils/payment-pricing"

/**
 * GET /store/cart/:id/payment-adjustment
 * Returns pricing adjustments based on selected payment method
 *
 * Query params:
 * - payment_method: "cod" | "bank_transfer"
 *
 * Response:
 * - original_total: Cart total before adjustment
 * - adjustment_amount: Amount to add/subtract (negative for discount)
 * - adjustment_label: Description of adjustment
 * - final_total: Final total after adjustment
 * - cod_fee: COD fee amount (for display)
 * - bank_transfer_discount_percent: Discount percentage for bank transfer
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params
  const payment_method = req.query.payment_method as string | undefined

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  try {
    // Get cart details
    const { data: carts } = await query.graph({
      entity: "cart",
      fields: ["id", "total", "subtotal", "shipping_total", "tax_total", "currency_code"],
      filters: { id },
    })

    if (!carts || carts.length === 0) {
      return res.status(404).json({
        message: "Cart not found",
      })
    }

    const cart: any = carts[0]

    // Calculate adjustments for both payment methods
    const codAdjustment = getPaymentAdjustment("cod", cart.total || 0)
    const bankTransferAdjustment = getPaymentAdjustment("bank_transfer", cart.total || 0)

    // If specific payment method requested, return that adjustment
    if (payment_method) {
      const adjustment = getPaymentAdjustment(payment_method, cart.total || 0)
      return res.json({
        cart_id: cart.id,
        currency_code: cart.currency_code,
        original_total: cart.total || 0,
        subtotal: cart.subtotal || 0,
        shipping_total: cart.shipping_total || 0,
        tax_total: cart.tax_total || 0,
        payment_method,
        adjustment_amount: adjustment.adjustment,
        adjustment_label: adjustment.adjustmentLabel,
        final_total: adjustment.finalTotal,
        // Include constants for frontend display
        cod_fee: COD_FEE,
        bank_transfer_discount_percent: BANK_TRANSFER_DISCOUNT_PERCENT,
      })
    }

    // Return all adjustments for both methods
    res.json({
      cart_id: cart.id,
      currency_code: cart.currency_code,
      original_total: cart.total || 0,
      subtotal: cart.subtotal || 0,
      shipping_total: cart.shipping_total || 0,
      tax_total: cart.tax_total || 0,
      adjustments: {
        cod: {
          payment_method: "cod",
          adjustment_amount: codAdjustment.adjustment,
          adjustment_label: codAdjustment.adjustmentLabel,
          final_total: codAdjustment.finalTotal,
        },
        bank_transfer: {
          payment_method: "bank_transfer",
          adjustment_amount: bankTransferAdjustment.adjustment,
          adjustment_label: bankTransferAdjustment.adjustmentLabel,
          final_total: bankTransferAdjustment.finalTotal,
        },
      },
      // Include constants for frontend display
      cod_fee: COD_FEE,
      bank_transfer_discount_percent: BANK_TRANSFER_DISCOUNT_PERCENT,
    })
  } catch (error: any) {
    console.error("Error calculating payment adjustment:", error)
    res.status(500).json({
      message: error.message || "Failed to calculate payment adjustment",
    })
  }
}
