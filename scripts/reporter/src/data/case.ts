import type { CaseRecord } from "../types.js"

export async function fetchCasesByIds(
  db: any,
  ids: string[]
): Promise<CaseRecord[]> {
  if (ids.length === 0) return []

  const cmd = db.command
  const { data } = await db
    .collection("Case")
    .where({
      id: cmd.in(ids),
      status: "published",
    })
    .limit(100)
    .get()

  return data ?? []
}

export async function fetchCaseById(
  db: any,
  id: string
): Promise<CaseRecord | null> {
  const { data } = await db
    .collection("Case")
    .where({ id, status: "published" })
    .limit(1)
    .get()

  return data?.[0] ?? null
}
