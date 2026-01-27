const { execSync } = require("child_process");
require("dotenv").config();
const id = process.env.WEBAPP_DEPLOYMENT_ID;

if (!id) throw new Error("WEBAPP_DEPLOYMENT_ID not set");

execSync(`cd gas && clasp redeploy ${id}`, { stdio: "inherit" });
