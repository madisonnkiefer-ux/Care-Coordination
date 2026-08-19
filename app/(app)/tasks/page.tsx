import Link from "next/link";
import { CheckSquare, Square } from "lucide-react";
import { getTasksPageData } from "@/lib/data/tasks";
import { PageHeader, Card, Badge } from "@/components/ui";
import { createTask, toggleTask } from "@/app/actions/tasks";
import { saveQuickNote } from "@/app/actions/notes";
import { formatDate, formatDateTime, titleCase } from "@/lib/format";

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ note?: string }> }) {
  const { note } = await searchParams;
  const { session, openTasks, completedTasks, notes, members, coordinators } = await getTasksPageData();
  const canAssign = session.permissions.includes("ASSIGN_WORK_TO_OTHERS");
  const returnPath = "/tasks";

  return (
    <div>
      <PageHeader title="Tasks & Reminders" description={`${openTasks.length} open task${openTasks.length === 1 ? "" : "s"}`} />

      <div className="grid grid-cols-1 gap-6 p-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Open Tasks">
            {openTasks.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">No open tasks. Nice work.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {openTasks.map((task) => {
                  const toggle = toggleTask.bind(null, task.id, returnPath);
                  return (
                    <li key={task.id} className="flex items-center gap-3 py-3 text-sm">
                      <form action={toggle}>
                        <button type="submit" className="text-slate-400 hover:text-fuchsia-600" aria-label="Toggle complete">
                          <Square className="h-4 w-4" />
                        </button>
                      </form>
                      <div className="flex-1">
                        <p className="font-medium text-slate-800">{task.title}</p>
                        {task.member && (
                          <Link href={`/members/${task.member.id}`} className="text-xs text-fuchsia-600 hover:underline">
                            {task.member.firstName} {task.member.lastName}
                          </Link>
                        )}
                      </div>
                      <PriorityBadge priority={task.priority} />
                      <span className="w-20 text-right text-xs text-slate-500">{formatDate(task.dueDate)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card title="Recently Completed">
            {completedTasks.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">Nothing completed yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {completedTasks.map((task) => {
                  const toggle = toggleTask.bind(null, task.id, returnPath);
                  return (
                    <li key={task.id} className="flex items-center gap-3 py-2.5 text-sm">
                      <form action={toggle}>
                        <button type="submit" className="text-emerald-500" aria-label="Reopen task">
                          <CheckSquare className="h-4 w-4" />
                        </button>
                      </form>
                      <span className="flex-1 text-slate-400 line-through">{task.title}</span>
                      <span className="text-xs text-slate-400">{formatDate(task.completedAt)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card id="notes" title="My Notes">
            <p className="mb-3 text-xs text-slate-400">
              Your notes across every patient, gathered here as a reminder feed. Never part of any clinical form —
              also visible on each patient&apos;s chart under Quick Notes.
            </p>
            {notes.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">No notes yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {notes.map((n) => (
                  <li key={n.id} className="py-2.5 text-sm">
                    <div className="mb-1 flex items-center justify-between gap-3">
                      {n.member && (
                        <Link href={`/members/${n.member.id}`} className="text-xs font-medium text-fuchsia-600 hover:underline">
                          {n.member.firstName} {n.member.lastName}
                        </Link>
                      )}
                      <span className="shrink-0 text-xs text-slate-400">{formatDateTime(n.createdAt)}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-slate-700">{n.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Add Task">
            <form action={createTask} className="space-y-3">
              <input type="hidden" name="returnPath" value={returnPath} />
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Title</label>
                <input name="title" required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Member</label>
                <select name="memberId" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                  <option value="">— None —</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName}
                    </option>
                  ))}
                </select>
              </div>
              {canAssign && (
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Assign To</label>
                  <select name="assigneeId" defaultValue={session.userId} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                    <option value={session.userId}>Myself</option>
                    {coordinators.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Due Date</label>
                  <input type="date" name="dueDate" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Priority</label>
                  <select name="priority" defaultValue="MEDIUM" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Add Task
              </button>
            </form>
          </Card>

          <Card title="Add Note">
            <form action={saveQuickNote} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Member</label>
                <select name="memberId" required defaultValue={note ?? ""} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                  <option value="" disabled>
                    Select a patient...
                  </option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Note</label>
                <textarea name="body" required rows={3} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <button
                type="submit"
                className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Save Note
              </button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: "LOW" | "MEDIUM" | "HIGH" }) {
  const color = priority === "HIGH" ? "red" : priority === "MEDIUM" ? "yellow" : "slate";
  return <Badge color={color}>{titleCase(priority)}</Badge>;
}
