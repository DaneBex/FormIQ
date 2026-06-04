import Purchases, { LOG_LEVEL, PurchasesPackage } from 'react-native-purchases';
import Constants from 'expo-constants';

const IOS_KEY = Constants.expoConfig?.extra?.revenueCatIosKey ?? process.env.REVENUECAT_IOS_API_KEY ?? '';

let configured = false;

export function configureRevenueCat(userId?: string): void {
  if (configured) return;
  if (!IOS_KEY) {
    console.warn('[RevenueCat] Missing REVENUECAT_IOS_API_KEY');
    return;
  }
  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }
  Purchases.configure({ apiKey: IOS_KEY, appUserID: userId });
  configured = true;
}

export async function checkEntitlement(): Promise<boolean> {
  try {
    const info = await Purchases.getCustomerInfo();
    return 'pro' in info.entitlements.active;
  } catch {
    return false;
  }
}

export async function getOfferings(): Promise<PurchasesPackage[]> {
  const offerings = await Purchases.getOfferings();
  return offerings.current?.availablePackages ?? [];
}

export async function purchaseSubscription(packageId: string): Promise<void> {
  const packages = await getOfferings();
  const pkg = packages.find((p) => p.identifier === packageId);
  if (!pkg) throw new Error(`Package "${packageId}" not found in offerings.`);
  await Purchases.purchasePackage(pkg);
}

export async function restorePurchases(): Promise<void> {
  await Purchases.restorePurchases();
}
