import { Router } from "express";
import {
  generateClaim,
  submitClaim,
  getClaims,
  getClaimById,
} from "../controller/claim.controller";
import { protect } from "../middleware/auth.middleware";

const router = Router();
router.use(protect);

router.post("/generate", generateClaim);
router.post("/:id/submit", submitClaim);
router.get("/", getClaims);
router.get("/:id", getClaimById);

export default router;
