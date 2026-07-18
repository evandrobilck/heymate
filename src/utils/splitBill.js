function roundCurrency(value) {
  return Math.round(value * 100) / 100
}

export function computeEqualShares(totalAmount, participantIds) {
  const share = totalAmount / participantIds.length
  return Object.fromEntries(
    participantIds.map((id) => [id, { amount: roundCurrency(share), paid: false, paidAt: null }])
  )
}

export function computePercentageShares(totalAmount, percentageByParticipant) {
  return Object.fromEntries(
    Object.entries(percentageByParticipant).map(([id, percentage]) => [
      id,
      {
        percentage,
        amount: roundCurrency((totalAmount * percentage) / 100),
        paid: false,
        paidAt: null,
      },
    ])
  )
}

export function computeExactShares(amountByParticipant) {
  return Object.fromEntries(
    Object.entries(amountByParticipant).map(([id, amount]) => [
      id,
      { amount: roundCurrency(amount), paid: false, paidAt: null },
    ])
  )
}
