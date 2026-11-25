import { Router } from "express";
import {
  createPatient,
  searchPatients,
  getPatientById,
  updatePatient,
  addPatientPolicy,
  verifyPatientEligibility,
  getEligibilityHistory,
} from "../controller/patient.controller";
import { protect, authorize } from "../middleware/auth.middleware";

const router = Router();

// Protect all patient endpoints - accessible by reception, doctor, billing, admin, superadmin
router.use(protect);

router.post("/", authorize("reception", "admin", "superadmin"), createPatient);
router.get("/", searchPatients);
router.get("/:id", getPatientById);
router.put("/:id", authorize("reception", "admin", "superadmin"), updatePatient);

// Policies
router.post("/:id/policies", authorize("reception", "admin", "superadmin"), addPatientPolicy);

// Eligibility
router.post("/:id/eligibility/verify", authorize("reception", "doctor", "billing", "admin", "superadmin"), verifyPatientEligibility);
router.get("/:id/eligibility/history", getEligibilityHistory);

export default router;
