import { createContext, useContext, useState, type ReactNode } from 'react';
import { isPaymentMethodExpired, type PaymentMethod } from './paymentMethods';

// Masked fixture only. No PAN, CVV, provider token or charge is stored or created.
const initialMethods: PaymentMethod[] = [{ id: 'card-self', brand: 'Visa', lastFour: '4242', expiryMonth: 12, expiryYear: 2029 }];
const BillingContext = createContext<{
  methods: PaymentMethod[]; selectedId: string | null; selectedMethod: PaymentMethod | undefined;
  saveMethod: (method: Omit<PaymentMethod, 'id'>) => void;
  selectMethod: (id: string) => void; removeMethod: (id: string) => void;
} | null>(null);

export function BillingProvider({ children }: { children: ReactNode }) {
  const [methods, setMethods] = useState(initialMethods);
  const [selectedId, setSelectedId] = useState<string | null>(initialMethods[0]?.id ?? null);
  const selectedMethod = methods.find(method => method.id === selectedId && !isPaymentMethodExpired(method)) ?? methods.find(method => !isPaymentMethodExpired(method));
  function saveMethod(summary: Omit<PaymentMethod, 'id'>) {
    const duplicate = methods.find(method => method.brand === summary.brand && method.lastFour === summary.lastFour && method.expiryMonth === summary.expiryMonth && method.expiryYear === summary.expiryYear);
    const method = { ...summary, id: duplicate?.id ?? `card-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
    setMethods(current => duplicate ? current : [...current, method]);
    setSelectedId(method.id);
  }
  function removeMethod(id: string) {
    setMethods(current => current.filter(method => method.id !== id));
    setSelectedId(current => current === id ? null : current);
  }
  return <BillingContext.Provider value={{ methods, selectedId: selectedMethod?.id ?? null, selectedMethod, saveMethod, selectMethod: setSelectedId, removeMethod }}>{children}</BillingContext.Provider>;
}

export function useBilling() {
  const value = useContext(BillingContext);
  if (!value) throw new Error('BillingProvider is required');
  return value;
}
