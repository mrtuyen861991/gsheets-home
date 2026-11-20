const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data_homestay.json');
const db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

// Seeded deterministic random or pseudo-random
let seed = 42;
function random() {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
}
function randInt(min, max) {
  return Math.floor(random() * (max - min + 1)) + min;
}
function pickOne(arr) {
  return arr[randInt(0, arr.length - 1)];
}

const firstNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý', 'Đinh', 'Đoàn', 'Trịnh'];
const middleNames = ['Văn', 'Thị', 'Minh', 'Hải', 'Thanh', 'Đức', 'Quốc', 'Ngọc', 'Hữu', 'Gia', 'Bảo', 'Kim', 'Xuân', 'Đình', 'Anh', 'Mạnh', 'Trọng', 'Phương', 'Thu'];
const lastNames = ['Long', 'Hà', 'Sơn', 'Khánh', 'Yến', 'Trang', 'Phúc', 'Bảo', 'Hương', 'Nam', 'Khoa', 'Thảo', 'Việt', 'Tùng', 'Linh', 'Dũng', 'Huy', 'Tâm', 'Tuấn', 'An', 'Bình', 'Hùng', 'Kiên', 'Hân', 'Nhi', 'Mai', 'Quân'];

const foreignNames = [
  { name: 'John Smith', nat: 'Mỹ', pass: 'US9821345' },
  { name: 'David Miller', nat: 'Anh', pass: 'GB4412903' },
  { name: 'Emily Brown', nat: 'Úc', pass: 'AU7710294' },
  { name: 'Tanaka Yui', nat: 'Nhật Bản', pass: 'JP1102945' },
  { name: 'Kim Min-jun', nat: 'Hàn Quốc', pass: 'KR8830192' },
  { name: 'Lucas Martin', nat: 'Pháp', pass: 'FR5512908' },
  { name: 'Hans Müller', nat: 'Đức', pass: 'DE3301924' },
  { name: 'Sofia Rossi', nat: 'Ý', pass: 'IT9920145' },
  { name: 'Chen Wei', nat: 'Đài Loan', pass: 'TW6620194' },
  { name: 'Chloe Dubois', nat: 'Canada', pass: 'CA1192045' },
  { name: 'Liam O’Connor', nat: 'Ireland', pass: 'IE5510294' }
];

// Generate pool of 360 unique customers
const customersPool = [];
const usedPhones = new Set();
const usedIdCards = new Set();

for (let i = 0; i < 360; i++) {
  let name, nat, idCard, email;
  if (i < 25) {
    const f = foreignNames[i % foreignNames.length];
    name = f.name;
    nat = f.nat;
    idCard = f.pass + String(i);
    email = name.toLowerCase().replace(/[^a-z]/g, '') + `${randInt(10, 99)}@gmail.com`;
  } else {
    name = `${pickOne(firstNames)} ${pickOne(middleNames)} ${pickOne(lastNames)}`;
    nat = 'Việt Nam';
    const cccdHead = pickOne(['079', '001', '038', '048', '092', '036', '068']);
    idCard = `${cccdHead}0${randInt(85, 99)}${String(randInt(100000, 999999))}`;
    email = name.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/\s+/g, '.') + `${randInt(1, 99)}@gmail.com`;
  }

  const phonePrefix = pickOne(['090', '091', '093', '097', '098', '086', '088', '077', '039', '038']);
  const phone = `${phonePrefix}${randInt(1000000, 9999999)}`;

  customersPool.push({
    id: `c_${i + 1}`,
    name,
    email,
    phone,
    idCard,
    nationality: nat,
    tier: 'regular',
    stayCount: 0,
    nightsCount: 0,
    totalSpend: 0,
    lastStay: '2026-01-10'
  });
}

const sources = [
  { id: 'direct', name: 'Trực tiếp / Hotline', weight: 35 },
  { id: 'booking', name: 'Booking.com', weight: 26 },
  { id: 'agoda', name: 'Agoda', weight: 22 },
  { id: 'facebook', name: 'Facebook / Zalo', weight: 11 },
  { id: 'traveloka', name: 'Traveloka', weight: 6 }
];

function pickSource() {
  const r = randInt(1, 100);
  let cum = 0;
  for (const s of sources) {
    cum += s.weight;
    if (r <= cum) return s;
  }
  return sources[0];
}

const paymentMethods = [
  { id: 'transfer', name: 'Chuyển khoản' },
  { id: 'cash', name: 'Tiền mặt' },
  { id: 'pos', name: 'Thẻ POS' },
  { id: 'momo', name: 'Ví MoMo' },
  { id: 'ota', name: 'OTA thu hộ' }
];

const extraServicesCatalog = [
  { id: 'srv_bike', name: 'Thuê xe máy', price: 150000 },
  { id: 'srv_laundry', name: 'Giặt là lấy ngay', price: 60000 },
  { id: 'srv_breakfast', name: 'Suất ăn sáng', price: 80000 },
  { id: 'srv_airport', name: 'Xe đưa đón sân bay', price: 350000 },
  { id: 'srv_minibar', name: 'Nước uống Minibar', price: 50000 },
  { id: 'srv_extra_bed', name: 'Thêm giường phụ', price: 250000 },
  { id: 'srv_early_checkin', name: 'Phụ thu nhận phòng sớm', price: 200000 }
];

// Room Map & RoomType Map
const rtMap = {};
(db.roomTypes || []).forEach(rt => rtMap[rt.id] = rt);

const rooms = db.rooms || [];
const propMap = {};
(db.properties || []).forEach(p => propMap[p.id] = p.name);

// Generate 420 bookings evenly distributed across 12 months (Jan 2026 -> Dec 2026)
// Current reference date: 2026-11-20
const TODAY_STR = '2026-11-20';
const TODAY = new Date('2026-11-20T12:00:00Z');

const bookings = [];
const payments = [];

let bookingSerial = 1;
let paymentSerial = 1;

// Group booking pool: every ~25 bookings, make a 2-room group
const groupNames = ['Đoàn VietinBank Teambuilding', 'Gia đình Bác Thành (HN)', 'Nhóm Du Lịch Phượt Xuyên Việt', 'Đoàn FPT Software Quy Nhơn', 'Công Ty Bất Động Sản CenGroup', 'Hội Cựu Sinh Viên Bách Khoa', 'Đoàn Khách Du Lịch Singapore'];

// Target ~35 bookings per month across 11 months + 35 for Dec 2026 = 420 bookings
const months = [
  { year: 2026, month: 1, days: 31, count: 34 },
  { year: 2026, month: 2, days: 28, count: 38 }, // Tết Nguyên Đán
  { year: 2026, month: 3, days: 31, count: 32 },
  { year: 2026, month: 4, days: 30, count: 36 }, // 30/4
  { year: 2026, month: 5, days: 31, count: 35 },
  { year: 2026, month: 6, days: 30, count: 42 }, // Hè
  { year: 2026, month: 7, days: 31, count: 45 }, // Cao điểm hè
  { year: 2026, month: 8, days: 31, count: 38 },
  { year: 2026, month: 9, days: 30, count: 34 },
  { year: 2026, month: 10, days: 31, count: 36 },
  { year: 2026, month: 11, days: 30, count: 38 }, // Tháng hiện tại
  { year: 2026, month: 12, days: 31, count: 28 }  // Sắp tới (Tết Tây)
];

const weekendNights = db.settings?.weekendNights || ['fri', 'sat'];

months.forEach(m => {
  const mm = String(m.month).padStart(2, '0');

  for (let k = 0; k < m.count; k++) {
    const dayIn = randInt(1, Math.max(1, m.days - 3));
    const nights = pickOne([1, 2, 2, 2, 3, 3, 4]);
    const dayOut = Math.min(m.days, dayIn + nights);
    const actualNights = Math.max(1, dayOut - dayIn);

    const checkInDate = `2026-${mm}-${String(dayIn).padStart(2, '0')}`;
    const checkOutDate = `2026-${mm}-${String(dayOut).padStart(2, '0')}`;

    // Pick property with distribution: Biển Xanh 42%, Mây Đà Lạt 33%, Hội An 25%
    let propId = 'prop_1';
    const pRoll = randInt(1, 100);
    if (pRoll <= 42) propId = 'prop_1';
    else if (pRoll <= 75) propId = 'prop_2';
    else propId = 'prop_3';

    // Pick room belonging to that property
    const availRooms = rooms.filter(r => r.propertyId === propId);
    const room = pickOne(availRooms);
    const roomType = rtMap[room.roomTypeId] || {};

    // Customer
    // 35% chance to pick an existing customer with stays, 65% chance for a new one
    const customer = pickOne(customersPool);

    // Compute nightly rates
    const nightlyRates = [];
    let curD = new Date(`${checkInDate}T12:00:00Z`);
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const dayCodes = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

    for (let ni = 0; ni < actualNights; ni++) {
      const dCode = dayCodes[curD.getUTCDay()];
      const isWk = weekendNights.includes(dCode);
      const rate = isWk ? (roomType.priceWeekend || roomType.priceWeekday) : roomType.priceWeekday;
      nightlyRates.push({
        date: curD.toISOString().split('T')[0],
        dayName: dayNames[curD.getUTCDay()],
        isWeekend: isWk,
        rate
      });
      curD.setUTCDate(curD.getUTCDate() + 1);
    }

    const roomTotal = nightlyRates.reduce((s, r) => s + r.rate, 0);

    // Services (30% probability)
    const bookingServices = [];
    if (randInt(1, 100) <= 30) {
      const srv = pickOne(extraServicesCatalog);
      const qty = randInt(1, 2);
      bookingServices.push({
        id: srv.id,
        name: srv.name,
        price: srv.price,
        quantity: qty,
        total: srv.price * qty
      });
    }
    const servicesTotal = bookingServices.reduce((s, sv) => s + sv.total, 0);
    const grandTotal = roomTotal + servicesTotal;

    // Status based on timeframe
    let status = 'checked_out';
    if (checkOutDate < TODAY_STR) {
      // Past bookings
      if (randInt(1, 100) <= 4) {
        status = 'cancelled';
      } else {
        status = 'checked_out';
      }
    } else if (checkInDate <= TODAY_STR && checkOutDate >= TODAY_STR) {
      // Active today
      status = 'occupied';
    } else {
      // Future bookings
      const futRoll = randInt(1, 100);
      if (futRoll <= 60) status = 'confirmed';
      else if (futRoll <= 90) status = 'hold';
      else status = 'cancelled';
    }

    const src = pickSource();
    const bId = `BK26${mm}-${String(bookingSerial).padStart(3, '0')}`;
    bookingSerial++;

    // Deposits and Payments
    let deposit = 0;
    let paid = 0;

    const createdD = new Date(new Date(`${checkInDate}T12:00:00Z`).getTime() - randInt(2, 14) * 86400000);
    const createdStr = createdD.toISOString().split('T')[0];

    const isGroup = (bookingSerial % 22 === 0);
    const groupName = isGroup ? pickOne(groupNames) : '';
    const groupId = isGroup ? `grp_26${mm}_${randInt(10, 99)}` : null;

    if (status === 'checked_out') {
      // Fully settled
      const depMethod = src.id === 'booking' || src.id === 'agoda' ? 'ota' : pickOne(['transfer', 'momo', 'cash']);
      const finalMethod = pickOne(['cash', 'transfer', 'pos']);

      deposit = Math.round((grandTotal * pickOne([0.3, 0.4, 0.5])) / 10000) * 10000;
      paid = grandTotal;

      // 1. Deposit Payment
      const pay1 = {
        id: `PAY-${String(paymentSerial++).padStart(4, '0')}`,
        date: createdStr,
        bookingId: bId,
        customerName: customer.name,
        roomProperty: `${room.name} · ${propMap[propId]}`,
        type: 'deposit',
        typeName: 'Đặt cọc',
        method: depMethod,
        methodName: paymentMethods.find(m => m.id === depMethod)?.name || 'Chuyển khoản',
        amount: deposit,
        recipient: 'Quản trị viên',
        notes: `Cọc 40% đơn ${bId}`
      };
      payments.push(pay1);

      // 2. Final Payment on Checkout
      if (grandTotal - deposit > 0) {
        const pay2 = {
          id: `PAY-${String(paymentSerial++).padStart(4, '0')}`,
          date: checkOutDate,
          bookingId: bId,
          customerName: customer.name,
          roomProperty: `${room.name} · ${propMap[propId]}`,
          type: 'payment',
          typeName: 'Thanh toán',
          method: finalMethod,
          methodName: paymentMethods.find(m => m.id === finalMethod)?.name || 'Tiền mặt',
          amount: grandTotal - deposit,
          recipient: 'Lễ tân',
          notes: `Thanh toán trả phòng đơn ${bId}`
        };
        payments.push(pay2);
      }

      // Update customer stats
      customer.stayCount += 1;
      customer.nightsCount += actualNights;
      customer.totalSpend += grandTotal;
      if (checkOutDate > customer.lastStay) customer.lastStay = checkOutDate;
    } else if (status === 'occupied') {
      // Checked in today, deposit paid, remaining balance due on checkout
      deposit = Math.round((grandTotal * 0.5) / 10000) * 10000;
      paid = deposit;

      const depMethod = pickOne(['transfer', 'pos', 'cash', 'momo']);
      payments.push({
        id: `PAY-${String(paymentSerial++).padStart(4, '0')}`,
        date: createdStr,
        bookingId: bId,
        customerName: customer.name,
        roomProperty: `${room.name} · ${propMap[propId]}`,
        type: 'deposit',
        typeName: 'Đặt cọc',
        method: depMethod,
        methodName: paymentMethods.find(m => m.id === depMethod)?.name || 'Chuyển khoản',
        amount: deposit,
        recipient: 'Quản trị viên',
        notes: `Đặt cọc phòng ${bId} (Đang lưu trú)`
      });

      customer.stayCount += 1;
      customer.nightsCount += actualNights;
      customer.totalSpend += deposit;
      if (checkInDate > customer.lastStay) customer.lastStay = checkInDate;
    } else if (status === 'confirmed') {
      // Future confirmed: 40% deposit
      deposit = Math.round((grandTotal * 0.4) / 10000) * 10000;
      paid = deposit;

      const depMethod = pickOne(['transfer', 'momo', 'ota']);
      payments.push({
        id: `PAY-${String(paymentSerial++).padStart(4, '0')}`,
        date: createdStr,
        bookingId: bId,
        customerName: customer.name,
        roomProperty: `${room.name} · ${propMap[propId]}`,
        type: 'deposit',
        typeName: 'Đặt cọc',
        method: depMethod,
        methodName: paymentMethods.find(m => m.id === depMethod)?.name || 'Chuyển khoản',
        amount: deposit,
        recipient: 'Quản trị viên',
        notes: `Cọc đơn giữ chỗ xác nhận ${bId}`
      });
    } else if (status === 'hold') {
      // Unpaid or tiny deposit
      deposit = 0;
      paid = 0;
    } else if (status === 'cancelled') {
      // Cancelled: if past, partial refund
      deposit = 500000;
      paid = 0;
      // Record refund
      payments.push({
        id: `PAY-${String(paymentSerial++).padStart(4, '0')}`,
        date: checkInDate,
        bookingId: bId,
        customerName: customer.name,
        roomProperty: `${room.name} · ${propMap[propId]}`,
        type: 'refund',
        typeName: 'Hoàn tiền',
        method: 'transfer',
        methodName: 'Chuyển khoản',
        amount: -250000,
        recipient: 'Kế toán',
        notes: `Hoàn 50% cọc cho khách huỷ đơn ${bId}`
      });
    }

    const bookingObj = {
      id: bId,
      groupId,
      groupName,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      propertyId: propId,
      roomId: room.id,
      roomName: room.name,
      roomTypeName: roomType.name || 'Tiêu chuẩn',
      checkInDate,
      checkOutDate,
      nights: actualNights,
      guestsCount: roomType.capacity || 2,
      status,
      source: src.id,
      sourceName: src.name,
      nightlyRates,
      roomTotal,
      services: bookingServices,
      servicesTotal,
      grandTotal,
      deposit,
      paid,
      balance: Math.max(0, grandTotal - paid),
      notes: isGroup ? `Đoàn ${groupName}` : (status === 'hold' ? 'Khách hẹn thanh toán khi nhận phòng' : 'Đặt phòng tiêu chuẩn'),
      createdAt: `${createdStr}T08:30:00Z`
    };

    bookings.push(bookingObj);
  }
});

// Update Customer Tiers based on totalSpend and stayCount
customersPool.forEach(c => {
  if (c.totalSpend >= 35000000 || c.stayCount >= 6) {
    c.tier = 'vip';
  } else if (c.totalSpend >= 15000000 || c.stayCount >= 3) {
    c.tier = 'loyal';
  } else {
    c.tier = 'regular';
  }
});

// Synchronize today's room housekeeping status based on active occupied bookings
const occupiedRoomIds = new Set(
  bookings.filter(b => b.status === 'occupied').map(b => b.roomId)
);
const dueOutRoomIds = new Set(
  bookings.filter(b => b.checkOutDate === TODAY_STR && b.status === 'checked_out').map(b => b.roomId)
);

rooms.forEach(r => {
  if (r.housekeepingStatus === 'maintenance') return;
  if (occupiedRoomIds.has(r.id)) {
    r.housekeepingStatus = 'occupied';
  } else if (dueOutRoomIds.has(r.id)) {
    r.housekeepingStatus = 'dirty';
  } else {
    // 80% clean, 20% dirty
    r.housekeepingStatus = (randInt(1, 10) <= 8) ? 'clean' : 'dirty';
  }
});

// Sort bookings newest first
bookings.sort((a, b) => b.checkInDate.localeCompare(a.checkInDate));
payments.sort((a, b) => b.date.localeCompare(a.date));

// Save to db
db.bookings = bookings;
db.payments = payments;
db.customers = customersPool;

// Update usage counts in settings / categories
db.categories = db.categories || {};
db.categories.bookingSources = sources.map(s => {
  const cnt = bookings.filter(b => b.source === s.id).length;
  return { id: s.id, name: s.name, usageCount: cnt };
});
db.categories.paymentMethods = paymentMethods.map(pm => {
  const cnt = payments.filter(p => p.method === pm.id).length;
  return { id: pm.id, name: pm.name, usageCount: cnt };
});

fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');

console.log('==================================================');
console.log('✅ ĐÃ TẠO THÀNH CÔNG DỮ LIỆU DEMO 12 THÁNG NĂM 2026!');
console.log(`📦 Tổng số đơn đặt phòng: ${bookings.length}`);
console.log(`💵 Tổng số phiếu thu / cọc: ${payments.length}`);
console.log(`👥 Tổng số hồ sơ khách hàng: ${customersPool.length}`);
console.log(`⭐ Khách VIP: ${customersPool.filter(c => c.tier === 'vip').length}, Thân thiết: ${customersPool.filter(c => c.tier === 'loyal').length}`);
console.log('==================================================');
