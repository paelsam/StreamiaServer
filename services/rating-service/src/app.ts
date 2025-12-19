import express from "express";
import cors from "cors";
import ratingRoutes from "./routes/ratingRoutes";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/ratings", ratingRoutes);

app.get("/health/live", (_req, res) => {
  res.status(200).json({
    status: "live",
    service: "rating-service"
  });
});

app.get("/health/ready", (_req, res) => {
  res.status(200).json({
    status: "ready",
    service: "rating-service"
  });
});

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "rating-service"
  });
});

export default app;