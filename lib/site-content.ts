import { queryOne, execute } from "@/lib/postgres";

export type HomepageContent = {
  brandLogo: string;
  brandName: string;
  brandContactEmail: string;
  brandContactPhone: string;
  brandContactAddress: string;
  heroImage: string;
  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
  tickerMessages: string[];
  bankName: string;
  bankAccountNumber: string;
  bankBeneficiary: string;
  subscribeEnabled: boolean;
  subscribeHeading: string;
  subscribeDescription: string;
  subscribePlaceholder: string;
  subscribeButtonLabel: string;
  subscribeSuccessMessage: string;
};

export const defaultHomepageContent: HomepageContent = {
  brandLogo: "/logo.jpg",
  brandName: "Kazim Nawrozi LLC",
  brandContactEmail: "",
  brandContactPhone: "",
  brandContactAddress: "",
  heroImage:
    "https://images.unsplash.com/photo-1600166898405-da9535204843?auto=format&fit=crop&w=1200&q=85",
  heroEyebrow: "Afghan craftsmanship · USA",
  heroTitle: "Rugs with a story. Woven to last.",
  heroDescription:
    "Discover handwoven Afghan rugs and kilims selected for their character, craftsmanship, and timeless beauty.",
  tickerMessages: [
    "New handwoven pieces selected for their character and craftsmanship",
    "Standard Delivery and Local Pickup available",
    "The store confirms payment and delivery terms by email after each order",
  ],
  bankName: "Wells Fargo",
  bankAccountNumber: "2752352944",
  bankBeneficiary: "Maryam Nawrozi",
  subscribeEnabled: true,
  subscribeHeading: "Bring an Afghan story into your home.",
  subscribeDescription:
    "Join our mailing list for new arrivals, collection updates, and stories behind the craft.",
  subscribePlaceholder: "Enter Your Email here",
  subscribeButtonLabel: "Subscribe",
  subscribeSuccessMessage:
    "Thanks! Your request is pending admin approval. We will email you if approved.",
};

export function normalizeHomepageContent(
  value: unknown,
): HomepageContent {
  const content =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  return {
    brandLogo:
      typeof content.brandLogo === "string" &&
      content.brandLogo.trim()
        ? content.brandLogo.trim().slice(0, 500)
        : defaultHomepageContent.brandLogo,

    brandName:
      typeof content.brandName === "string" &&
      content.brandName.trim()
        ? content.brandName.trim().slice(0, 120)
        : defaultHomepageContent.brandName,

    brandContactEmail:
      typeof content.brandContactEmail === "string"
        ? content.brandContactEmail.trim().slice(0, 254)
        : defaultHomepageContent.brandContactEmail,

    brandContactPhone:
      typeof content.brandContactPhone === "string"
        ? content.brandContactPhone.trim().slice(0, 50)
        : defaultHomepageContent.brandContactPhone,

    brandContactAddress:
      typeof content.brandContactAddress === "string"
        ? content.brandContactAddress.trim().slice(0, 240)
        : defaultHomepageContent.brandContactAddress,

    heroImage:
      typeof content.heroImage === "string" &&
      content.heroImage.trim()
        ? content.heroImage.trim()
        : defaultHomepageContent.heroImage,

    heroEyebrow:
      typeof content.heroEyebrow === "string"
        ? content.heroEyebrow.trim().slice(0, 120)
        : defaultHomepageContent.heroEyebrow,

    heroTitle:
      typeof content.heroTitle === "string"
        ? content.heroTitle.trim().slice(0, 180)
        : defaultHomepageContent.heroTitle,

    heroDescription:
      typeof content.heroDescription === "string"
        ? content.heroDescription.trim().slice(0, 600)
        : defaultHomepageContent.heroDescription,

    tickerMessages:
      Array.isArray(content.tickerMessages)
        ? content.tickerMessages
            .filter(
              (message): message is string =>
                typeof message === "string",
            )
            .map((message) => message.trim().slice(0, 180))
            .filter(Boolean)
            .slice(0, 8)
        : defaultHomepageContent.tickerMessages,

    bankName:
      typeof content.bankName === "string" &&
      content.bankName.trim()
        ? content.bankName.trim().slice(0, 100)
        : defaultHomepageContent.bankName,

    bankAccountNumber:
      typeof content.bankAccountNumber === "string" &&
      content.bankAccountNumber.trim()
        ? content.bankAccountNumber.trim().slice(0, 50)
        : defaultHomepageContent.bankAccountNumber,

    bankBeneficiary:
      typeof content.bankBeneficiary === "string" &&
      content.bankBeneficiary.trim()
        ? content.bankBeneficiary.trim().slice(0, 120)
        : defaultHomepageContent.bankBeneficiary,

    subscribeEnabled:
      typeof content.subscribeEnabled === "boolean"
        ? content.subscribeEnabled
        : defaultHomepageContent.subscribeEnabled,

    subscribeHeading:
      typeof content.subscribeHeading === "string" &&
      content.subscribeHeading.trim()
        ? content.subscribeHeading.trim().slice(0, 180)
        : defaultHomepageContent.subscribeHeading,

    subscribeDescription:
      typeof content.subscribeDescription === "string" &&
      content.subscribeDescription.trim()
        ? content.subscribeDescription.trim().slice(0, 500)
        : defaultHomepageContent.subscribeDescription,

    subscribePlaceholder:
      typeof content.subscribePlaceholder === "string" &&
      content.subscribePlaceholder.trim()
        ? content.subscribePlaceholder.trim().slice(0, 80)
        : defaultHomepageContent.subscribePlaceholder,

    subscribeButtonLabel:
      typeof content.subscribeButtonLabel === "string" &&
      content.subscribeButtonLabel.trim()
        ? content.subscribeButtonLabel.trim().slice(0, 40)
        : defaultHomepageContent.subscribeButtonLabel,

    subscribeSuccessMessage:
      typeof content.subscribeSuccessMessage === "string" &&
      content.subscribeSuccessMessage.trim()
        ? content.subscribeSuccessMessage.trim().slice(0, 180)
        : defaultHomepageContent.subscribeSuccessMessage,
  };
}

export async function getHomepageContent(): Promise<HomepageContent> {
  const row = await queryOne<{ content_json: string }>(
    `SELECT content_json
     FROM site_content
     WHERE id = $1`,
    [1],
  );

  if (!row) {
    return defaultHomepageContent;
  }

  try {
    return normalizeHomepageContent(
      JSON.parse(row.content_json),
    );
  } catch {
    return defaultHomepageContent;
  }
}

export async function saveHomepageContent(
  value: unknown,
): Promise<HomepageContent> {
  const content = normalizeHomepageContent(value);

  await execute(
    `INSERT INTO site_content (
      id,
      content_json,
      updated_at
    )
    VALUES ($1, $2, $3)
    ON CONFLICT (id)
    DO UPDATE SET
      content_json = EXCLUDED.content_json,
      updated_at = EXCLUDED.updated_at`,
    [
      1,
      JSON.stringify(content),
      new Date().toISOString(),
    ],
  );

  return content;
}