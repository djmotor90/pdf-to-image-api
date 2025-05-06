// test-convert-url.js
const fs = require("fs");
const path = require("path");
const axios = require("axios");

(async () => {
  const apiUrl = "http://localhost:3000/convert-url";
  const pdfUrl = "https://t9017049670.p.clickup-attachments.com/t9017049670/a34b6f84-1fe1-4b5f-9522-3636700c5671/NACO.pdf?view=open";

  try {
    const response = await axios.post(`${apiUrl}?url=${encodeURIComponent(pdfUrl)}`, null, {
      responseType: "stream",
    });

    const outputPath = path.join(__dirname, "test-output.zip");
    const writer = fs.createWriteStream(outputPath);

    response.data.pipe(writer);

    writer.on("finish", () => {
      console.log(`✅ ZIP file saved to ${outputPath}`);
    });

    writer.on("error", (err) => {
      console.error("❌ Write error:", err);
    });
  } catch (err) {
    console.error("❌ Test failed:", err.message);
  }
})();