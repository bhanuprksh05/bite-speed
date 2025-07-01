import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import identityRoutes from "./routes/identity.js";
dotenv.config();
export const prisma = new PrismaClient();
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
const PORT = process.env.PORT || 3000;
app.use("/", identityRoutes);
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
