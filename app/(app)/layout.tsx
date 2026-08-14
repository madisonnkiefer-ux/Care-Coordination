import { verifySession } from "@/lib/dal";
import { Sidebar } from "@/components/sidebar";
import { getNotificationBellData } from "@/lib/data/notifications";
import { SessionTimeoutWarning } from "@/components/session-timeout-warning";
import { SessionHeartbeat } from "@/components/session-heartbeat";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Defense in depth: proxy.ts already redirects unauthenticated requests,
  // but every entry point re-verifies for itself per Next.js data-security
  // guidance (proxy coverage can silently regress on refactors).
  const session = await verifySession();
  const notificationData = await getNotificationBellData();

  return (
    <div className="flex min-h-screen bg-stone-50">
      <SessionTimeoutWarning />
      <SessionHeartbeat />
      <Sidebar user={{ name: session.name, email: session.email, role: session.role }} notificationData={notificationData} />
      <div className="flex flex-1 min-w-0 flex-col">
        <main className="min-w-0">{children}</main>
        <footer className="border-t border-stone-200 px-8 py-4 text-center text-xs text-stone-400">
          © {new Date().getFullYear()} Avanza Care. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
