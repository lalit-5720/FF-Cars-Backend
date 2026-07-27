const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixSequences() {
  console.log('Fixing PostgreSQL auto-increment sequences for all tables...');
  
  const tables = [
    { name: 'test_drives', id: 'test_drive_id' },
    { name: 'sales', id: 'sale_id' },
    { name: 'vehicles', id: 'vehicle_id' },
    { name: 'customers', id: 'customer_id' },
    { name: 'employees', id: 'employee_id' },
    { name: 'leads', id: 'lead_id' },
    { name: 'deliveries', id: 'delivery_id' },
    { name: 'payments', id: 'payment_id' },
    { name: 'branches', id: 'branch_id' },
  ];

  for (const t of tables) {
    try {
      const sql = `SELECT setval(pg_get_serial_sequence('public.${t.name}', '${t.id}'), COALESCE((SELECT MAX(${t.id}) FROM public.${t.name}), 1));`;
      await prisma.$executeRawUnsafe(sql);
      console.log(`✓ Reset sequence for ${t.name}.${t.id}`);
    } catch (err) {
      console.warn(`Notice for ${t.name}:`, err.message);
    }
  }

  console.log('All PostgreSQL auto-increment sequences reset successfully!');
}

fixSequences()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
