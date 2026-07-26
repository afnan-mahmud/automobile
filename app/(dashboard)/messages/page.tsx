import { requirePageRole } from "@/lib/auth";
import { listMessageLogs } from "@/actions/messages";
import { MessagesPanel } from "./messages-panel";

export default async function MessagesPage() {
  await requirePageRole(["admin", "manager"]);
  const logs = await listMessageLogs();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Messages</h2>
      <MessagesPanel initialLogs={logs} />
    </div>
  );
}
