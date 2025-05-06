// index.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const archiver = require("archiver");
const axios = require("axios");
const { execFile } = require("child_process");

const app = express();
app.use(express.json());
const upload = multer({ dest: "uploads/" });

app.post("/convert", upload.single("pdf"), async (req, res) => {
  const filePath = req.file.path;
  const outputPath = path.join(__dirname, "output");
  const outputName = `${Date.now()}`;

  try {
    await new Promise((resolve, reject) => {
      execFile("pdftocairo", [
        "-jpeg",
        "-scale-to", "1024",
        filePath,
        path.join(outputPath, outputName)
      ], (error, stdout, stderr) => {
        if (error) {
          console.error("❌ pdftocairo failed:", error);
          reject(error);
        } else {
          resolve();
        }
      });
    });

    const files = fs.readdirSync(outputPath).filter(file => file.startsWith(outputName) && file.endsWith(".jpg"));
    if (files.length === 1) {
      const imagePath = path.join(outputPath, files[0]);
      const imageBuffer = fs.readFileSync(imagePath);
      res.set("Content-Type", "image/jpeg");
      res.send(imageBuffer);

      setTimeout(() => {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          const outputFiles = fs.readdirSync(outputPath)
            .filter(file => file.startsWith(outputName) && file.endsWith(".jpg"));
          outputFiles.forEach(file => fs.unlinkSync(path.join(outputPath, file)));
          console.log("🧹 Cleanup complete for:", outputName);
        } catch (err) {
          console.error("❌ Cleanup failed:", err);
        }
      }, 10 * 60 * 1000); // 10 minutes

      return;
    }

    const boundary = 'BOUNDARY-' + Date.now();
    res.set("Content-Type", `multipart/mixed; boundary=${boundary}`);

    const multipartChunks = [];

    for (const file of files) {
      const imagePath = path.join(outputPath, file);
      const imageBuffer = fs.readFileSync(imagePath);

      multipartChunks.push(Buffer.from(`--${boundary}\r\n`));
      multipartChunks.push(Buffer.from(`Content-Type: image/jpeg\r\n`));
      multipartChunks.push(Buffer.from(`Content-Disposition: attachment; filename="${file}"\r\n\r\n`));
      multipartChunks.push(imageBuffer);
      multipartChunks.push(Buffer.from(`\r\n`));
    }

    multipartChunks.push(Buffer.from(`--${boundary}--\r\n`));
    res.send(Buffer.concat(multipartChunks));

    setTimeout(() => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        const outputFiles = fs.readdirSync(outputPath)
          .filter(file => file.startsWith(outputName) && file.endsWith(".jpg"));
        outputFiles.forEach(file => fs.unlinkSync(path.join(outputPath, file)));
        console.log("🧹 Cleanup complete for:", outputName);
      } catch (err) {
        console.error("❌ Cleanup failed:", err);
      }
    }, 10 * 60 * 1000); // 10 minutes

  } catch (error) {
    console.error("Conversion failed:", error);
    res.status(500).json({ error: "Failed to convert PDF." });
  }
});

app.post("/convert-url", async (req, res) => {
  const outputPath = path.join(__dirname, "output");
  const outputName = `${Date.now()}`;
  const url = req.query.url || req.body?.url;

  if (!url) {
    return res.status(400).json({ error: "Missing 'url' query parameter." });
  }

  try {
    const response = await axios.get(url, { responseType: "arraybuffer" });
    const tempPdfPath = path.join(__dirname, "uploads", `${outputName}.pdf`);
    fs.writeFileSync(tempPdfPath, response.data);

    console.log("✅ PDF downloaded to:", tempPdfPath);
    console.log("📄 File exists:", fs.existsSync(tempPdfPath));

    try {
      await new Promise((resolve, reject) => {
        execFile("pdftocairo", [
          "-jpeg",
          "-scale-to", "1024",
          tempPdfPath,
          path.join(outputPath, outputName)
        ], (error, stdout, stderr) => {
          if (error) {
            console.error("❌ pdftocairo failed:", error);
            reject(error);
          } else {
            resolve();
          }
        });
      });
    } catch (convertErr) {
      console.error("❌ pdftocairo failed to convert PDF:", convertErr);
      return res.status(500).json({ error: "pdftocairo failed to convert PDF." });
    }

    const files = fs.readdirSync(outputPath).filter(file => file.startsWith(outputName) && file.endsWith(".jpg"));
    if (files.length === 1) {
      const imagePath = path.join(outputPath, files[0]);
      const imageBuffer = fs.readFileSync(imagePath);
      res.set("Content-Type", "image/jpeg");
      res.send(imageBuffer);

      setTimeout(() => {
        try {
          if (fs.existsSync(tempPdfPath)) {
            fs.unlinkSync(tempPdfPath);
          }
          const outputFiles = fs.readdirSync(outputPath)
            .filter(file => file.startsWith(outputName) && file.endsWith(".jpg"));
          outputFiles.forEach(file => fs.unlinkSync(path.join(outputPath, file)));
          console.log("🧹 Cleanup complete for:", outputName);
        } catch (err) {
          console.error("❌ Cleanup failed:", err);
        }
      }, 10 * 60 * 1000); // 10 minutes

      return;
    }

    const boundary = 'BOUNDARY-' + Date.now();
    res.set("Content-Type", `multipart/mixed; boundary=${boundary}`);

    const multipartChunks = [];

    for (const file of files) {
      const imagePath = path.join(outputPath, file);
      const imageBuffer = fs.readFileSync(imagePath);

      multipartChunks.push(Buffer.from(`--${boundary}\r\n`));
      multipartChunks.push(Buffer.from(`Content-Type: image/jpeg\r\n`));
      multipartChunks.push(Buffer.from(`Content-Disposition: attachment; filename="${file}"\r\n\r\n`));
      multipartChunks.push(imageBuffer);
      multipartChunks.push(Buffer.from(`\r\n`));
    }

    multipartChunks.push(Buffer.from(`--${boundary}--\r\n`));
    res.send(Buffer.concat(multipartChunks));

    setTimeout(() => {
      try {
        if (fs.existsSync(tempPdfPath)) {
          fs.unlinkSync(tempPdfPath);
        }
        const outputFiles = fs.readdirSync(outputPath)
          .filter(file => file.startsWith(outputName) && file.endsWith(".jpg"));
        outputFiles.forEach(file => fs.unlinkSync(path.join(outputPath, file)));
        console.log("🧹 Cleanup complete for:", outputName);
      } catch (err) {
        console.error("❌ Cleanup failed:", err);
      }
    }, 10 * 60 * 1000); // 10 minutes

  } catch (error) {
    console.error("URL conversion failed:", error);
    res.status(500).json({ error: "Failed to convert PDF from URL." });

  }
});

// File upload route
app.post("/upload", upload.single("file"), (req, res) => {
  const uploadedFile = req.file;

  if (!uploadedFile) {
    return res.status(400).json({ error: "No file received" });
  }

  console.log("✅ File uploaded:", uploadedFile.originalname);
  res.status(200).json({ message: "File received", filename: uploadedFile.filename });
});

app.listen(3000, () => {
  console.log("PDF to Image API listening on port 3000");
});