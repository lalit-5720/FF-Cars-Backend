import { PrismaClient, Role, CarStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding started...');

  // 1. Clean existing data
  await prisma.notification.deleteMany({});
  await prisma.wishlist.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.car.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Cleared existing data.');

  // 2. Hash passwords
  const salt = await bcrypt.genSalt(10);
  const adminPassword = await bcrypt.hash('adminpassword', salt);
  const customerPassword = await bcrypt.hash('customerpassword', salt);

  // 3. Create Users
  const admin = await prisma.user.create({
    data: {
      email: 'admin@ffcars.com',
      name: 'Lalit Admin',
      password: adminPassword,
      role: Role.ADMIN,
    },
  });

  const customer = await prisma.user.create({
    data: {
      email: 'customer@ffcars.com',
      name: 'John Customer',
      password: customerPassword,
      role: Role.CUSTOMER,
    },
  });

  console.log(`Created users: Admin (${admin.email}), Customer (${customer.email})`);

  // 4. Create Cars
  const carsData = [
    {
      brand: 'BMW',
      model: '3 Series',
      variant: '330i M Sport',
      year: 2021,
      fuelType: 'Petrol',
      transmission: 'Automatic',
      kmDriven: 14500,
      ownership: '1st Owner',
      price: 4250000,
      description: 'Excellent condition BMW 3 Series 330i M Sport. Fully loaded with sunroof, ambient lighting, digital cluster, and service history package.',
      status: CarStatus.AVAILABLE,
      thumbnail: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&q=80&w=800',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1525609004556-c46c7d6cf0a3?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=800'
      ]),
    },
    {
      brand: 'Audi',
      model: 'A4',
      variant: '40 TFSI Technology',
      year: 2020,
      fuelType: 'Petrol',
      transmission: 'Automatic',
      kmDriven: 28000,
      ownership: '1st Owner',
      price: 3600000,
      description: 'Audi A4 Tech edition in metallic white. Features Audi virtual cockpit, B&O premium sound system, matrix LED headlights, and pristine leather interiors.',
      status: CarStatus.AVAILABLE,
      thumbnail: 'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?auto=format&fit=crop&q=80&w=800',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&q=80&w=800'
      ]),
    },
    {
      brand: 'Mercedes-Benz',
      model: 'C-Class',
      variant: 'C200 Progressive',
      year: 2019,
      fuelType: 'Petrol',
      transmission: 'Automatic',
      kmDriven: 32000,
      ownership: '2nd Owner',
      price: 3850000,
      description: 'Sleek Obsidian Black C200 with dual screen setup, memory seats, dynamic drive select, active brake assist, and panoramic glass roof.',
      status: CarStatus.AVAILABLE,
      thumbnail: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&q=80&w=800',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800'
      ]),
    },
    {
      brand: 'Honda',
      model: 'City',
      variant: 'ZX i-VTEC',
      year: 2022,
      fuelType: 'Petrol',
      transmission: 'Manual',
      kmDriven: 8500,
      ownership: '1st Owner',
      price: 1250000,
      description: 'Top end Honda City Manual with lane-watch camera, Alexa connect, electric sunroof, diamond cut alloy wheels, and pristine beige interiors.',
      status: CarStatus.AVAILABLE,
      thumbnail: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800'
      ]),
    },
    {
      brand: 'Hyundai',
      model: 'Creta',
      variant: '1.5 CRDi SX Opt',
      year: 2021,
      fuelType: 'Diesel',
      transmission: 'Automatic',
      kmDriven: 21000,
      ownership: '1st Owner',
      price: 1680000,
      description: 'Hyundai Creta Diesel SX Automatic. Panoramic sunroof, ventilated seats, air purifier, Bose speakers, and drive modes selector included.',
      status: CarStatus.AVAILABLE,
      thumbnail: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800'
      ]),
    },
    {
      brand: 'Tata',
      model: 'Nexon EV',
      variant: 'Max XZ Plus Lux',
      year: 2022,
      fuelType: 'Electric',
      transmission: 'Automatic',
      kmDriven: 11000,
      ownership: '1st Owner',
      price: 1550000,
      description: 'Tata Nexon EV Max with extended 437km range. Fast charging enabled, jewelled control dial, smart regenerative braking, and 5-star safety rating.',
      status: CarStatus.AVAILABLE,
      thumbnail: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&q=80&w=800',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&q=80&w=800'
      ]),
    },
    {
      brand: 'Tesla',
      model: 'Model 3',
      variant: 'Standard Range Plus',
      year: 2022,
      fuelType: 'Electric',
      transmission: 'Automatic',
      kmDriven: 9200,
      ownership: '1st Owner',
      price: 5800000,
      description: 'Imported Tesla Model 3 in pearl white. Autopilot active, full glass roof, 15-inch center display, premium white interiors, and OTA updates active.',
      status: CarStatus.AVAILABLE,
      thumbnail: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&q=80&w=800',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&q=80&w=800'
      ]),
    },
    {
      brand: 'Toyota',
      model: 'Fortuner',
      variant: '2.8 4x4 AT',
      year: 2021,
      fuelType: 'Diesel',
      transmission: 'Automatic',
      kmDriven: 36000,
      ownership: '1st Owner',
      price: 3950000,
      description: 'Heavy duty Toyota Fortuner 4x4 automatic. Tough off-road credentials, spacious 7-seater, ventilated seats, dual-zone climate control, and rugged steel bumpers.',
      status: CarStatus.AVAILABLE,
      thumbnail: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800'
      ]),
    },
    {
      brand: 'Mahindra',
      model: 'XUV700',
      variant: 'AX7 Luxury Pack',
      year: 2022,
      fuelType: 'Petrol',
      transmission: 'Automatic',
      kmDriven: 17500,
      ownership: '1st Owner',
      price: 2150000,
      description: 'Top end AX7 Luxury pack. Advanced ADAS driver assistance features, massive dual-screen cockpit, Sony 3D surround sound system, and smart pop-out door handles.',
      status: CarStatus.AVAILABLE,
      thumbnail: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800'
      ]),
    },
    {
      brand: 'Maruti Suzuki',
      model: 'Swift',
      variant: 'ZXI Plus',
      year: 2020,
      fuelType: 'Petrol',
      transmission: 'Manual',
      kmDriven: 44000,
      ownership: '2nd Owner',
      price: 640000,
      description: 'ZXI Plus top spec manual Swift. Outstanding fuel efficiency, push button start, auto climate control, Apple CarPlay support, and alloy wheels.',
      status: CarStatus.AVAILABLE,
      thumbnail: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800'
      ]),
    }
  ];

  for (const car of carsData) {
    const createdCar = await prisma.car.create({
      data: {
        brand: car.brand,
        model: car.model,
        variant: car.variant,
        year: car.year,
        fuelType: car.fuelType,
        transmission: car.transmission,
        kmDriven: car.kmDriven,
        ownership: car.ownership,
        price: car.price,
        description: car.description,
        status: car.status,
        thumbnail: car.thumbnail,
        images: car.images,
      },
    });
    console.log(`Seeded Car: ${createdCar.brand} ${createdCar.model} (${createdCar.id})`);
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
