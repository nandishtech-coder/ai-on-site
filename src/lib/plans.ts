export type PlanId = "free" | "pro" | "enterprise";

export type Plan = {
  id: PlanId;
  name: string;
  price: string;
  cadence: string;
  tagline: string;
  bots: number;
  pages: number;
  messages: number;
  features: string[];
  highlight?: boolean;
};

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "₹0",
    cadence: "/mo",
    tagline: "Try Helix on a single site.",
    bots: 1,
    pages: 20,
    messages: 100,
    features: [
      "1 chatbot",
      "20 pages crawled",
      "100 messages / month",
      "Conversation logs",
      "“Powered by Helix” badge",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "₹2,499",
    cadence: "/mo",
    tagline: "For growing teams and busy sites.",
    bots: 3,
    pages: 500,
    messages: 2000,
    highlight: true,
    features: [
      "3 chatbots",
      "500 pages crawled",
      "2,000 messages / month",
      "Custom colors & avatar",
      "No “Powered by Helix” badge",
      "Lead capture forms",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "₹7,999",
    cadence: "/mo",
    tagline: "Large sites that change every week.",
    bots: 25,
    pages: 100000,
    messages: 50000,
    features: [
      "Unlimited pages crawled",
      "Automatic weekly re-crawl",
      "Priority support",
      "Everything in Pro",
    ],
  },
];

export function getPlan(id: string | null | undefined): Plan {
  return PLANS.find((plan) => plan.id === id) ?? PLANS[0]!;
}

export const SOLUTIONS = [
  {
    slug: "education",
    name: "Education",
    headline: "Answer student questions around the clock",
    blurb:
      "Course catalogues, admission deadlines, fees and campus info — Helix learns your site and replies instantly, in any language your students speak.",
    points: [
      "Admissions and enrolment FAQs answered instantly",
      "Course and programme details pulled from your own pages",
      "Captures applicant contact details for your team",
    ],
  },
  {
    slug: "real-estate",
    name: "Real Estate",
    headline: "Turn listing traffic into booked viewings",
    blurb:
      "Helix reads your listings and neighbourhood guides, answers buyer questions at midnight, and hands you the lead with name, email and phone.",
    points: [
      "Property details, pricing and availability on demand",
      "Qualifies buyers and renters before you call",
      "Viewing requests delivered to your inbox",
    ],
  },
  {
    slug: "e-commerce",
    name: "E-Commerce",
    headline: "Fewer “where is my order?” emails",
    blurb:
      "Shipping policies, sizing guides, returns and product details — answered from your own store content so shoppers never leave to find an answer.",
    points: [
      "Shipping, returns and warranty answers in one place",
      "Product recommendations from your catalogue pages",
      "Works on Shopify, WooCommerce and custom stores",
    ],
  },
  {
    slug: "healthcare",
    name: "Healthcare",
    headline: "Guide patients to the right information",
    blurb:
      "Opening hours, services, insurance and preparation instructions answered clearly, with a handoff to your staff whenever it matters.",
    points: [
      "Clinic hours, locations and service explanations",
      "Appointment requests captured with contact details",
      "Escalates anything it cannot answer to your team",
    ],
  },
  {
    slug: "it-support",
    name: "IT Support",
    headline: "A first line of support that never sleeps",
    blurb:
      "Point Helix at your docs and knowledge base. It resolves repeat questions and files the rest as tickets with full context.",
    points: [
      "Deflects repetitive setup and troubleshooting questions",
      "Cites the documentation page it answered from",
      "Collects details for tickets it can't resolve",
    ],
  },
];
