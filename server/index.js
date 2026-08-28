import express from "express";
import cors from "cors";
import "dotenv/config";

import summaryRouter from "./routes/summary.js";
import campaignsRouter from "./routes/campaigns.js";
import couponsRouter from "./routes/coupons.js";
import funnelRouter from "./routes/funnel.js";
import trendRouter from "./routes/trend.js";
import crossRouter from "./routes/cross.js";
import productsRouter from "./routes/products.js";
import applicationsRouter from "./routes/applications.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/summary", summaryRouter);
app.use("/api/campaigns", campaignsRouter);
app.use("/api/coupons", couponsRouter);
app.use("/api/funnel", funnelRouter);
app.use("/api/trend", trendRouter);
app.use("/api/cross", crossRouter);
app.use("/api/products", productsRouter);
app.use("/api/applications", applicationsRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});
