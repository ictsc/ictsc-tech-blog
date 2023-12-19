const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query) => new Promise(resolve => rl.question(query, resolve));

const main = async () => {
  const folderName = await askQuestion('Folder Name: ');
  const fileName = await askQuestion('File Name: ');
  const title = await askQuestion('Title: ');
  const description = await askQuestion('Description: ');
  const tagsInput = await askQuestion('Tags (comma-separated): ');
  const tags = tagsInput.split(',').map(tag => tag.trim());
  let pubDate = await askQuestion('Publish Date (YYYY-MM-DDTHH:MM:SS or leave empty for current time): ');
  if (!pubDate) {
    pubDate = new Date().toISOString();
  }
  const sticky = await askQuestion('Sticky? (yes/no): ') === 'yes';

  const folderPath = path.join('src', 'content', 'blog', folderName);
  const filePath = path.join(folderPath, `${fileName}.md`);

  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  const mdContent = `---
title: "${title}"
description: "${description}"
tags: [${tags.map(tag => `"${tag}"`).join(', ')}]
pubDate: ${pubDate}
slug: "${new Date(pubDate).toISOString().split('T')[0].replace(/-/g, '/')}/${title}"
draft: false
renderer: "md"
sticky: ${sticky}
---

## ${title}
`;

  fs.writeFileSync(filePath, mdContent);
  console.log(`File created at: ${filePath}`);

  rl.close();
};

main();
