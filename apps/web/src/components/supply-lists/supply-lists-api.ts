import { getCsrfTokenCookie } from "../../lib/auth-cookies";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export type SupplyItemRow = {
  id: string;
  rank: number;
  label: string;
  quantity: number;
  note: string | null;
};

export type ChildSupplyList = {
  targetSchoolYearId: string | null;
  targetSchoolYearLabel?: string;
  items: SupplyItemRow[];
  seen: boolean;
};

export async function getMyChildSupplyList(
  schoolSlug: string,
  studentId: string,
): Promise<ChildSupplyList> {
  const response = await fetch(
    `${API_URL}/schools/${schoolSlug}/me/supply-lists/students/${studentId}`,
    { credentials: "include" },
  );
  if (!response.ok) {
    throw new Error("SUPPLY_LIST_FETCH_FAILED");
  }
  return (await response.json()) as ChildSupplyList;
}

export async function markMyChildSupplyListSeen(
  schoolSlug: string,
  studentId: string,
): Promise<void> {
  const csrfToken = getCsrfTokenCookie();
  if (!csrfToken) {
    return;
  }
  await fetch(
    `${API_URL}/schools/${schoolSlug}/me/supply-lists/students/${studentId}/seen`,
    {
      method: "POST",
      credentials: "include",
      headers: { "X-CSRF-Token": csrfToken },
    },
  );
}
