export type PaymentMethod = { id: string; brand: string; lastFour: string; expiryMonth: number; expiryYear: number };

export function isPaymentMethodExpired(method: Pick<PaymentMethod, 'expiryMonth' | 'expiryYear'>, now = new Date()) {
  return method.expiryYear < now.getFullYear() || method.expiryYear === now.getFullYear() && method.expiryMonth < now.getMonth() + 1;
}

// Form-only validation. A payment provider must tokenize and verify cards before production use.
export function validatePaymentForm(name: string, number: string, expiry: string, cvv: string, now = new Date()) {
  const digits = number.replace(/\D/g, '');
  if (!name.trim()) return 'Enter the cardholder name.';
  if (!/^\d{13,19}$/.test(digits)) return 'Enter a valid card number.';
  let sum = 0;
  for (let i = digits.length - 1, alternate = false; i >= 0; i--, alternate = !alternate) {
    let digit = Number(digits[i]);
    if (alternate) { digit *= 2; if (digit > 9) digit -= 9; }
    sum += digit;
  }
  if (sum % 10 !== 0) return 'Check the card number.';
  if (!/^\d{2}\/\d{2}$/.test(expiry)) return 'Enter the expiry as MM/YY.';
  const [month, year] = expiry.split('/').map(Number);
  if (month < 1 || month > 12 || isPaymentMethodExpired({ expiryMonth: month, expiryYear: 2000 + year }, now)) return 'Enter a valid, unexpired date.';
  if (!/^\d{3,4}$/.test(cvv)) return 'Enter a valid security code.';
  return null;
}

export function paymentSummary(number: string, expiry: string): Omit<PaymentMethod, 'id'> {
  const digits = number.replace(/\D/g, '');
  const [month, year] = expiry.split('/').map(Number);
  return { brand: digits.startsWith('4') ? 'Visa' : /^(5[1-5]|2[2-7])/.test(digits) ? 'Mastercard' : /^3[47]/.test(digits) ? 'American Express' : 'Card', lastFour: digits.slice(-4), expiryMonth: month, expiryYear: 2000 + year };
}
