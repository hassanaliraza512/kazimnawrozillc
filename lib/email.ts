export function getStoreEmailSender(brandName: string, configuredFrom?: string) {
  const from = configuredFrom || process.env.SMTP_FROM || process.env.SMTP_USER || "";
  const address = from.match(/<([^<>]+)>/)?.[1]?.trim() || from.trim();
  const name = brandName.replace(/[\r\n]+/g, " ").trim() || "Kazim Nawrozi LLC";
  return { name, address };
}