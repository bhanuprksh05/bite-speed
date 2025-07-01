import express from "express";
import { updateIdentity } from "../controllers/identity.js";
const router = express.Router();
router.post("/identity", updateIdentity);
export default router;
