import { Router } from "express";
import {
  createEncounter,
  getEncounters,
  getEncounterById,
  updateEncounter,
  finalizeEncounter,
} from "../controller/encounter.controller";
import { protect } from "../middleware/auth.middleware";

const router = Router();
router.use(protect);

router.post("/", createEncounter);
router.get("/", getEncounters);
router.get("/:id", getEncounterById);
router.put("/:id", updateEncounter);
router.put("/:id/finalize", finalizeEncounter);

export default router;
