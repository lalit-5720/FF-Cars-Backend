import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding CarRevive PostgreSQL Database...');

  // 1. Seed Branches
  const b1 = await prisma.branches.upsert({
    where: { branch_id: 1 },
    update: {},
    create: {
      branch_name: 'CarRevive - Anna Nagar',
      manager_name: 'Rajkumar Swaminathan',
      phone: '9840123456',
      email: 'annanagar@carrevive.in',
      address: '100 Feet Road, Anna Nagar',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600040',
      status: 'Active',
    },
  });

  const b2 = await prisma.branches.upsert({
    where: { branch_id: 2 },
    update: {},
    create: {
      branch_name: 'CarRevive - Velachery',
      manager_name: 'Dinesh Palanisamy',
      phone: '9840234567',
      email: 'velachery@carrevive.in',
      address: '100 Feet Bypass Road, Velachery',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600042',
      status: 'Active',
    },
  });

  // 2. Seed Employees
  await prisma.employees.upsert({
    where: { employee_id: 1 },
    update: {},
    create: {
      first_name: 'Rajkumar',
      last_name: 'Swaminathan',
      role: 'Branch Manager',
      email: 'rajkumar.swaminathan@carrevive.in',
      phone: '9840123456',
      branch_id: b1.branch_id,
      status: 'Active',
    },
  });

  await prisma.employees.upsert({
    where: { employee_id: 2 },
    update: {},
    create: {
      first_name: 'Ganesh',
      last_name: 'Chettiar',
      role: 'Sales Manager',
      email: 'ganesh.chettiar@carrevive.in',
      phone: '9840123457',
      branch_id: b1.branch_id,
      status: 'Active',
    },
  });

  // 3. Seed Customers
  const c1 = await prisma.customers.upsert({
    where: { customer_id: 1 },
    update: {},
    create: {
      first_name: 'Keerthana',
      last_name: 'Ramanathan',
      email: 'keerthana1@gmail.com',
      phone: '9876543210',
      city: 'Chennai',
      state: 'Tamil Nadu',
    },
  });

  const c2 = await prisma.customers.upsert({
    where: { customer_id: 2 },
    update: {},
    create: {
      first_name: 'Dinesh',
      last_name: 'Rajendran',
      email: 'dinesh2@gmail.com',
      phone: '9876543211',
      city: 'Chennai',
      state: 'Tamil Nadu',
    },
  });

  // 4. Seed Vehicles
  const vehiclesData = [
    {
      make: 'BMW',
      model: '3 Series 330i M Sport',
      registration_number: 'TN09CX3300',
      manufacture_year: 2022,
      color: 'Portimao Blue',
      kilometers_driven: 14500,
      fuel_type: 'Petrol',
      transmission: 'Automatic',
      owner_type: '1st Owner',
      price: 4250000,
      status: 'Available',
      branch_id: b1.branch_id,
      image_url: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&q=80&w=800',
      description: 'Pristine BMW 3 Series 330i M Sport with digital cockpit, ambient lighting, sunroof, and full BMW service records.',
    },
    {
      make: 'Audi',
      model: 'A4 40 TFSI Technology',
      registration_number: 'TN10AZ4400',
      manufacture_year: 2021,
      color: 'Ibis White',
      kilometers_driven: 22000,
      fuel_type: 'Petrol',
      transmission: 'Automatic',
      owner_type: '1st Owner',
      price: 3650000,
      status: 'Available',
      branch_id: b1.branch_id,
      image_url: 'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?auto=format&fit=crop&q=80&w=800',
      description: 'Audi A4 Tech edition featuring Virtual Cockpit, B&O 3D Sound, panoramic glass roof, and ambient lighting.',
    },
    {
      make: 'Mercedes-Benz',
      model: 'C-Class C200 Progressive',
      registration_number: 'TN07BU2000',
      manufacture_year: 2020,
      color: 'Obsidian Black',
      kilometers_driven: 28500,
      fuel_type: 'Petrol',
      transmission: 'Automatic',
      owner_type: '1st Owner',
      price: 3890000,
      status: 'Available',
      branch_id: b2.branch_id,
      image_url: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&q=80&w=800',
      description: 'Mercedes-Benz C200 with dual widescreen displays, ARTICO leather seats, active parking assist, and sunroof.',
    },
    {
      make: 'Porsche',
      model: '911 Carrera S',
      registration_number: 'TN01911911',
      manufacture_year: 2023,
      color: 'Guards Red',
      kilometers_driven: 5200,
      fuel_type: 'Petrol',
      transmission: 'PDK Automatic',
      owner_type: '1st Owner',
      price: 18500000,
      status: 'Available',
      branch_id: b1.branch_id,
      image_url: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&q=80&w=800',
      description: 'Unmatched 450 HP Porsche 911 Carrera S with Chrono Package, Sport Exhaust System, and carbon fiber trim.',
    },
    {
      make: 'Land Rover',
      model: 'Range Rover Velar R-Dynamic',
      registration_number: 'TN22RR7777',
      manufacture_year: 2022,
      color: 'Carpathian Grey',
      kilometers_driven: 18900,
      fuel_type: 'Diesel',
      transmission: 'Automatic',
      owner_type: '1st Owner',
      price: 7450000,
      status: 'Available',
      branch_id: b2.branch_id,
      image_url: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&q=80&w=800',
      description: 'Luxurious Land Rover Range Rover Velar R-Dynamic S with Meridian Surround System, air suspension, and Matrix LEDs.',
    },
    {
      make: 'Jaguar',
      model: 'F-Pace 2.0 R-Sport',
      registration_number: 'TN05JP8888',
      manufacture_year: 2021,
      color: 'Firenze Red',
      kilometers_driven: 24000,
      fuel_type: 'Diesel',
      transmission: 'Automatic',
      owner_type: '1st Owner',
      price: 5400000,
      status: 'Available',
      branch_id: b1.branch_id,
      image_url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800',
      description: 'Jaguar F-Pace R-Sport AWD with panoramic sunroof, 360-degree camera, Meridian Audio, and sport suspension.',
    },
  ];

  for (const v of vehiclesData) {
    const existing = await prisma.vehicles.findFirst({
      where: { registration_number: v.registration_number },
    });
    if (!existing) {
      await prisma.vehicles.create({ data: v });
    }
  }

  console.log('Database Seeding Completed Successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
