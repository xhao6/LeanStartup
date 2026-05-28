import type { DailyPickRecord } from "../types.js"

export async function fetchDailyPick(
  db: any,
  date: string
): Promise<DailyPickRecord | null> {
  const { data } = await db
    .collection("DailyPick")
    .where({ date })
    .limit(1)
    .get()

  return data?.[0] ?? null
}

export async function fetchRecentPicks(
  db: any,
  count: number
): Promise<DailyPickRecord[]> {
  const { data } = await db
    .collection("DailyPick")
    .orderBy("date", "desc")
    .limit(count)
    .get()

  return data ?? []
}
