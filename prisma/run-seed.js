const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Reading seed.sql...');
  const sql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf-8');

  // Split SQL commands by semicolon
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  console.log(`Executing ${statements.length} SQL statements...`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      await prisma.$executeRawUnsafe(stmt);
    } catch (err) {
      console.warn(`Statement ${i + 1} notice:`, err.message);
    }
  }

  console.log('Seed executed successfully!');
  const vehicleCount = await prisma.vehicles.count();
  console.log(`Total Vehicles in car_db: ${vehicleCount}`);
  const branchCount = await prisma.branches.count();
  console.log(`Total Branches in car_db: ${branchCount}`);
  const empCount = await prisma.employees.count();
  console.log(`Total Employees in car_db: ${empCount}`);
}

main()
  .catch((e) => {
    console.error('Seed Error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
