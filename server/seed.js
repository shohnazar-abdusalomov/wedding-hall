require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db');

async function seed() {
  await db.init();

  // Clear existing data
  await db.users.remove({}, { multi: true });
  await db.owners.remove({}, { multi: true });
  await db.venues.remove({}, { multi: true });
  await db.bookings.remove({}, { multi: true });
  await db.otps.remove({}, { multi: true });

  console.log('Cleared old data...');

  // Create admin
  const adminHash = await bcrypt.hash('admin123', 10);
  await db.users.insert({
    firstName: 'Admin', lastName: 'Adminov', username: 'admin',
    password: adminHash, role: 'admin', createdAt: new Date().toISOString(),
  });
  console.log('Admin: admin / admin123');

  // Create owners
  const ownerPassword = await bcrypt.hash('owner123', 10);
  const owner1 = await db.owners.insert({
    firstName: 'Jamshid', lastName: 'Karimov', email: 'shohnazarabdusalomov3@gmail.com',
    username: 'jamshid', password: ownerPassword, otpVerified: true,
    createdAt: new Date().toISOString(),
  });
  const owner2 = await db.owners.insert({
    firstName: 'Nilufar', lastName: 'Raxmatova', email: 'shohnazarabdusalomov3@gmail.com',
    username: 'nilufar', password: ownerPassword, otpVerified: true,
    createdAt: new Date().toISOString(),
  });
  console.log('Owners: jamshid/owner123, nilufar/owner123 (OTP tasdiqlangan)');

  // Create test user
  const userPassword = await bcrypt.hash('user123', 10);
  const user1 = await db.users.insert({
    firstName: 'Sardor', lastName: 'Aliyev', phone: '+998901234567',
    email: 'shohnazarabdusalomov3@gmail.com', emailVerified: true,
    password: userPassword, role: 'user', createdAt: new Date().toISOString(),
  });
  console.log('User: +998901234567 / user123');

  // Create venues
  const venues = [
    {
      name: 'Navruz Saroyi', district: 'Yunusobod', address: 'Amir Temur ko\'chasi 45',
      lat: 41.3640, lng: 69.2890,
      capacity: 500, pricePerSeat: 120000, phone: '+998712345678',
      photos: ['/uploads/navruz-1.jpg', '/uploads/hall-5.jpg', '/uploads/hall-1.jpg', '/uploads/hall-4.jpg'],
      services: {
        singers: [
          { name: 'Ozoda Nursaidova', price: 15000000 },
          { name: 'Jasur Umirov', price: 8000000 },
        ],
        karnaySurnay: { available: true, price: 3000000 },
        menu: [{ name: 'Palov' }, { name: 'Sho\'rva' }, { name: 'Manti' }, { name: 'Kabob' }],
        cars: [
          { brand: 'Mercedes S-class', price: 2000000 },
          { brand: 'BMW 7-series', price: 1800000 },
        ],
      },
      status: 'tasdiqlangan', ownerId: owner1._id,
      createdAt: new Date().toISOString(),
    },
    {
      name: 'Milliy Uslub', district: 'Chilonzor', address: 'Bunyodkor shoh ko\'chasi 12',
      lat: 41.2750, lng: 69.2030,
      capacity: 350, pricePerSeat: 95000, phone: '+998712345679',
      photos: ['/uploads/milliy-1.jpg', '/uploads/milliy-4.jpg', '/uploads/hall-3.jpg', '/uploads/hall-7.jpg'],
      services: {
        singers: [
          { name: 'Yulduz Turdiyeva', price: 12000000 },
        ],
        karnaySurnay: { available: true, price: 2500000 },
        menu: [{ name: 'Palov' }, { name: 'Norin' }, { name: 'Somsa' }],
        cars: [
          { brand: 'Chevrolet Malibu', price: 800000 },
        ],
      },
      status: 'tasdiqlangan', ownerId: owner1._id,
      createdAt: new Date().toISOString(),
    },
    {
      name: 'Samarkand Palace', district: 'Mirobod', address: 'Mustaqillik maydoni 7',
      lat: 41.3110, lng: 69.2800,
      capacity: 800, pricePerSeat: 150000, phone: '+998712345680',
      photos: ['/uploads/hall-5.jpg', '/uploads/navruz-3.jpg', '/uploads/hall-1.jpg', '/uploads/hall-6.jpg'],
      services: {
        singers: [
          { name: 'Benom guruhi', price: 20000000 },
          { name: 'Shahzoda', price: 18000000 },
          { name: 'Ulug\'bek Rahmatullayev', price: 10000000 },
        ],
        karnaySurnay: { available: true, price: 4000000 },
        menu: [{ name: 'Premium palov' }, { name: 'Lag\'mon' }, { name: 'Tandir kabob' }, { name: 'Shashlik' }, { name: 'Manti' }],
        cars: [
          { brand: 'Rolls-Royce Phantom', price: 5000000 },
          { brand: 'Mercedes S-class', price: 2500000 },
          { brand: 'Cadillac Escalade', price: 2000000 },
        ],
      },
      status: 'tasdiqlangan', ownerId: owner2._id,
      createdAt: new Date().toISOString(),
    },
    {
      name: 'Oq Saroy', district: 'Yakkasaroy', address: 'Shota Rustaveli ko\'chasi 33',
      lat: 41.2870, lng: 69.2510,
      capacity: 250, pricePerSeat: 85000, phone: '+998712345681',
      photos: ['/uploads/navruz-2.jpg', '/uploads/hall-7.jpg', '/uploads/hall-3.jpg'],
      services: {
        singers: [
          { name: 'Tohir Sadiqov', price: 5000000 },
        ],
        karnaySurnay: { available: false, price: 0 },
        menu: [{ name: 'Palov' }, { name: 'Sho\'rva' }],
        cars: [],
      },
      status: 'tasdiqlangan', ownerId: owner2._id,
      createdAt: new Date().toISOString(),
    },
    {
      name: 'Grand Bukhara', district: 'Shayxontohur', address: 'Navoiy ko\'chasi 100',
      lat: 41.3250, lng: 69.2360,
      capacity: 600, pricePerSeat: 130000, phone: '+998712345682',
      photos: ['/uploads/navruz-4.jpg', '/uploads/hall-2.jpg', '/uploads/hall-8.jpg', '/uploads/hall-6.jpg'],
      services: {
        singers: [
          { name: 'Munisa Rizayeva', price: 14000000 },
          { name: 'Shohruhxon', price: 16000000 },
        ],
        karnaySurnay: { available: true, price: 3500000 },
        menu: [{ name: 'Toshkent palovi' }, { name: 'Chuchvara' }, { name: 'Dimlama' }, { name: 'Kabob' }],
        cars: [
          { brand: 'Toyota Camry', price: 600000 },
          { brand: 'Hyundai Sonata', price: 500000 },
        ],
      },
      status: 'tasdiqlangan', ownerId: owner1._id,
      createdAt: new Date().toISOString(),
    },
    {
      name: 'Yangi To\'yxona', district: 'Sergeli', address: 'Sergeli ko\'chasi 55',
      lat: 41.2280, lng: 69.2200,
      capacity: 200, pricePerSeat: 75000, phone: '+998712345683',
      photos: ['/uploads/hall-2.jpg', '/uploads/hall-1.jpg'],
      services: {
        singers: [],
        karnaySurnay: { available: true, price: 2000000 },
        menu: [{ name: 'Palov' }, { name: 'Somsa' }],
        cars: [],
      },
      status: 'tasdiqlanmagan', ownerId: owner2._id,
      createdAt: new Date().toISOString(),
    },
  ];

  const createdVenues = [];
  for (const v of venues) {
    createdVenues.push(await db.venues.insert(v));
  }
  console.log(`${createdVenues.length} ta to'yxona yaratildi`);

  // Create some bookings
  const today = new Date();
  const bookingData = [
    { venueIdx: 0, daysFromNow: 5, guestCount: 300 },
    { venueIdx: 0, daysFromNow: 12, guestCount: 450 },
    { venueIdx: 0, daysFromNow: 20, guestCount: 200 },
    { venueIdx: 1, daysFromNow: 3, guestCount: 250 },
    { venueIdx: 1, daysFromNow: 15, guestCount: 180 },
    { venueIdx: 2, daysFromNow: 7, guestCount: 600 },
    { venueIdx: 2, daysFromNow: 14, guestCount: 500 },
    { venueIdx: 2, daysFromNow: 25, guestCount: 700 },
    { venueIdx: 3, daysFromNow: 10, guestCount: 200 },
    { venueIdx: 4, daysFromNow: 8, guestCount: 400 },
    { venueIdx: 4, daysFromNow: 18, guestCount: 350 },
  ];

  for (const bd of bookingData) {
    const v = createdVenues[bd.venueIdx];
    const d = new Date(today);
    d.setDate(d.getDate() + bd.daysFromNow);
    const dateStr = d.toISOString().split('T')[0];
    const totalPrice = bd.guestCount * v.pricePerSeat;
    await db.bookings.insert({
      venueId: v._id, venueName: v.name, venueDistrict: v.district,
      date: dateStr, guestCount: bd.guestCount,
      totalPrice, advance: Math.round(totalPrice * 0.2),
      services: [],
      userId: user1._id, userFirstName: user1.firstName,
      userLastName: user1.lastName, userPhone: user1.phone,
      status: 'active', createdAt: new Date().toISOString(),
    });
  }
  console.log(`${bookingData.length} ta bron yaratildi`);

  console.log('\n=== Seed muvaffaqiyatli! ===');
  console.log('Admin: admin / admin123');
  console.log('Owner 1: jamshid / owner123');
  console.log('Owner 2: nilufar / owner123');
  console.log('User: +998901234567 / user123');
}

seed()
  .catch(console.error)
  .finally(() => db.pool.end());
