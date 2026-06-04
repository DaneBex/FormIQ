import { useState, useEffect, useCallback } from 'react';
import { checkEntitlement } from './RevenueCatClient';

interface SubscriptionState {
  isSubscribed: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useSubscription(): SubscriptionState {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const subscribed = await checkEntitlement();
      setIsSubscribed(subscribed);
    } catch {
      setIsSubscribed(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { isSubscribed, loading, refresh };
}
