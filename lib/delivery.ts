export type DeliveryMethod = "standard" | "local-pickup";
export const advancePercentageOptions = [20, 30, 40, 50, 60, 70, 80, 90] as const;
export const deliveryEstimateOptions = [
  "1-2 business days",
  "3-5 business days",
  "5-7 business days",
  "7-10 business days",
  "10-14 business days",
  "2-3 weeks",
  "Arrange with customer",
  "Arrange pickup with the store",
  "Custom",
] as const;
export const deliveryMethods = [
  { id: "standard" as const, name: "Standard Delivery", detail: "Payment and delivery terms are confirmed after order review." },
  { id: "local-pickup" as const, name: "Local Pickup", detail: "Arrange pickup with Kazim Nawrozi LLC." },
];

export function getBalanceDue(productTotal: number, advance: number) {
  return Math.max(0, Math.round((productTotal - advance) * 100) / 100);
}
