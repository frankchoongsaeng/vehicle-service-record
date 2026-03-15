import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import vehiclesRouter from "./routes/vehicles";
import recordsRouter from "./routes/records";

const app = express();
const PORT = process.env.PORT || 3001;

app.set("trust proxy", 1);
app.use(cors());
app.use(express.json());

// Rate limiting: max 200 requests per minute per IP for all API routes
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
app.use("/api", apiLimiter);

// Routes
app.use("/api/vehicles", vehiclesRouter);
app.use("/api/vehicles/:vehicleId/records", recordsRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Express API server running on http://localhost:${PORT}`);
});
