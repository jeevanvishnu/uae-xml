import { Request, Response } from "express";
import { ilike, or, desc } from "drizzle-orm";
import { db } from "../db/db";
import { icd10Codes, cptCodes, drugCodes } from "../db/schema";

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/codes/icd10 (Search ICD-10 Diagnosis Codes)
// ─────────────────────────────────────────────────────────────────────────────
export async function searchIcd10(req: Request, res: Response): Promise<void> {
  const query = (req.query.q as string)?.trim() || "";

  try {
    const results = await db
      .select()
      .from(icd10Codes)
      .where(
        query
          ? or(
              ilike(icd10Codes.code, `%${query}%`),
              ilike(icd10Codes.description, `%${query}%`),
              ilike(icd10Codes.category, `%${query}%`)
            )
          : undefined
      )
      .limit(30);

    res.status(200).json({ success: true, data: { codes: results } });
  } catch (error: any) {
    console.error("[CODES] 💥 ICD-10 search error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/codes/cpt (Search CPT Procedure & Service Codes)
// ─────────────────────────────────────────────────────────────────────────────
export async function searchCpt(req: Request, res: Response): Promise<void> {
  const query = (req.query.q as string)?.trim() || "";

  try {
    const results = await db
      .select()
      .from(cptCodes)
      .where(
        query
          ? or(
              ilike(cptCodes.code, `%${query}%`),
              ilike(cptCodes.description, `%${query}%`),
              ilike(cptCodes.category, `%${query}%`)
            )
          : undefined
      )
      .limit(30);

    res.status(200).json({ success: true, data: { codes: results } });
  } catch (error: any) {
    console.error("[CODES] 💥 CPT search error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/codes/drugs (Search UAE DDC Drug Codes)
// ─────────────────────────────────────────────────────────────────────────────
export async function searchDrugs(req: Request, res: Response): Promise<void> {
  const query = (req.query.q as string)?.trim() || "";

  try {
    const results = await db
      .select()
      .from(drugCodes)
      .where(
        query
          ? or(
              ilike(drugCodes.drugCode, `%${query}%`),
              ilike(drugCodes.tradeName, `%${query}%`),
              ilike(drugCodes.genericName, `%${query}%`)
            )
          : undefined
      )
      .limit(30);

    res.status(200).json({ success: true, data: { drugs: results } });
  } catch (error: any) {
    console.error("[CODES] 💥 Drug search error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}
