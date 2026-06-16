import { Platform } from 'react-native';
import Purchases, { PurchasesOffering, PurchasesPackage, CustomerInfo } from 'react-native-purchases';

const APPLE_KEY = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY;
const GOOGLE_KEY = process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY;

let configured = false;

export const PREMIUM_ENTITLEMENT_ID = 'premium';

export async function configurePurchases(userId?: string) {
  if (configured) {
    if (userId) {
      try {
        await Purchases.logIn(userId);
      } catch {
        // ignore — SDK may already be linked to this user
      }
    }
    return;
  }

  const apiKey = Platform.OS === 'ios' ? APPLE_KEY : GOOGLE_KEY;
  if (!apiKey) {
    // No keys yet (e.g. dev environment) — leave purchases unconfigured. The
    // server-backed `useIsPremium` hook is the source of truth, so the rest of
    // the app keeps working.
    return;
  }

  Purchases.setLogLevel(Purchases.LOG_LEVEL.WARN);
  Purchases.configure({ apiKey, appUserID: userId ?? undefined });
  configured = true;
}

export async function getOfferings(): Promise<PurchasesOffering | null> {
  if (!configured) return null;
  const offerings = await Purchases.getOfferings();
  return offerings.current ?? null;
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

export async function restorePurchases(): Promise<CustomerInfo> {
  return Purchases.restorePurchases();
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!configured) return null;
  return Purchases.getCustomerInfo();
}

export function isEntitled(info: CustomerInfo | null | undefined, entitlementId = PREMIUM_ENTITLEMENT_ID) {
  if (!info) return false;
  return Boolean(info.entitlements.active[entitlementId]);
}
