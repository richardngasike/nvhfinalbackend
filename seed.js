require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const NAIROBI_LOCATIONS = [
  'Westlands', 'Kilimani', 'Kileleshwa', 'Lavington', 'Karen',
  'Langata', 'South B', 'South C', 'Parklands', 'Eastleigh',
  'Buruburu', 'Embakasi', 'Donholm', 'Kasarani', 'Roysambu',
  'Ruaraka', 'Zimmerman', 'Ngong', 'Rongai', 'Kitengela',
];

const HOUSE_TYPES = [
  'SINGLE_ROOM', 'BEDSITTER', 'ONE_BEDROOM',
  'TWO_BEDROOM', 'THREE_BEDROOM', 'FOUR_BEDROOM_PLUS',
];

const AMENITY_OPTIONS = ['Water', 'Electricity', 'Parking', 'WiFi', 'Security'];

const sampleListings = [
  {
    title: 'Modern One Bedroom in Westlands',
    price: 35000,
    location: 'Westlands',
    houseType: 'ONE_BEDROOM',
    description: 'A beautiful and spacious one bedroom apartment located in the heart of Westlands. The unit features high-quality finishes, ample natural light, and a stunning city view. Ideal for young professionals seeking comfort and convenience.',
    amenities: ['Water', 'Electricity', 'WiFi', 'Security'],
    landlordName: 'James Kamau',
    landlordPhone: '+254712345678',
  },
  {
    title: 'Cozy Bedsitter in Kileleshwa',
    price: 18000,
    location: 'Kileleshwa',
    houseType: 'BEDSITTER',
    description: 'A neat and well-maintained bedsitter in a quiet compound in Kileleshwa. Perfect for a single person. The unit has a private bathroom and small kitchen area. Close to public transport.',
    amenities: ['Water', 'Electricity', 'Security'],
    landlordName: 'Grace Wanjiku',
    landlordPhone: '+254723456789',
  },
  {
    title: 'Spacious Two Bedroom in Kilimani',
    price: 55000,
    location: 'Kilimani',
    houseType: 'TWO_BEDROOM',
    description: 'This stunning two-bedroom apartment in Kilimani is perfect for a small family or roommates. It features an open-plan kitchen and living area, a private balcony, and ample storage space.',
    amenities: ['Water', 'Electricity', 'Parking', 'Security'],
    landlordName: 'Peter Omondi',
    landlordPhone: '+254734567890',
  },
  {
    title: 'Affordable Single Room in Kasarani',
    price: 8000,
    location: 'Kasarani',
    houseType: 'SINGLE_ROOM',
    description: 'A clean and affordable single room in Kasarani. Great for students and low-income earners. Shared bathroom and kitchen facilities. Close to shopping centers and public transport hubs.',
    amenities: ['Water', 'Electricity'],
    landlordName: 'Mary Akinyi',
    landlordPhone: '+254745678901',
  },
  {
    title: 'Executive Three Bedroom in Karen',
    price: 95000,
    location: 'Karen',
    houseType: 'THREE_BEDROOM',
    description: 'Live in luxury in this stunning three-bedroom home in Karen. Features include a fully fitted kitchen, master en-suite, private garden, and two parking spaces. Located in a secure, gated community.',
    amenities: ['Water', 'Electricity', 'Parking', 'WiFi', 'Security'],
    landlordName: 'David Mwangi',
    landlordPhone: '+254756789012',
  },
  {
    title: 'Modern Bedsitter in Roysambu',
    price: 14000,
    location: 'Roysambu',
    houseType: 'BEDSITTER',
    description: 'A newly constructed bedsitter in Roysambu. Modern fixtures and fittings. The unit comes with built-in wardrobes and a dedicated cooking area. Easy access to TRM Mall and major routes.',
    amenities: ['Water', 'Electricity', 'Security'],
    landlordName: 'Lucy Chebet',
    landlordPhone: '+254767890123',
  },
  {
    title: 'Four Bedroom Maisonette in Langata',
    price: 120000,
    location: 'Langata',
    houseType: 'FOUR_BEDROOM_PLUS',
    description: 'A magnificent four-bedroom maisonette in Langata. Features a spacious living room, dining area, fully-fitted kitchen, DSQ, and a beautifully landscaped garden. Perfect for families who value space and privacy.',
    amenities: ['Water', 'Electricity', 'Parking', 'WiFi', 'Security'],
    landlordName: 'Robert Njoroge',
    landlordPhone: '+254778901234',
  },
  {
    title: 'One Bedroom Flat in South B',
    price: 22000,
    location: 'South B',
    houseType: 'ONE_BEDROOM',
    description: 'A comfortable one-bedroom flat in South B. The apartment is on the 3rd floor with good ventilation and natural light. Located near Wilson Airport and major shopping areas.',
    amenities: ['Water', 'Electricity', 'Parking'],
    landlordName: 'Ann Mutua',
    landlordPhone: '+254789012345',
  },
  {
    title: 'Luxury Two Bedroom in Lavington',
    price: 75000,
    location: 'Lavington',
    houseType: 'TWO_BEDROOM',
    description: 'An exquisite two-bedroom apartment in the upmarket Lavington area. Featuring imported tiles, fitted kitchen, heated showers, and a magnificent pool. Perfect for executives and diplomats.',
    amenities: ['Water', 'Electricity', 'Parking', 'WiFi', 'Security'],
    landlordName: 'Charles Ouma',
    landlordPhone: '+254790123456',
  },
  {
    title: 'Budget Single Room in Zimmerman',
    price: 6500,
    location: 'Zimmerman',
    houseType: 'SINGLE_ROOM',
    description: 'A clean and budget-friendly single room in Zimmerman estate. Ideal for students attending nearby universities. Shared ablutions and common kitchen. Close to matatu stages.',
    amenities: ['Water', 'Electricity'],
    landlordName: 'Susan Wairimu',
    landlordPhone: '+254701234567',
  },
  {
    title: 'Modern One Bedroom in Rongai',
    price: 16000,
    location: 'Rongai',
    houseType: 'ONE_BEDROOM',
    description: 'A well-maintained one-bedroom apartment in Rongai. Newly painted and fitted with modern lighting. The compound has 24-hour security and a reliable borehole water supply.',
    amenities: ['Water', 'Electricity', 'Security'],
    landlordName: 'Joseph Kariuki',
    landlordPhone: '+254712111222',
  },
  {
    title: 'Stylish Bedsitter in Embakasi',
    price: 12000,
    location: 'Embakasi',
    houseType: 'BEDSITTER',
    description: 'A stylish and modern bedsitter in Embakasi, near the SGR terminus. The unit is self-contained with all basic amenities. Easy access to Nairobi CBD and JKIA.',
    amenities: ['Water', 'Electricity', 'Security'],
    landlordName: 'Esther Atieno',
    landlordPhone: '+254723333444',
  },
];

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data (optional - comment out in production)
  console.log('   Clearing existing data...');
  await prisma.favorite.deleteMany();
  await prisma.image.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.user.deleteMany();

  // Create premium landlord (admin upgrader)
  console.log('   Creating premium landlord...');
  const premiumPassword = await bcrypt.hash('premium123', 12);
  const premiumLandlord = await prisma.user.create({
    data: {
      email: 'premium@nairobivacanthouses.com',
      password: premiumPassword,
      name: 'Premium Landlord',
      phone: '+254718959781',
      role: 'LANDLORD',
      isPremium: true,
    },
  });

  // Create free landlord
  console.log('   Creating free landlord...');
  const freeLandlordPassword = await bcrypt.hash('landlord123', 12);
  const freeLandlord = await prisma.user.create({
    data: {
      email: 'landlord@test.com',
      password: freeLandlordPassword,
      name: 'Test Landlord',
      phone: '+254700000001',
      role: 'LANDLORD',
      isPremium: false,
    },
  });

  // Create a tenant
  console.log('   Creating tenant user...');
  const tenantPassword = await bcrypt.hash('tenant123', 12);
  const tenant = await prisma.user.create({
    data: {
      email: 'tenant@test.com',
      password: tenantPassword,
      name: 'Test Tenant',
      phone: '+254700000002',
      role: 'TENANT',
    },
  });

  // Create admin
  console.log('   Creating admin user...');
  const adminPassword = await bcrypt.hash('admin123', 12);
  await prisma.user.create({
    data: {
      email: 'admin@nairobivacanthouses.com',
      password: adminPassword,
      name: 'Admin User',
      role: 'ADMIN',
      isPremium: true,
    },
  });

  // Create listings (assigned to premium landlord)
  console.log('   Creating sample listings...');
  const createdListings = [];

  for (const listingData of sampleListings) {
    const userId = createdListings.length < 4 ? freeLandlord.id : premiumLandlord.id;

    const listing = await prisma.listing.create({
      data: {
        ...listingData,
        userId,
        images: {
          create: [
            { path: '/uploads/placeholder-house-1.jpg', filename: 'placeholder-house-1.jpg' },
            { path: '/uploads/placeholder-house-2.jpg', filename: 'placeholder-house-2.jpg' },
          ],
        },
      },
    });
    createdListings.push(listing);
  }

  // Create some favorites for tenant
  console.log('   Creating sample favorites...');
  await prisma.favorite.createMany({
    data: [
      { userId: tenant.id, listingId: createdListings[0].id },
      { userId: tenant.id, listingId: createdListings[2].id },
      { userId: tenant.id, listingId: createdListings[4].id },
    ],
  });

  console.log('\n✅ Database seeded successfully!\n');
  console.log('📋 Test Accounts:');
  console.log('   Admin:            admin@nairobivacanthouses.com    / admin123');
  console.log('   Premium Landlord: premium@nairobivacanthouses.com  / premium123');
  console.log('   Free Landlord:    landlord@test.com                / landlord123');
  console.log('   Tenant:           tenant@test.com                  / tenant123');
  console.log(`\n📦 Created ${createdListings.length} listings`);
  console.log('\n💎 To upgrade a landlord to premium, run:');
  console.log('   UPDATE "User" SET "isPremium" = true WHERE email = \'user@email.com\';');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
