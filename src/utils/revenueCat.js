import { Purchases } from '@revenuecat/purchases-capacitor'

// Public/publishable key — safe to ship in the client bundle, same as
// VITE_SUPABASE_ANON_KEY.
const IOS_API_KEY = import.meta.env.VITE_REVENUECAT_IOS_API_KEY

let configuredAppUserId = null

// A purchase is recorded against whichever RevenueCat appUserID is active
// at the time purchasePackage() is called, and revenuecat-webhook trusts
// that id to be the house_id it should update (mirroring how every other
// RPC in this app trusts auth.uid()) — so the SDK's identity has to be
// kept in sync with whichever house is currently open, not the person's
// own user id, since a subscription unlocks the whole house.
export async function syncRevenueCatUser(houseId) {
  if (!IOS_API_KEY || !houseId || configuredAppUserId === houseId) return

  if (configuredAppUserId === null) {
    await Purchases.configure({ apiKey: IOS_API_KEY, appUserID: houseId })
  } else {
    await Purchases.logIn({ appUserID: houseId })
  }
  configuredAppUserId = houseId
}

export async function resetRevenueCatUser() {
  if (!IOS_API_KEY || configuredAppUserId === null) return
  await Purchases.logOut()
  configuredAppUserId = null
}

// Matches the predefined RevenueCat package durations to HeyFlat's 3 plans
// — set up as Monthly/Six Month/Annual packages in the RevenueCat "default"
// offering, mirroring the Stripe monthly/semiannual/annual prices.
const PLAN_TO_PACKAGE_KEY = { monthly: 'monthly', semiannual: 'sixMonth', annual: 'annual' }

// Returns the purchased product's id/expiration/price straight from the
// SDK's own (already receipt-validated) result, so the caller can report it
// to sync-revenuecat-purchase immediately instead of only waiting on
// revenuecat-webhook — see that function's comment for why.
export async function purchasePlanWithRevenueCat(plan) {
  const offerings = await Purchases.getOfferings()
  const packageKey = PLAN_TO_PACKAGE_KEY[plan]
  const aPackage = offerings.current?.[packageKey]

  if (!aPackage) {
    throw new Error(`No RevenueCat package configured for the "${plan}" plan`)
  }

  const { productIdentifier, customerInfo } = await Purchases.purchasePackage({ aPackage })

  return {
    product_id: productIdentifier,
    expiration_date: customerInfo.allExpirationDates?.[productIdentifier] ?? null,
    price_cents: Math.round((aPackage.product.price ?? 0) * 100),
    currency: aPackage.product.currencyCode ?? null,
  }
}
