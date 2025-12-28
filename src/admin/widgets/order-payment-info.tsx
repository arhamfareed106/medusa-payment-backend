import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Badge, Button, Select } from "@medusajs/ui"
import { useState, useEffect } from "react"
import { DetailWidgetProps, AdminOrder } from "@medusajs/framework/types"

type PaymentInfo = {
  id: string
  transaction_id: string | null
  payment_status: "pending" | "paid" | "awaiting"
  payment_method: "cod" | "bank_transfer"
  original_total: number | null
  adjusted_total: number | null
  adjustment_amount: number | null
}

// Format currency for display
const formatCurrency = (amount: number | null, currencyCode: string = "PKR") => {
  if (amount === null || amount === undefined) return "-"
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 0,
  }).format(amount)
}

const OrderPaymentInfoWidget = ({ data }: DetailWidgetProps<AdminOrder>) => {
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<string>("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPaymentInfo()
  }, [data.id])

  const fetchPaymentInfo = async () => {
    try {
      setError(null)
      const response = await fetch(
        `/admin/orders/${data.id}/payment-status`,
        { credentials: "include" }
      )
      const result = await response.json()

      if (result.payment_info) {
        setPaymentInfo(result.payment_info)
        setSelectedStatus(result.payment_info.payment_status)
      }
    } catch (err: any) {
      console.error("Error fetching payment info:", err)
      setError("Failed to load payment info")
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async () => {
    if (!selectedStatus || selectedStatus === paymentInfo?.payment_status) return

    setUpdating(true)
    setError(null)

    try {
      const response = await fetch(`/admin/orders/${data.id}/payment-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ payment_status: selectedStatus }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.message || "Failed to update")
      }

      await fetchPaymentInfo()
    } catch (err: any) {
      console.error("Error updating status:", err)
      setError(err.message || "Failed to update status")
    } finally {
      setUpdating(false)
    }
  }

  const getStatusBadgeColor = (status: string): "green" | "orange" | "grey" | "red" | "blue" | "purple" => {
    switch (status) {
      case "paid": return "green"
      case "awaiting": return "orange"
      case "pending": return "grey"
      default: return "grey"
    }
  }

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case "cod": return "Cash on Delivery"
      case "bank_transfer": return "Bank Transfer"
      default: return method
    }
  }

  if (loading) {
    return (
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">Payment Information</Heading>
        </div>
        <div className="px-6 py-4">
          <Text className="text-ui-fg-subtle">Loading...</Text>
        </div>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Payment Information</Heading>
      </div>

      <div className="px-6 py-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <Text className="text-red-600 text-sm">{error}</Text>
          </div>
        )}

        {paymentInfo ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Text className="text-ui-fg-subtle text-sm">Payment Method</Text>
              <Text className="font-medium">
                {getPaymentMethodLabel(paymentInfo.payment_method)}
              </Text>
            </div>

            {paymentInfo.transaction_id && (
              <div className="flex items-center justify-between">
                <Text className="text-ui-fg-subtle text-sm">Transaction ID</Text>
                <code className="font-mono text-sm bg-ui-bg-subtle px-2 py-1 rounded">
                  {paymentInfo.transaction_id}
                </code>
              </div>
            )}

            <div className="flex items-center justify-between">
              <Text className="text-ui-fg-subtle text-sm">Payment Status</Text>
              <Badge color={getStatusBadgeColor(paymentInfo.payment_status)}>
                {paymentInfo.payment_status.toUpperCase()}
              </Badge>
            </div>

            {/* Adjusted Pricing Section */}
            {(paymentInfo.original_total || paymentInfo.adjusted_total) && (
              <div className="border-t pt-4 mt-4 space-y-2">
                <Text className="font-medium text-sm mb-2">Payment Adjustments</Text>

                <div className="flex items-center justify-between">
                  <Text className="text-ui-fg-subtle text-sm">Original Total</Text>
                  <Text className="font-medium">
                    {formatCurrency(paymentInfo.original_total, data.currency_code)}
                  </Text>
                </div>

                {paymentInfo.adjustment_amount !== null && paymentInfo.adjustment_amount !== 0 && (
                  <div className="flex items-center justify-between">
                    <Text className="text-ui-fg-subtle text-sm">
                      {paymentInfo.payment_method === "cod" ? "COD Fee" : "Bank Transfer Discount (5%)"}
                    </Text>
                    <Text className={`font-medium ${paymentInfo.adjustment_amount > 0 ? "text-orange-600" : "text-green-600"}`}>
                      {paymentInfo.adjustment_amount > 0 ? "+" : ""}{formatCurrency(paymentInfo.adjustment_amount, data.currency_code)}
                    </Text>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  <Text className="font-medium text-sm">Customer Pays</Text>
                  <Text className="font-bold text-lg">
                    {formatCurrency(paymentInfo.adjusted_total, data.currency_code)}
                  </Text>
                </div>
              </div>
            )}

            <div className="border-t pt-4 mt-4">
              <Text className="text-ui-fg-subtle text-sm mb-2">Update Status</Text>
              <div className="flex gap-2">
                <Select
                  value={selectedStatus}
                  onValueChange={setSelectedStatus}
                >
                  <Select.Trigger className="flex-1">
                    <Select.Value placeholder="Select status" />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="pending">Pending</Select.Item>
                    <Select.Item value="awaiting">Awaiting</Select.Item>
                    <Select.Item value="paid">Paid</Select.Item>
                  </Select.Content>
                </Select>
                <Button
                  onClick={updateStatus}
                  disabled={updating || selectedStatus === paymentInfo.payment_status}
                  variant="secondary"
                >
                  {updating ? "Updating..." : "Update"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <Text className="text-ui-fg-subtle">
            No payment information available for this order.
          </Text>
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.side.after",
})

export default OrderPaymentInfoWidget
