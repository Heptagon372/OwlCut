// 통계 타일: label · value · detail (값은 본문색, 색으로 의미를 싣지 않음)
export function StatTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
      {detail && <p className="mt-1 text-xs text-muted">{detail}</p>}
    </div>
  );
}
