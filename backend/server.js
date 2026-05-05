const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const deptRoutes = require("./routes/dept");
const dashboardRoutes = require("./routes/dashboard");

const app = express();

app.use(cors());
app.use(express.json());

// ✅ ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/dept", deptRoutes);
app.use("/api/dashboard", dashboardRoutes);

// HEALTH
app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

app.listen(3001, () => {
  console.log("Server running on port 3001 🚀");
});