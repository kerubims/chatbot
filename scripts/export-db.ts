import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

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

async function main() {
  console.log('Fetching characters from local database...');
  
  const characters = await prisma.character.findMany({
    select: {
      name: true,
      avatar_url: true,
      gender: true,
      persona: true,
      backstory: true,
      key_memories: true,
      scenario: true,
      response_directives: true,
      example_dialogue: true,
      greeting: true,
    }
  });

  if (characters.length === 0) {
    console.log('No characters found in database to export.');
    return;
  }

  const exportDir = path.join(__dirname, '../prisma/data');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const filePath = path.join(exportDir, 'characters.json');
  fs.writeFileSync(filePath, JSON.stringify(characters, null, 2), 'utf-8');
  
  console.log(`Successfully exported ${characters.length} characters to ${filePath}`);
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
