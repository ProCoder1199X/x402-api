import express from "express";
import alphaRoute from "../services/alpharoute/src/app";
import sentinelFeed from "../services/sentinelfeed/src/app";
import complyRail from "../services/complyrail/src/app";
import distillForge from "../services/distillforge/src/app";
import proofMesh from "../services/proofmesh/src/app";

const app = express();

app.use("/alpharoute", alphaRoute);
app.use("/sentinelfeed", sentinelFeed);
app.use("/complyrail", complyRail);
app.use("/distillforge", distillForge);
app.use("/proofmesh", proofMesh);

export default app;