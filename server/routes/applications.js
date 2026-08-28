import { promises as fs } from "fs";
import path from "path";
import { Router } from "express";
import {
  createMockApplication,
  listMockApplications,
  searchMockCampaignCatalog,
} from "../mockData.js";

const router = Router();
const DATA_PATH = path.resolve(process.cwd(), "server/data/applications.json");

async function readApplications() {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") {
      const fallback = listMockApplications();
      await writeApplications(fallback);
      return fallback;
    }
    throw error;
  }
}

async function writeApplications(applications) {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, `${JSON.stringify(applications, null, 2)}\n`, "utf8");
}

router.get("/search", (req, res) => {
  const owner = String(req.query.owner || "");
  const campaignName = String(req.query.campaignName || "");
  res.json(searchMockCampaignCatalog({ owner, campaignName }));
});

router.get("/", async (_req, res, next) => {
  try {
    res.json(await readApplications());
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const requiredFields = ["cmpgnId", "cmpgnNm", "owner", "channel", "startDate", "endDate"];
    const missing = requiredFields.find((field) => !req.body?.[field]);
    if (missing) {
      return res.status(400).json({ error: `${missing} is required` });
    }

    const applications = await readApplications();
    const application = createMockApplication(req.body);
    const persisted = [application, ...applications];
    await writeApplications(persisted);
    return res.status(201).json(application);
  } catch (error) {
    next(error);
  }
});

export default router;
