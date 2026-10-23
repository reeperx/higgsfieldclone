"use client"

import { useState } from "react"
import { ExternalLink, Loader2 } from "lucide-react"

import { portalAction } from "@/app/actions/billing"
import { useToast } from "@/components/providers/app-providers"

/** Opens the Bachs customer portal (plan changes, cancellations, invoices). */
export function PortalButton() {
  const [pending, setPending] = useState(false)
  const toast = useToast()
  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true)
        const result = await portalAction()
        if (result.ok) {
          window.location.assign(result.data.url)
          return
        }
        setPending(false)
        toast.error("Couldn't open billing portal", result.error)
      }}
      className="flex h-11 items-center gap-2 rounded-full border border-white/10 bg-surface px-5 text-sm font-medium hover:bg-raised disabled:opacity-60"
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <ExternalLink className="size-4" />
      )}
      Manage billing
    </button>
  )
}
