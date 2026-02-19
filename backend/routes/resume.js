import express from "express";
import multer from "multer";
import fs from "fs";
import pdf from "../utils/pdfParser.js";
import mammoth from "mammoth";
const router = express.Router();
const upload = multer({ dest: "uploads/" });
router.post("/upload", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const filePath = req.file.path;
    const ext = req.file.originalname.split(".").pop().toLowerCase();
    let text = "";
    if (ext === "pdf") {
      const buffer = fs.readFileSync(filePath);
      const data = await pdf(buffer);
      text = data.text;
    }
    else if (ext === "docx") {
      const result = await mammoth.extractRawText({ path: filePath });
      text = result.value;
    }
    else {
      return res.status(400).json({ error: "Unsupported file type" });
    }
    console.log("Resume parsed successfully ");

    res.json({ text });
  } catch (err) {
    console.error("Parsing Error:", err);
    res.status(500).send("Parsing Failed");
  }
});
export default router;
