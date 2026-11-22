"use client";

import { useState, useTransition } from "react";
import { CopyButton } from "@/components/copy-button";
import { removeVolunteer } from "../../actions";

type Row = { id: string; name: string; email: string; signedUp: string };

// Spreadsheet apps run cells starting with these as formulas; volunteers type their own names.
function csvCell(value: string) {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

function downloadCsv(rows: Row[], filename: string) {
  const lines = [["Name", "Email", "Signed up"], ...rows.map((r) => [r.name, r.email, r.signedUp])];
  const csv = lines.map((line) => line.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: filename });
  link.click();
  URL.revokeObjectURL(url);
}

export function RosterTable({ volunteers, eventSlug }: { volunteers: Row[]; eventSlug: string }) {
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function remove(volunteer: Row) {
    if (!window.confirm(`Remove ${volunteer.name} (${volunteer.email}) from this event?`)) return;
    setError(null);
    setRemovingId(volunteer.id);
    startTransition(async () => {
      const result = await removeVolunteer(volunteer.id);
      if (result.error) setError(result.error);
      setRemovingId(null);
    });
  }

  if (volunteers.length === 0) {
    return <div className="card p-8 text-center text-slate-600">No one has signed up yet.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <CopyButton text={volunteers.map((v) => v.email).join(", ")} label="Copy all emails" />
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => downloadCsv(volunteers, `${eventSlug}-volunteers.csv`)}
        >
          Download CSV
        </button>
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      <div className="card relative overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Signed up</th>
              <th className="px-4 py-3">
                <span className="sr-only">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {volunteers.map((volunteer) => (
              <tr key={volunteer.id}>
                <td className="px-4 py-3 font-medium">{volunteer.name}</td>
                <td className="px-4 py-3">
                  <a href={`mailto:${volunteer.email}`} className="link">
                    {volunteer.email}
                  </a>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-slate-600">{volunteer.signedUp}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    className="btn btn-quiet-danger px-3 py-1"
                    disabled={removingId === volunteer.id}
                    onClick={() => remove(volunteer)}
                  >
                    {removingId === volunteer.id ? "Removing…" : "Remove"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
