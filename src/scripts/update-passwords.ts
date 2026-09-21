import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('password123', 10);
  console.log('Generated bcrypt hash for password123:', hash);

  const updatedCustomers = await prisma.customers.updateMany({
    data: { password: hash },
  });
  console.log(`Updated ${updatedCustomers.count} customers with password123.`);

  const updatedEmployees = await prisma.employees.updateMany({
    data: { password: hash },
  });
  console.log(`Updated ${updatedEmployees.count} employees with password123.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
