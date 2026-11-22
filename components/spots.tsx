export function Spots({ filled, needed }: { filled: number; needed: number }) {
  const full = filled >= needed;
  const percent = Math.min(100, Math.round((filled / needed) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium text-slate-800">
          {filled} of {needed} spots filled
        </span>
        <span className={full ? "font-semibold text-slate-500" : "font-semibold text-emerald-700"}>
          {full ? "Full" : `${needed - filled} left`}
        </span>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-label="Spots filled"
        aria-valuemin={0}
        aria-valuemax={needed}
        aria-valuenow={Math.min(filled, needed)}
      >
        <div
          className={`h-full rounded-full ${full ? "bg-slate-400" : "bg-emerald-500"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
