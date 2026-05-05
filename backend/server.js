const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// ✅ ROUTES
app.use("/api/auth", require("./routes/auth"));
app.use("/api/dept", require("./routes/dept"));
app.use("/api/dashboard", require("./routes/dashboard"));

// ✅ HEALTH
app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

// ✅ START
app.listen(3001, () => {
  console.log("Server running on port 3001 🚀");
});