import express from "express";
const router = express.Router();

// Temporary memory store (later MongoDB laga dena)
const conversation = [];

router.post("/save", (req, res) => {
  const { role, text, timestamp } = req.body;

  conversation.push({ role, text, timestamp });

  console.log("Saved:", role, text);

  res.sendStatus(200);
});
router.get("/all", (req, res) => {
  res.json(conversation);
});

export default router;