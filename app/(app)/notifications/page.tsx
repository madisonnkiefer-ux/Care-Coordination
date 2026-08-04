import { getAllNotifications } from "@/lib/data/notifications";
import { markAllNotificationsRead } from "@/app/actions/notifications";
import { PageHeader } from "@/components/ui";
import { NotificationsList } from "@/components/notifications-list";

export default async function NotificationsPage() {
  const notifications = await getAllNotifications();
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div>
      <PageHeader
        title="Notifications"
        description={`${unreadCount} unread`}
        action={
          unreadCount > 0 ? (
            <form action={markAllNotificationsRead}>
              <button type="submit" className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50">
                Mark all as read
              </button>
            </form>
          ) : undefined
        }
      />
      <div className="p-8">
        <NotificationsList notifications={notifications} />
      </div>
    </div>
  );
}
