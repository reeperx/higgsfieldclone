import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { TriangleAlert } from "lucide-react"

import { BRAND } from "@/lib/brand"

type Section = { id: string; title: string; body: string[] }
type LegalDoc = { title: string; summary: string; sections: Section[] }

const name = BRAND.name
const mail = BRAND.supportEmail

/**
 * PLACEHOLDER legal copy. It describes how the product works so the pages are
 * useful in development, framed for South African law (POPIA / CPA) because
 * Vendo prices in rand — but it has not been reviewed by a lawyer and must be
 * replaced before launch.
 */
const DOCS: Record<string, LegalDoc> = {
  terms: {
    title: "Terms of Service",
    summary: `The rules for using ${name}: your account, credits and plans, and what you can do with what you make.`,
    sections: [
      {
        id: "agreement",
        title: "1. The agreement",
        body: [
          `These terms are an agreement between you and the ${name} operator (the "operator", details in §8) about your use of our website, studio and related services. By creating an account or using ${name} you accept them.`,
          "If you use the service for a company, you confirm you can accept these terms on its behalf.",
        ],
      },
      {
        id: "account",
        title: "2. Your account",
        body: [
          "You sign in with a link sent to your email address. Keep access to that inbox secure; anyone who can open it can sign in as you.",
          "You must be at least 18 years old, or the age of majority where you live, to create an account.",
        ],
      },
      {
        id: "credits",
        title: "3. Credits, prices and payments",
        body: [
          "Generations are paid for with credits. The price of each run in credits is shown before you start it. Credits for failed, canceled or filtered runs are returned automatically.",
          "All amounts are in South African rand (ZAR) and exclude VAT unless stated otherwise. Payments are processed by our payment provider, Bachs; we never see or store your card details.",
          "Plan credits are refilled at each monthly renewal and do not carry over. Top-up credits do not expire. Credits have no cash value and cannot be transferred or exchanged for money.",
          "Subscriptions renew automatically until canceled. You can cancel at any time from Account → Billing; your plan remains active until the end of the paid period and cancellation takes effect then.",
          "What we owe you when a purchase doesn't work out — cooling-off, failed generations and half-used top-ups — is set out in our Refund Policy, which forms part of these terms.",
        ],
      },
      {
        id: "content",
        title: "4. What you create",
        body: [
          "You remain responsible for the prompts and files you upload. Rights in generated outputs and any commercial use depend on applicable law, the upstream model terms, and written permissions Vendo has not yet confirmed. These draft pages do not grant commercial-use rights.",
          "Publishing makes a generation visible to other visitors and may expose its prompt and settings. The final license, reuse permissions, and limits on copies or cached content have not been reviewed.",
          "You are responsible for making sure the product photos and videos you create are accurate and lawful — don't present AI-generated results in a way that misleads your customers about what you're selling.",
        ],
      },
      {
        id: "use",
        title: "5. Acceptable use",
        body: [
          "You agree to follow our Acceptable Use Policy. We may block, remove or unpublish content, and suspend accounts, that break it.",
        ],
      },
      {
        id: "service",
        title: "6. The service",
        body: [
          `${name} relies on third-party AI models. Results vary, models change, and we may add, update or retire models and features.`,
          "We work to keep the service available but do not promise it will be uninterrupted or error-free.",
          "Our obligation when the service can't deliver what you paid for is a refund of the unused credits for that purchase — see the Refund Policy.",
        ],
      },
      {
        id: "liability",
        title: "7. Disclaimers and liability",
        body: [
          "The service is provided as is. To the extent the law allows, our total liability is limited to the amount you paid us in the twelve months before the claim.",
          "Nothing in these terms limits rights the Consumer Protection Act 68 of 2008 gives you, which cannot be waived.",
        ],
      },
      {
        id: "changes",
        title: "8. Operator, law and contact",
        body: [
          `The operator of ${name}, its registration details and address will be published here before launch.`,
          "These terms are governed by the law of South Africa.",
          "We may update these terms. If a change is material we will tell you before it takes effect.",
          `Questions? Write to ${mail}.`,
        ],
      },
    ],
  },
  refunds: {
    title: "Refund Policy",
    summary: `When ${name} refunds a purchase: instant credit refunds for failed generations, statutory cooling-off for new purchases, and how refunds are paid.`,
    sections: [
      {
        id: "generations",
        title: "1. Failed generations — automatic",
        body: [
          "If a generation fails, is filtered out for policy reasons, or is canceled while waiting in the queue, the credits it cost are returned to your balance automatically. You don't need to ask.",
          "A generation that completes is charged, even if you don't love the result — credits pay for the model run, and you can always regenerate.",
        ],
      },
      {
        id: "cooling",
        title: "2. Cooling-off on a purchase",
        body: [
          "The application of statutory cancellation and cooling-off rights to digital credits, subscriptions, and generated services has not been reviewed by South African counsel.",
          "Do not rely on this draft to determine eligibility, deadlines, deductions, or refund amounts. Vendo must publish a reviewed policy and configure matching billing practices before accepting paid customers.",
        ],
      },
      {
        id: "topups",
        title: "3. Top-up packs",
        body: [
          "Top-up credits never expire, so there is no time pressure to use them.",
          "Beyond the cooling-off period, a partly or fully unused pack can still be refunded at our discretion — write to us with your account email and the purchase date. Partially used packs refund the unused credits only.",
          "Packs used entirely (or accounts whose purchases were converted to generations) cannot be refunded, except where the law requires it.",
        ],
      },
      {
        id: "subscriptions",
        title: "4. Plans and renewals",
        body: [
          "Renewal, cancellation, digital-service quality, and statutory remedy language has not been reviewed by South African counsel. The final policy must match the actual billing provider configuration and applicable consumer law.",
        ],
      },
      {
        id: "how",
        title: "5. How refunds are paid",
        body: [
          "Refund timing, payment method, credit reversals, chargebacks, and the handling of already-spent credits require confirmation with Bachs and legal review. This draft does not promise a processing period or limit any statutory right.",
        ],
      },
    ],
  },
  cookies: {
    title: "Cookie Policy",
    summary: `The tiny number of cookies ${name} sets and why.`,
    sections: [
      {
        id: "types",
        title: "1. What we set",
        body: [
          "Authentication/session cookies are used for sign-in. The exact cookie names, lifetimes, security attributes, and any preference storage must be inventoried against the production deployment before this policy is published.",
          "The consent banner stores a preference on the device. Verify its storage mechanism and whether any analytics or marketing technologies are enabled before launch.",
        ],
      },
      {
        id: "analytics",
        title: "2. Optional cookies",
        body: [
          "This draft does not confirm whether analytics or marketing technologies are used or whether consent controls block them. Do not rely on this statement until the production stack is audited.",
        ],
      },
      {
        id: "thirds",
        title: "3. Third parties",
        body: [
          "Bachs hosts checkout and portal experiences; Resend delivers sign-in emails. Their applicable privacy and cookie practices, along with hosting and analytics providers, must be checked and described before publication.",
        ],
      },
      {
        id: "control",
        title: "4. Controlling cookies",
        body: [
          "You can clear cookies through your browser at any time; clearing session cookies signs you out.",
          "Use the Cookie settings link in the footer to change consent.",
        ],
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    summary: `What ${name} collects, why, who it is shared with and the choices you have. Processed under the Protection of Personal Information Act (POPIA).`,
    sections: [
      {
        id: "collect",
        title: "1. What we collect",
        body: [
          "Account data: your email address and, if you add them, a name and profile picture.",
          "Creative data: the prompts, settings and reference files you submit and the media we generate for you.",
          "Billing data: what you purchased (plan or top-up), the amount in rand, invoices and credit balance. Card details are handled by our payment provider (Bachs) and never reach our servers.",
          "Technical data: basic logs such as IP address, browser and error reports, used to keep the service secure and working.",
        ],
      },
      {
        id: "use",
        title: "2. How we use it",
        body: [
          "To run the service: generate media, keep your library, charge and refund credits, and send sign-in and billing emails.",
          "To keep it safe: rate limiting, fraud prevention and content moderation, including reviewing reports from other users.",
        ],
      },
      {
        id: "sharing",
        title: "3. Who we share it with (operators and processors)",
        body: [
          "The service is designed to send prompts, settings, and reference media to Higgsfield for generation. The hosted API terms and any provider-specific retention or excluded-model rules must be confirmed before customer data is sent.",
          "Bachs handles checkout; Resend handles email; MongoDB and Cloudflare R2 are used for database and media storage. The production hosting provider, processing locations, subprocessors, cross-border safeguards, and data-processing agreements remain to be documented.",
          "This draft does not establish the final purposes, lawful bases, operator/Responsible Party identity, or complete recipient list. Those details require review before account creation or paid use.",
        ],
      },
      {
        id: "public",
        title: "4. Public content",
        body: [
          "Generations are private unless you publish them. Published work shows your display name and avatar, never your email address. You can unpublish at any time.",
        ],
      },
      {
        id: "cookies",
        title: "5. Cookies",
        body: [
          "See the Cookie Policy — a short list of essential cookies, and optional analytics only with your consent.",
        ],
      },
      {
        id: "rights",
        title: "6. Retention and your POPIA rights",
        body: [
          "Retention periods for accounts, prompts, uploads, generated media, billing records, logs, backups, and provider copies have not been finalized. The production policy must state the actual retention and deletion process, including third-party copies and legal holds.",
          "POPIA rights, request verification, response timelines, complaint routes, and cross-border processing disclosures must be finalized with the identified Responsible Party and South African counsel. Contact details listed here are not a substitute for those disclosures.",
        ],
      },
    ],
  },
  "acceptable-use": {
    title: "Acceptable Use Policy",
    summary: `What you can't make or do with ${name}, and what happens when someone does.`,
    sections: [
      {
        id: "never",
        title: "1. Never allowed",
        body: [
          "Sexual content involving minors, or content that sexualises minors in any way.",
          "Sexual or intimate imagery of a real person without their consent.",
          "Content that impersonates real people to deceive, including fake endorsements and misleading deepfakes.",
        ],
      },
      {
        id: "harm",
        title: "2. Harmful content",
        body: [
          "Content that promotes violence, terrorism or self-harm, or that harasses or threatens people.",
          "Hateful content that attacks people for who they are.",
          "Instructions or imagery meant to help someone cause serious harm.",
        ],
      },
      {
        id: "rights",
        title: "3. Other people's rights",
        body: [
          "Only upload references you have the right to use. Don't use the service to copy someone else's copyrighted work, trademark or likeness without permission.",
          "Product photography is commercial work: don't generate fake labels, certifications or regulatory stamps for products you sell.",
        ],
      },
      {
        id: "platform",
        title: "4. Respect the platform",
        body: [
          "No spam, scams or malware. No attempts to get around content filters, rate limits or credit charges, and no automated scraping of the site.",
        ],
      },
      {
        id: "enforcement",
        title: "5. Reporting and enforcement",
        body: [
          "Use the Report button on any public generation to flag it. Our team reviews reports and may unpublish content, remove it or suspend accounts.",
          `For urgent concerns, write to ${mail}.`,
        ],
      },
    ],
  },
}

const SLUGS = Object.keys(DOCS)

export const dynamicParams = false

export function generateStaticParams(): { doc: string }[] {
  return SLUGS.map((doc) => ({ doc }))
}

type Params = Promise<{ doc: string }>

export async function generateMetadata({
  params,
}: {
  params: Params
}): Promise<Metadata> {
  const { doc } = await params
  const entry = Object.hasOwn(DOCS, doc) ? DOCS[doc] : undefined
  if (!entry) return { title: "Not found" }
  return {
    title: entry.title,
    description: entry.summary,
    robots: { index: false },
  }
}

export default async function LegalPage({ params }: { params: Params }) {
  const { doc } = await params
  const entry = Object.hasOwn(DOCS, doc) ? DOCS[doc] : undefined
  if (!entry) notFound()

  return (
    <div className="mx-auto flex w-full max-w-[1096px] flex-col gap-8 px-4 pt-10 md:pt-14">
      <div
        role="note"
        className="flex items-start gap-3 rounded-2xl border border-sand/30 bg-sand/10 p-4 text-sm text-gold-soft"
      >
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>
          <strong className="font-semibold">
            Placeholder — replace before launch.
          </strong>{" "}
          This is not an operative policy or legal advice. The operator&apos;s
          identity, rights, consumer terms, retention periods, and South African
          disclosures still require review. Do not rely on this draft before
          launch.
        </p>
      </div>

      <nav aria-label="Legal documents" className="flex flex-wrap gap-2">
        {SLUGS.map((slug) => (
          <Link
            key={slug}
            href={`/legal/${slug}`}
            aria-current={slug === doc ? "page" : undefined}
            className={
              slug === doc
                ? "inline-flex h-9 items-center rounded-full bg-sand/10 px-4 text-sm font-medium text-sand"
                : "inline-flex h-9 items-center rounded-full px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
            }
          >
            {DOCS[slug]!.title}
          </Link>
        ))}
      </nav>

      <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <nav
            aria-label="On this page"
            className="sticky top-24 flex flex-col gap-1 text-sm"
          >
            <p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground">
              On this page
            </p>
            {entry.sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="rounded-md py-1 text-muted-foreground transition-colors hover:text-foreground"
              >
                {section.title}
              </a>
            ))}
          </nav>
        </aside>
        <article className="flex max-w-[720px] flex-col gap-8">
          <header className="flex flex-col gap-3">
            <h1 className="text-[36px] leading-tight font-semibold tracking-[-0.02em] md:text-[44px]">
              {entry.title}
            </h1>
            <p className="text-base text-muted-foreground">{entry.summary}</p>
            <p className="text-xs text-muted-foreground">
              Last updated: not yet published
            </p>
          </header>
          {entry.sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              aria-labelledby={`${section.id}-title`}
              className="scroll-mt-24"
            >
              <h2
                id={`${section.id}-title`}
                className="mb-3 text-lg font-semibold"
              >
                {section.title}
              </h2>
              <div className="flex flex-col gap-3 text-[15px] leading-7 text-muted-foreground">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </article>
      </div>
    </div>
  )
}
