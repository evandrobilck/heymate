import { getBillOccurrenceState } from './billOccurrences'
import { toDayKey } from './calendar'

function round(value) {
  return Math.round(value * 100) / 100
}

// Net balance per housemate: unpaid shares are debts owed to whoever created
// the bill (the person who fronted the money). Balances across bills net
// out per person, same as Splitwise's per-friend total.
//
// Uses the remaining amount (amount - paidAmount) rather than the paid
// boolean, so a share that was partially settled via debt offset (see
// create_bill's p_apply_debt_offset) still contributes its leftover
// portion instead of dropping out of the sum entirely.
//
// Recurring bills only count their current pending cycle (same one shown
// as the live card in Contas) — bill_shares itself is just the template
// and no longer reflects what's actually owed once a cycle has been paid.
export function computeBalances(bills, currentUserId, todayKey = toDayKey(new Date())) {
  const net = {}

  bills.forEach((bill) => {
    const payerId = bill.createdBy
    let shares = bill.shares

    if (bill.recurrence !== 'none') {
      const { pending } = getBillOccurrenceState(bill, todayKey)
      if (!pending) return
      shares = pending.shares
    }

    bill.participantIds.forEach((participantId) => {
      if (participantId === payerId) return
      const share = shares[participantId]
      if (!share) return
      const remaining = round(share.amount - (share.paidAmount ?? 0))
      if (remaining <= 0.005) return

      if (payerId === currentUserId) {
        net[participantId] = (net[participantId] ?? 0) + remaining
      } else if (participantId === currentUserId) {
        net[payerId] = (net[payerId] ?? 0) - remaining
      }
    })
  })

  const owedToYou = []
  const youOwe = []

  Object.entries(net).forEach(([memberId, amount]) => {
    const rounded = round(amount)
    if (rounded > 0.005) owedToYou.push({ memberId, amount: rounded })
    else if (rounded < -0.005) youOwe.push({ memberId, amount: -rounded })
  })

  return {
    owedToYou,
    youOwe,
    totalOwedToYou: round(owedToYou.reduce((sum, item) => sum + item.amount, 0)),
    totalYouOwe: round(youOwe.reduce((sum, item) => sum + item.amount, 0)),
  }
}
