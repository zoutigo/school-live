import { Pencil, Trash2 } from "lucide-react";
import { ActionIconButton } from "../ui/action-icon-button";
import { useTranslation, type TranslateFn } from "../../i18n/useTranslation";

export type LifeEventType = "ABSENCE" | "RETARD" | "SANCTION" | "PUNITION";

export type LifeEventRow = {
  id: string;
  type: LifeEventType;
  occurredAt: string;
  durationMinutes: number | null;
  justified: boolean | null;
  reason: string;
  comment: string | null;
  class?: { id: string; name: string } | null;
  schoolYear?: { id: string; label: string } | null;
  authorUser: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
};

type Props = {
  events: LifeEventRow[];
  emptyLabel: string;
  onEdit?: (row: LifeEventRow) => void;
  onDelete?: (row: LifeEventRow) => void;
  deletingEventId?: string | null;
  formatDate?: (value: string) => string;
};

export function lifeEventTypeLabel(t: TranslateFn, type: LifeEventType) {
  if (type === "ABSENCE") {
    return t("discipline.types.absence");
  }
  if (type === "RETARD") {
    return t("discipline.types.retard");
  }
  if (type === "SANCTION") {
    return t("discipline.types.sanction");
  }
  return t("discipline.types.punition");
}

function lifeEventTypePill(type: LifeEventType) {
  if (type === "ABSENCE") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }
  if (type === "RETARD") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (type === "SANCTION") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700";
}

export function LifeEventsList({
  events,
  emptyLabel,
  onEdit,
  onDelete,
  deletingEventId = null,
  formatDate,
}: Props) {
  const { locale, t } = useTranslation();
  const showActions = Boolean(onEdit || onDelete);
  const dateFormatter =
    formatDate ??
    ((value: string) =>
      new Date(value).toLocaleString(locale === "en" ? "en-GB" : "fr-FR"));

  return (
    <>
      <div className="hidden overflow-x-auto lg:block">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-text-secondary">
              <th className="px-3 py-2 font-medium">
                {t("discipline.list.columns.type")}
              </th>
              <th className="px-3 py-2 font-medium">
                {t("discipline.list.columns.date")}
              </th>
              <th className="px-3 py-2 font-medium">
                {t("discipline.list.columns.reason")}
              </th>
              <th className="px-3 py-2 font-medium">
                {t("discipline.list.columns.duration")}
              </th>
              <th className="px-3 py-2 font-medium">
                {t("discipline.list.columns.justified")}
              </th>
              <th className="px-3 py-2 font-medium">
                {t("discipline.list.columns.author")}
              </th>
              {showActions ? (
                <th className="px-3 py-2 font-medium">
                  {t("discipline.list.columns.actions")}
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td
                  className="px-3 py-6 text-text-secondary"
                  colSpan={showActions ? 7 : 6}
                >
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              events.map((row) => (
                <tr key={row.id} className="border-b border-border">
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${lifeEventTypePill(
                        row.type,
                      )}`}
                    >
                      {lifeEventTypeLabel(t, row.type)}
                    </span>
                  </td>
                  <td className="px-3 py-2">{dateFormatter(row.occurredAt)}</td>
                  <td className="px-3 py-2">{row.reason}</td>
                  <td className="px-3 py-2">
                    {typeof row.durationMinutes === "number"
                      ? `${row.durationMinutes} min`
                      : "-"}
                  </td>
                  <td className="px-3 py-2">
                    {row.justified === null
                      ? "-"
                      : row.justified
                        ? t("discipline.common.yes")
                        : t("discipline.common.no")}
                  </td>
                  <td className="px-3 py-2">
                    {row.authorUser.lastName} {row.authorUser.firstName}
                  </td>
                  {showActions ? (
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        {onEdit ? (
                          <ActionIconButton
                            icon={Pencil}
                            label={t("discipline.list.editAria")}
                            variant="primary"
                            onClick={() => onEdit(row)}
                          />
                        ) : null}
                        {onDelete ? (
                          <ActionIconButton
                            icon={Trash2}
                            label={t("discipline.list.deleteAria")}
                            variant="destructive"
                            disabled={deletingEventId === row.id}
                            onClick={() => onDelete(row)}
                          />
                        ) : null}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 lg:hidden">
        {events.length === 0 ? (
          <p className="text-sm text-text-secondary">{emptyLabel}</p>
        ) : (
          events.map((row) => (
            <article
              key={row.id}
              className="rounded-card border border-border bg-background p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${lifeEventTypePill(
                    row.type,
                  )}`}
                >
                  {lifeEventTypeLabel(t, row.type)}
                </span>
                <span className="text-xs text-text-secondary">
                  {dateFormatter(row.occurredAt)}
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold text-text-primary">
                {row.reason}
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                {t("discipline.list.durationPrefix")}{" "}
                {typeof row.durationMinutes === "number"
                  ? `${row.durationMinutes} min`
                  : "-"}
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                {t("discipline.list.justifiedPrefix")}{" "}
                {row.justified === null
                  ? "-"
                  : row.justified
                    ? t("discipline.common.yes")
                    : t("discipline.common.no")}
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                {t("discipline.list.authorPrefix")} {row.authorUser.lastName}{" "}
                {row.authorUser.firstName}
              </p>
              {showActions ? (
                <div className="mt-3 flex gap-2">
                  {onEdit ? (
                    <ActionIconButton
                      icon={Pencil}
                      label={t("discipline.list.editAria")}
                      variant="primary"
                      onClick={() => onEdit(row)}
                    />
                  ) : null}
                  {onDelete ? (
                    <ActionIconButton
                      icon={Trash2}
                      label={t("discipline.list.deleteAria")}
                      variant="destructive"
                      disabled={deletingEventId === row.id}
                      onClick={() => onDelete(row)}
                    />
                  ) : null}
                </div>
              ) : null}
            </article>
          ))
        )}
      </div>
    </>
  );
}
