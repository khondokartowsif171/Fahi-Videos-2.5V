const fs = require('fs');
let content = fs.readFileSync('components/ThumbnailEditor.tsx', 'utf8');
content = content.replace(/\/\/ import \* as htmlToImage from "html-to-image";/g, 'import * as htmlToImage from "html-to-image";');
content = content.replace(/const dataUrl = ""; \/\/ htmlToImage\.toJpeg\(/g, 'const dataUrl = await htmlToImage.toJpeg(');
fs.writeFileSync('components/ThumbnailEditor.tsx', content);
