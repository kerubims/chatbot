import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

let adapter;
if (process.env.DATABASE_URL) {
  const url = new URL(process.env.DATABASE_URL);
  adapter = new PrismaMariaDb({
    host: url.hostname,
    port: parseInt(url.port || '3306'),
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
  });
}

const prisma = new PrismaClient({ adapter });

import fs from 'fs';
import path from 'path';

let characters: any[] = [];
try {
  const dataPath = path.join(__dirname, 'data', 'characters.json');
  if (fs.existsSync(dataPath)) {
    const fileContent = fs.readFileSync(dataPath, 'utf-8');
    characters = JSON.parse(fileContent);
    console.log(`Loaded ${characters.length} characters from characters.json`);
  } else {
    console.warn('No characters.json found in prisma/data. Seeding will run with empty character list.');
  }
} catch (error) {
  console.error('Error reading characters.json:', error);
}

async function main() {
  console.log('Start seeding...');
  
  // Hapus data lama agar tidak duplikat jika dijalankan berkali-kali
  await prisma.message.deleteMany();
  await prisma.chatSession.deleteMany();
  await prisma.character.deleteMany();
  
  for (const char of characters) {
    const character = await prisma.character.create({
      data: char,
    });
    console.log(`Created character: ${character.name}`);
  }
  console.log('Seeding finished.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
