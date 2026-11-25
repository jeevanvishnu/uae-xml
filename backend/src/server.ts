import "dotenv/config";
import app from "./app";
import { cleanupExpiredSessions } from "./controller/auth.controller";

const PORT = process.env.PORT || 5000;

function scheduleSessionCleanup() {
  cleanupExpiredSessions().catch(() => null);
  setInterval(() => {
    cleanupExpiredSessions().catch(() => null);
  }, 24 * 60 * 60 * 1000);
}

// Start Server
async function startServer() {
  scheduleSessionCleanup();
  app.listen(PORT, () => {
    console.log(`🚀 UAE Healthcare Claims API running on http://localhost:${PORT}`);
    console.log(`📊 Health check available at http://localhost:${PORT}/health`);
  });
}

startServer();
