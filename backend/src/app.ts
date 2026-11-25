import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { sql } from "drizzle-orm";

import { db } from "./db/db";
import authRouter from "./router/auth.router";
import patientRoutes from "./router/patient.routes";
import encounterRoutes from "./router/encounter.routes";
import codesRoutes from "./router/codes.routes";
import prescriptionRoutes from "./router/prescription.routes";
import claimRoutes from "./router/claim.routes";
import remittanceRoutes from "./router/remittance.routes";
import facilityRoutes from "./router/facility.routes";

const app = express();

const isProduction = process.env.NODE_ENV === "production";
const frontendUrl = process.env.FRONTEND_URL;

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
];

if (frontendUrl) {
  allowedOrigins.push(frontendUrl);
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || !isProduction) {
        return callback(null, true);
      }
      return callback(new Error("CORS policy: Not allowed by CORS"), false);
    },
    credentials: true,
  })
);

// Body Parser & Cookie Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(cookieParser());

// ─── Healthcare Platform Routes ──────────────────────────────────────────────
app.use("/api/auth", authRouter);
app.use("/api/patients", patientRoutes);
app.use("/api/encounters", encounterRoutes);
app.use("/api/codes", codesRoutes);
app.use("/api/prescriptions", prescriptionRoutes);
app.use("/api/claims", claimRoutes);
app.use("/api/remittance", remittanceRoutes);
app.use("/api/facilities", facilityRoutes);

app.get("/", (req: Request, res: Response) => {
  res.json({
    name: "UAE Healthcare & Insurance e-Claims Integration Platform (Riayati/DHA)",
    version: "1.0.0",
    status: "online",
  });
});

// Database Health Check Route
app.get("/health", async (req: Request, res: Response) => {
  try {
    const result = await db.execute(sql`SELECT NOW() as current_time`);
    res.json({
      status: "healthy",
      database: "connected",
      neonTime: (result as any).rows?.[0]?.current_time || null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Database health check failed:", error);
    res.status(500).json({
      status: "unhealthy",
      database: "disconnected",
      error: isProduction ? "Failed to connect to database" : error.message || "Failed to connect to database",
      timestamp: new Date().toISOString(),
    });
  }
});

// Global Error Handling Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("[GLOBAL ERROR HANDLER]", err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({
    success: false,
    message: isProduction ? "Internal server error" : err.message || "Internal server error",
  });
});

export default app;
