import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { adminCancelScheduledEmail, adminScheduleEmail, adminScheduledEmails } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";

export function ScheduledEmailPanel() {
  const jobs = useQuery({ queryKey: ["scheduled-emails"], queryFn: () => adminScheduledEmails() });
  const [form, setForm] = useState({ subject: "", body: "", audience: "all" as "all" | "active", sendAt: "" });
  const schedule = useMutation({
    mutationFn: () => adminScheduleEmail({ data: { subject: form.subject.trim(), body: form.body.trim(), audience: form.audience, userIds: [], sendAt: new Date(form.sendAt).toISOString() } }),
    onSuccess: () => { setForm({ subject: "", body: "", audience: "all", sendAt: "" }); void jobs.refetch(); toast.success("Email scheduled"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const cancel = useMutation({ mutationFn: (id: string) => adminCancelScheduledEmail({ data: { id } }), onSuccess: () => void jobs.refetch() });
  return <section className="surface-card p-4 sm:p-5">
    <h2 className="text-base font-bold">Scheduled emails</h2>
    <p className="mt-1 text-xs text-muted-foreground">Prepare email campaigns for the configured sender.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Subject" className="input" />
      <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value as typeof form.audience })} className="input"><option value="all">Everyone</option><option value="active">Active users</option></select>
      <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Message" rows={4} className="input h-auto sm:col-span-2" />
      <input type="datetime-local" value={form.sendAt} onChange={(e) => setForm({ ...form, sendAt: e.target.value })} className="input" />
      <Button disabled={!form.subject.trim() || !form.body.trim() || !form.sendAt || schedule.isPending} onClick={() => schedule.mutate()}>Schedule email</Button>
    </div>
    <ul className="mt-4 space-y-2">{(jobs.data ?? []).map((job) => <li key={job.id} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-border p-3"><span className="min-w-0"><span className="block truncate text-sm font-bold">{job.subject}</span><span className="text-xs text-muted-foreground">{new Date(job.send_at).toLocaleString()} · {job.audience} · {job.status}</span></span>{job.status === "pending" ? <Button size="sm" variant="outline" onClick={() => cancel.mutate(job.id)}>Cancel</Button> : null}</li>)}</ul>
  </section>;
}