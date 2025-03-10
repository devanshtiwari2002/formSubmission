const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");

const app = express();
const PORT = 5000;
const SECRET_KEY = "secret123"; // Change this for production

app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/roleBasedDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("Connected to MongoDB"))
.catch(err => console.error("MongoDB connection error:", err));

// User Schema
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  role: String // "user" or "manager"
});
const User = mongoose.model("User", userSchema);

// Project Schema
const projectSchema = new mongoose.Schema({
  title: String,
  description: String,
  assignedTo: String, // Manager Name
  submittedBy: String, // User Name
  status: { type: String, default: "Pending" } // "Pending", "Accepted", "Declined"
});
const Project = mongoose.model("Project", projectSchema);

// Register User/Manager
app.post("/register", async (req, res) => {
  const { username, password, role } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new User({ username, password: hashedPassword, role });

  try {
    await newUser.save();
    res.status(201).json({ message: "User registered successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Error registering user", error });
  }
});

// Login User
app.post("/login", async (req, res) => {
  const { username, password, role } = req.body;
  const user = await User.findOne({ username, role });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign({ username, role }, SECRET_KEY, { expiresIn: "1h" });
  res.json({ message: "Login successful", token, role });
});

// Submit Project (User)
app.post("/submit-project", async (req, res) => {
  const { title, description, assignedTo, submittedBy } = req.body;

  try {
    const newProject = new Project({ title, description, assignedTo, submittedBy });
    await newProject.save();
    res.status(201).json({ message: "Project submitted successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Error submitting project", error });
  }
});

// Get User Projects
app.get("/user-projects/:username", async (req, res) => {
  const { username } = req.params;
  const projects = await Project.find({ submittedBy: username });
  res.json(projects);
});

// Get Manager Projects
app.get("/manager-projects/:manager", async (req, res) => {
  const { manager } = req.params;
  const projects = await Project.find({ assignedTo: manager });
  res.json(projects);
});

// fethc all managers
app.get("/managers", async (req, res) => {
    const managers = await User.find({ role: "manager" }, { username: 1, _id: 0 });
    res.json(managers);
  });
  

// Update Project Status (Manager)
app.post("/update-project", async (req, res) => {
  const { projectId, status } = req.body;

  try {
    await Project.findByIdAndUpdate(projectId, { status });
    res.json({ message: "Project status updated!" });
  } catch (error) {
    res.status(500).json({ message: "Error updating project", error });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
