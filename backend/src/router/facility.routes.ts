import { Router } from "express";
import {
  getCurrentFacility,
  updateCurrentFacility,
  getClinicians,
  addClinician,
} from "../controller/facility.controller";
import { protect } from "../middleware/auth.middleware";

const router = Router();
router.use(protect);

router.get("/current", getCurrentFacility);
router.put("/current", updateCurrentFacility);
router.get("/clinicians", getClinicians);
router.post("/clinicians", addClinician);

export default router;
