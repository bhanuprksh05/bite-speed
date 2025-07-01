import express from "express";
import { updateIdentity } from "../controllers/identify.js";

const router = express.Router();

router.post("/",updateIdentity);

export default router;