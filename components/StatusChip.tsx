import { STATUS_LABEL, type MonthStatus } from "@/lib/ledger";

/* A small coloured label for one member's month: Paid, Part paid, Late, Due or Not yet */
const STYLE: Record<MonthStatus, string> = {
  paid: "bg-marker-soft text-marker",
  part: "bg-amber-soft text-amber",
  late: "bg-alert-soft text-alert",
  due: "bg-teal-soft text-teal",
  upcoming: "border border-line text-ink-soft",
};

export default function StatusChip({ status, label }: { status: MonthStatus; label?: string }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${STYLE[status]}`}>{label ?? STATUS_LABEL[status]}</span>;
}
