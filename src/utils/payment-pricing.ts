/**
 * Payment method pricing adjustments
 * All amounts are in PKR (Rupees as smallest unit, not paisa)
 */

// COD fee in PKR (350 Rupees)
export const COD_FEE = 350

// Bank transfer discount percentage
export const BANK_TRANSFER_DISCOUNT_PERCENT = 5

/**
 * Calculate the final total for COD payment
 * @param originalTotal - Original order total in PKR (Rupees)
 * @returns Adjusted total with COD fee
 */
export function calculateCODTotal(originalTotal: number): number {
  return originalTotal + COD_FEE
}

/**
 * Calculate the discount amount for Bank Transfer
 * @param originalTotal - Original order total in PKR (Rupees)
 * @returns Discount amount in PKR (Rupees)
 */
export function calculateBankTransferDiscount(originalTotal: number): number {
  return Math.round(originalTotal * (BANK_TRANSFER_DISCOUNT_PERCENT / 100))
}

/**
 * Calculate the final total for Bank Transfer payment
 * @param originalTotal - Original order total in PKR (Rupees)
 * @returns Adjusted total with discount applied
 */
export function calculateBankTransferTotal(originalTotal: number): number {
  const discount = calculateBankTransferDiscount(originalTotal)
  return originalTotal - discount
}

/**
 * Get pricing adjustment info for a payment method
 * @param paymentMethod - "cod" or "bank_transfer"
 * @param originalTotal - Original order total in PKR (Rupees)
 */
export function getPaymentAdjustment(
  paymentMethod: string,
  originalTotal: number
): {
  originalTotal: number
  adjustment: number
  adjustmentLabel: string
  finalTotal: number
} {
  if (paymentMethod === "cod") {
    return {
      originalTotal,
      adjustment: COD_FEE,
      adjustmentLabel: "COD Fee",
      finalTotal: calculateCODTotal(originalTotal),
    }
  }

  if (paymentMethod === "bank_transfer") {
    const discount = calculateBankTransferDiscount(originalTotal)
    return {
      originalTotal,
      adjustment: -discount, // Negative because it's a discount
      adjustmentLabel: `${BANK_TRANSFER_DISCOUNT_PERCENT}% Discount`,
      finalTotal: calculateBankTransferTotal(originalTotal),
    }
  }

  // Default - no adjustment
  return {
    originalTotal,
    adjustment: 0,
    adjustmentLabel: "",
    finalTotal: originalTotal,
  }
}
