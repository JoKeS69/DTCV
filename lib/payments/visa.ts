/** Visa PAN helpers for test/dev checkout (never log full PAN). */

export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function isVisaPan(pan: string) {
  const d = digitsOnly(pan);
  return d.startsWith("4") && d.length >= 13 && d.length <= 19;
}

/** Luhn check — rejects obviously invalid cards. */
export function luhnValid(pan: string) {
  const d = digitsOnly(pan);
  if (d.length < 13) return false;
  let sum = 0;
  let alt = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = Number(d[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export function maskPan(pan: string) {
  const d = digitsOnly(pan);
  if (d.length < 4) return "****";
  return `**** **** **** ${d.slice(-4)}`;
}

/** Well-known Visa test PANs accepted in PAYMENTS_MODE=test. */
export const DEV_VISA_SUCCESS_PANS = new Set([
  "4111111111111111",
  "4242424242424242",
  "4000056655665556",
]);

export function isDevVisaSuccessPan(pan: string) {
  return DEV_VISA_SUCCESS_PANS.has(digitsOnly(pan));
}

export function isDevVisaDeclinePan(pan: string) {
  return digitsOnly(pan) === "4000000000000002";
}
