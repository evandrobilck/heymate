export function getDaysRemaining(isoString) {
  if (!isoString) return 0
  const diffMs = new Date(isoString).getTime() - Date.now()
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}

export function isTrialExpired(subscription) {
  return subscription?.status === 'trialing' && new Date(subscription.trialEndsAt) <= new Date()
}

export function isSubscriptionBlocked(subscription) {
  if (!subscription) return false
  if (subscription.status === 'canceled' || subscription.status === 'past_due') return true
  return isTrialExpired(subscription)
}
