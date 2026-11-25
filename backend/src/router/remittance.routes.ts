import { Router } from "express";
import {
  processRemittanceXml,
  simulateRemittance,
  getRemittances,
  resubmitClaim,
} from "../controller/remittance.controller";
import { protect } from "../middleware/auth.middleware";

const router = Router();
router.use(protect);

router.post("/process-xml", processRemittanceXml);
router.post("/simulate/:claimId", simulateRemittance);
router.get("/", getRemittances);
router.post("/claims/:id/resubmit", resubmitClaim);

export default router;
