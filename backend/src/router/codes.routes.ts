import { Router } from "express";
import { searchIcd10, searchCpt, searchDrugs } from "../controller/codes.controller";
import { protect } from "../middleware/auth.middleware";

const router = Router();
router.use(protect);

router.get("/icd10", searchIcd10);
router.get("/cpt", searchCpt);
router.get("/drugs", searchDrugs);

export default router;
