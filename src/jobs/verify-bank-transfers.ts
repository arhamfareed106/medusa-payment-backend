import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PAYMENT_INFO_MODULE } from "../modules/payment-info"
import Imap from "imap"
import { simpleParser } from "mailparser"

/**
 * Extracts PKR amount from email body
 * Handles formats like "PKR 5,000.00" or "PKR 5000.00" or "PKR 5,000"
 */
function extractAmountFromEmail(body: string): number | null {
  // Match PKR followed by amount with optional commas and decimals
  const amountMatch = body.match(/PKR\s*([\d,]+(?:\.\d{2})?)/i)
  if (amountMatch) {
    // Remove commas and parse as float
    const amountStr = amountMatch[1].replace(/,/g, "")
    const amount = parseFloat(amountStr)
    if (!isNaN(amount)) {
      return amount
    }
  }
  return null
}

/**
 * Extracts Transaction ID from email body
 * Handles formats like "TID:419290" or "TID: 419290"
 */
function extractTidFromEmail(body: string): string | null {
  const tidMatch = body.match(/TID:\s*(\d+)/i)
  return tidMatch ? tidMatch[1] : null
}

export default async function verifyBankTransfersJob(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const paymentInfoService: any = container.resolve(PAYMENT_INFO_MODULE)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  // Check if IMAP credentials are configured
  if (!process.env.IMAP_USER || !process.env.IMAP_PASSWORD) {
    logger.warn("IMAP credentials not configured. Skipping bank transfer verification.")
    return
  }

  logger.info("Starting bank transfer verification job...")

  const imapConfig: Imap.Config = {
    user: process.env.IMAP_USER,
    password: process.env.IMAP_PASSWORD,
    host: process.env.IMAP_HOST || "imap.gmail.com",
    port: parseInt(process.env.IMAP_PORT || "993"),
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
  }

  const imap = new Imap(imapConfig)

  return new Promise<void>((resolve, reject) => {
    imap.once("ready", () => {
      imap.openBox("INBOX", false, (err, _box) => {
        if (err) {
          logger.error("Error opening inbox:", err)
          imap.end()
          reject(err)
          return
        }

        // Search for unread emails
        imap.search(["UNSEEN"], async (searchErr, results) => {
          if (searchErr) {
            logger.error("Search error:", searchErr)
            imap.end()
            reject(searchErr)
            return
          }

          if (!results || results.length === 0) {
            logger.info("No unread emails found")
            imap.end()
            resolve()
            return
          }

          logger.info(`Found ${results.length} unread email(s)`)

          const fetch = imap.fetch(results, {
            bodies: "",
            markSeen: true,
          })

          const processedTids: string[] = []

          fetch.on("message", (msg, seqno) => {
            let emailBody = ""

            msg.on("body", (stream) => {
              stream.on("data", (chunk) => {
                emailBody += chunk.toString("utf8")
              })

              stream.once("end", async () => {
                try {
                  const parsed = await simpleParser(emailBody)
                  const body = parsed.text || (typeof parsed.html === 'string' ? parsed.html : "") || ""

                  // Extract TID and Amount from email
                  const tid = extractTidFromEmail(body)
                  const emailAmount = extractAmountFromEmail(body)

                  if (!tid) {
                    logger.debug(`No TID found in email #${seqno}`)
                    return
                  }

                  if (!emailAmount) {
                    logger.info(`Found TID: ${tid} but no valid PKR amount in email #${seqno}`)
                    return
                  }

                  logger.info(`Found TID: ${tid}, Amount: PKR ${emailAmount} in email from ${parsed.from?.text}`)

                  // Find order with matching transaction_id and awaiting status
                  const paymentInfos = await paymentInfoService.listOrderPaymentInfos({
                    transaction_id: tid,
                    payment_status: "awaiting",
                  })

                  if (paymentInfos.length === 0) {
                    logger.info(`No matching awaiting order found for TID: ${tid}`)
                    return
                  }

                  const paymentInfo = paymentInfos[0]

                  // Get the linked order to verify the amount using the link
                  // Query using the link table - order_payment_info is linked to order
                  const { data: ordersWithPaymentInfo } = await query.graph({
                    entity: "order",
                    fields: ["id", "total", "currency_code", "order_payment_info.id", "order_payment_info.adjusted_total", "order_payment_info.original_total"],
                    filters: {} as any, // We'll filter manually below
                  })

                  // Find the order that has this payment info linked
                  const linkedOrder = (ordersWithPaymentInfo as any[])?.find(
                    (o: any) => o.order_payment_info?.id === paymentInfo.id
                  )

                  if (!linkedOrder) {
                    logger.info(`No order linked to payment info for TID: ${tid}`)
                    return
                  }

                  const order = linkedOrder as any

                  // Use the adjusted_total from payment info (includes bank transfer discount)
                  // Fall back to order.total if adjusted_total is not set
                  const adjustedTotal = order.order_payment_info?.adjusted_total
                  const orderTotal = adjustedTotal ?? order.total

                  logger.info(`Order ${order.id}: Adjusted Total = PKR ${orderTotal}, Email Amount = PKR ${emailAmount}`)

                  // Compare amounts with small tolerance for floating point
                  const amountMatches = Math.abs(orderTotal - emailAmount) < 1 // Allow 1 PKR tolerance

                  if (!amountMatches) {
                    logger.warn(`Amount mismatch for TID: ${tid}. Order: PKR ${orderTotal}, Email: PKR ${emailAmount}. Skipping.`)
                    return
                  }

                  // Both TID and Amount match - update payment status to paid
                  await paymentInfoService.updateOrderPaymentInfos({
                    selector: { id: paymentInfo.id },
                    data: { payment_status: "paid" },
                  })

                  logger.info(`✓ Verified and marked as PAID - TID: ${tid}, Amount: PKR ${emailAmount}`)
                  processedTids.push(tid)

                } catch (parseErr) {
                  logger.error(`Error parsing email #${seqno}:`, parseErr)
                }
              })
            })
          })

          fetch.once("error", (fetchErr) => {
            logger.error("Fetch error:", fetchErr)
          })

          fetch.once("end", () => {
            logger.info(`Email processing complete. Verified TIDs: ${processedTids.length > 0 ? processedTids.join(", ") : "none"}`)
            imap.end()
            resolve()
          })
        })
      })
    })

    imap.once("error", (imapErr: Error) => {
      logger.error("IMAP connection error:", imapErr)
      reject(imapErr)
    })

    imap.once("end", () => {
      logger.info("IMAP connection ended")
    })

    imap.connect()
  })
}

export const config = {
  name: "verify-bank-transfers",
  schedule: "*/2 * * * *", // Every 2 minutes
}
