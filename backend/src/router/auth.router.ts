import { Router } from "express";
import {
  signIn,
  refreshAccessToken,
  logout,
  getMe,
  changePassword,
  forgotPassword,
  resetPassword,
} from "../controller/auth.controller";
import { protect } from "../middleware/auth.middleware";

const router = Router();

// ─── Public Routes ───────────────────────────────────────────────────────────
router.post("/signin", signIn);
router.post("/refresh", refreshAccessToken);
router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// ─── Protected Routes ────────────────────────────────────────────────────────
router.get("/me", protect, getMe);
router.post("/change-password", protect, changePassword);

export default router;
