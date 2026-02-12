import { Router } from "express";

// Import sub-routers
import authRouter from "./auth";
import blogRouter from "./blog";
import billingRouter from "./billing";
import journeyRouter from "./journey";

// Import Team MVP routers
import projectsRouter from "../api/projects";
import objectivesRouter from "../api/objectives";
import tasksRouter from "../api/tasks";
import rrgtRouter from "../api/rrgt";
import touchbasesRouter from "../api/touchbases";
import teamMembersRouter from "../api/team-members";
import teamAuthRouter from "../api/auth";

const router = Router();

// Mount Team MVP routers (Postgres/Drizzle) - priority
router.use(teamAuthRouter); // Mounting at root /api is handled by app.ts
router.use(projectsRouter);
router.use(objectivesRouter);
router.use(tasksRouter);
router.use(rrgtRouter);
router.use(touchbasesRouter);
router.use(teamMembersRouter);

// Mount Legacy/Feature routers
router.use("/auth", authRouter);
router.use("/blog", blogRouter);
router.use("/billing", billingRouter);
router.use("/journey", journeyRouter); // Sessions, Export, Legacy Tasks

export default router;
