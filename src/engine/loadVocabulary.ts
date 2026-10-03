import * as XLSX from "xlsx";
import type { Chapter } from "./types";
export const CHAPTER_NAMES = ["Chapter 16", "Chapter 17", "Chapter 18"];
export const WORKBOOK_URL = "/data/Ety_Vocab_Ch16_18.xlsx";
export function parseVocabulary(bytes: ArrayBuffer | Uint8Array): {
  chapters: Chapter[];
  warnings: string[];
} {
  const workbook = XLSX.read(new Uint8Array(bytes), { type: "array" });
  const warnings: string[] = [];
  const chapters = CHAPTER_NAMES.flatMap((id) => {
    const sheet = workbook.Sheets[id];
    if (!sheet) {
      warnings.push(id + " 시트를 찾을 수 없습니다.");
      return [];
    }
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: true,
      defval: "",
    });
    const headers = ["No.", "Word", "Korean Translation", "Example Sentence"];
    if (!headers.every((h, i) => rows[0]?.[i] === h)) {
      warnings.push(id + " 열 형식이 올바르지 않습니다.");
      return [];
    }
    const entries: Chapter["entries"] = [];
    const seen = new Set<string>();
    rows.slice(1).forEach((row, i) => {
      if (row.every((v) => v === "")) return;
      if (
        typeof row[1] !== "string" ||
        !row[1] ||
        typeof row[2] !== "string" ||
        !row[2] ||
        typeof row[3] !== "string"
      ) {
        warnings.push(id + " " + (i + 2) + "행을 건너뛰었습니다.");
        return;
      }
      // Preserve study strings verbatim. Duplicate spellings cannot form distinct choices.
      if (seen.has(row[1])) {
        warnings.push(id + " 중복 단어: " + row[1]);
        return;
      }
      seen.add(row[1]);
      entries.push({
        id: id + ":" + (i + 2),
        no: String(row[0]),
        word: row[1],
        meaning: row[2],
        sentence: row[3],
      });
    });
    return [{ id, entries }];
  });
  return { chapters, warnings };
}
export async function loadVocabulary() {
  const response = await fetch(WORKBOOK_URL);
  if (!response.ok)
    throw new Error(
      "어휘 파일을 불러오지 못했습니다. (" + response.status + ")",
    );
  const result = parseVocabulary(await response.arrayBuffer());
  if (!result.chapters.length)
    throw new Error("사용할 수 있는 어휘 시트가 없습니다.");
  return result;
}
