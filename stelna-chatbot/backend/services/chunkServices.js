const fs = require("fs");
const path = require("path");

function chunkText(text, chunkSize = 400) {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

function loadAndChunkKnowledge() {
  const folderPath = path.join(__dirname, "../knowledge");
  const files = fs.readdirSync(folderPath);

  let allChunks = [];

  files.forEach(file => {
    const content = fs.readFileSync(
      path.join(folderPath, file),
      "utf-8"
    );

    const chunks = chunkText(content);
    allChunks = allChunks.concat(chunks);
  });

  return allChunks;
}

module.exports = { loadAndChunkKnowledge };