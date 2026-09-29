import { describe, expect, it } from "vitest";
import {
  digitsOnly,
  isDevVisaDeclinePan,
  isDevVisaSuccessPan,
  isVisaPan,
  luhnValid,
  maskPan,
} from "@/lib/payments/visa";

describe("Visa helpers", () => {
  it("normalizes and validates Visa PANs", () => {
    expect(digitsOnly("4111 1111 1111 1111")).toBe("4111111111111111");
    expect(isVisaPan("4111111111111111")).toBe(true);
    expect(isVisaPan("5111111111111111")).toBe(false);
    expect(luhnValid("4111111111111111")).toBe(true);
    expect(luhnValid("4111111111111112")).toBe(false);
  });

  it("masks PAN to last four", () => {
    expect(maskPan("4111111111111111")).toBe("**** **** **** 1111");
  });

  it("accepts only documented test success PANs", () => {
    expect(isDevVisaSuccessPan("4111111111111111")).toBe(true);
    expect(isDevVisaSuccessPan("4242424242424242")).toBe(true);
    // Luhn-valid Visa that is NOT a documented success PAN
    expect(isDevVisaSuccessPan("4012888888881881")).toBe(false);
    expect(isDevVisaDeclinePan("4000000000000002")).toBe(true);
  });
});
