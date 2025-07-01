import express, { NextFunction, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import identifyRoutes from "./routes/identify.js";
dotenv.config();

export const prisma = new PrismaClient();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const PORT = process.env.PORT || 3000;
app.get("/", (req:Request, res:Response) => {
    res.status(404).json("Welcome to the API");
});

app.use("/identify", identifyRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});