import express from "express";
import { updateIdentity } from "../controllers/identity.js";
const router = express.Router();
router.post("/identify", updateIdentity);
export default router;
