import { TopNav } from "@/components/site/top-nav"

/** Signed-in app pages that scroll (account, billing, admin): compact nav, no footer. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <TopNav compact />
      <main
        id="main"
        className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-10 md:px-8"
      >
        {children}
      </main>
    </div>
  )
}
