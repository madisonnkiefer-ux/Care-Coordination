import { verifySession } from "@/lib/dal";
import { Sidebar } from "@/components/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Defense in depth: proxy.ts already redirects unauthenticated requests,
  // but every entry point re-verifies for itself per Next.js data-security
  // guidance (proxy coverage can silently regress on refactors).
  const session = await verifySession();

  return (
    <div className="flex min-h-screen bg-stone-50">
      <Sidebar user={{ name: session.name, email: session.email, role: session.role }} />
      <div className="flex flex-1 min-w-0 flex-col">
        <main className="flex-1 min-w-0">{children}</main>
        <footer className="border-t border-stone-200 px-8 py-4 text-center text-xs text-stone-400">
          © {new Date().getFullYear()} CareCoord Hub. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
