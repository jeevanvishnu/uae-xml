import { Router } from "express";
import {
  createPrescription,
  getPrescriptions,
  lookupPrescriptions,
  getPrescriptionById,
  dispensePrescription,
} from "../controller/prescription.controller";
import { protect } from "../middleware/auth.middleware";

const router = Router();
router.use(protect);

router.post("/", createPrescription);
router.get("/", getPrescriptions);
router.get("/lookup", lookupPrescriptions);
router.get("/:id", getPrescriptionById);
router.post("/:id/dispense", dispensePrescription);

export default router;
