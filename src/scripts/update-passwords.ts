import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('password123', 10);
  console.log('Generated bcrypt hash for password123:', hash);

  const updatedCustomers = await prisma.customers.updateMany({
    where: { password: null },
    data: { password: hash },
  });
  console.log(`Updated ${updatedCustomers.count} customers with encrypted default password.`);

  const updatedEmployees = await prisma.employees.updateMany({
    where: { password: null },
    data: { password: hash },
  });
  console.log(`Updated ${updatedEmployees.count} employees with encrypted default password.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
