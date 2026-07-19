function round(value) {
  return Math.round(value * 100) / 100
}

// Net balance per housemate: unpaid shares are debts owed to whoever created
// the bill (the person who fronted the money). Balances across bills net
// out per person, same as Splitwise's per-friend total.
export function computeBalances(bills, currentUserId) {
  const net = {}

  bills.forEach((bill) => {
    const payerId = bill.createdBy

    bill.participantIds.forEach((participantId) => {
      if (participantId === payerId) return
      const share = bill.shares[participantId]
      if (!share || share.paid) return

      if (payerId === currentUserId) {
        net[participantId] = (net[participantId] ?? 0) + share.amount
      } else if (participantId === currentUserId) {
        net[payerId] = (net[payerId] ?? 0) - share.amount
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
