"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { searchCustomers } from "@/actions/customers";
import { sendReminderMessage, listMessageLogs } from "@/actions/messages";

type Customer = { _id: string; name: string; phone: string };

type MessageLogRow = {
  _id: string;
  customerId: { name: string; phone: string } | null;
  message: string;
  status: "sent" | "failed" | "pending";
  sentAt: string;
};

const TEMPLATES = [
  "Your vehicle is ready for pickup.",
  "Payment reminder: outstanding balance of ৳X",
];

export function MessagesPanel({ initialLogs }: { initialLogs: MessageLogRow[] }) {
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [message, setMessage] = useState("");
  const [logs, setLogs] = useState(initialLogs);
  const [error, setError] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (selected) return;
    const handle = setTimeout(async () => {
      if (!query.trim()) {
        setCandidates([]);
        return;
      }
      const results = await searchCustomers(query);
      setCandidates(results as Customer[]);
    }, 300);
    return () => clearTimeout(handle);
  }, [query, selected]);

  async function refreshLogs(customerId?: string) {
    const results = await listMessageLogs(customerId);
    setLogs(results as MessageLogRow[]);
  }

  async function handleSend() {
    setError(null);
    setStatusNote(null);
    if (!selected) {
      setError("Select a customer first");
      return;
    }
    if (!message.trim()) {
      setError("Message cannot be empty");
      return;
    }
    setIsSending(true);
    const result = await sendReminderMessage({ customerId: selected._id, message });
    setIsSending(false);

    if (!result.success) {
      setError(result.error);
      return;
    }
    if (result.data.status === "failed") {
      setStatusNote(`Send failed: ${result.data.error ?? "unknown provider error"}`);
    } else {
      setStatusNote("Message sent.");
    }
    setMessage("");
    await refreshLogs();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Send Reminder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!selected ? (
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Search customer</label>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name or phone..."
              />
              {candidates.length > 0 && (
                <div className="rounded-md border">
                  {candidates.map((c) => (
                    <button
                      type="button"
                      key={c._id}
                      onClick={() => {
                        setSelected(c);
                        setCandidates([]);
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
                    >
                      <span>{c.name}</span>
                      <span className="text-muted-foreground">{c.phone}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between text-sm">
              <span>
                To: <span className="font-medium">{selected.name}</span> ({selected.phone})
              </span>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                Change
              </Button>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map((t) => (
              <Button key={t} type="button" variant="outline" size="sm" onClick={() => setMessage(t)}>
                {t}
              </Button>
            ))}
          </div>

          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            rows={4}
          />

          {error && <p className="text-sm text-destructive">{error}</p>}
          {statusNote && <p className="text-sm text-muted-foreground">{statusNote}</p>}

          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? "Sending..." : "Send SMS"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Sends</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No messages sent yet.
                  </TableCell>
                </TableRow>
              )}
              {logs.map((log) => (
                <TableRow key={log._id}>
                  <TableCell>{new Date(log.sentAt).toLocaleString()}</TableCell>
                  <TableCell>{log.customerId?.name ?? "—"}</TableCell>
                  <TableCell className="max-w-xs truncate">{log.message}</TableCell>
                  <TableCell>
                    <Badge variant={log.status === "sent" ? "secondary" : "outline"}>
                      {log.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
