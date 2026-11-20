const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data_homestay.json');
const db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

let seed = 7788;
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

// Existing customers map or create pool
let customers = db.customers || [];
if (customers.length < 400) {
  for (let i = customers.length; i < 400; i++) {
    const f = i < 30 ? foreignNames[i % foreignNames.length] : null;
    const name = f ? f.name : `${pickOne(firstNames)} ${pickOne(middleNames)} ${pickOne(lastNames)}`;
    const nat = f ? f.nat : 'Việt Nam';
    const idCard = f ? f.pass + String(i) : `0790${randInt(85, 99)}${String(randInt(100000, 999999))}`;
    const email = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/\s+/g, '.') + `${randInt(1, 99)}@gmail.com`;
    const phone = `09${randInt(10000000, 99999999)}`;
    customers.push({
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
      lastStay: '2026-11-01'
    });
  }
}

const customerMap = {};
customers.forEach(c => customerMap[c.id] = c);

// Room Map & RoomType Map
const rtMap = {};
(db.roomTypes || []).forEach(rt => rtMap[rt.id] = rt);

const rooms = db.rooms || [];
const propMap = {};
(db.properties || []).forEach(p => propMap[p.id] = p.name);

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

// Helper: Format Date
function formatDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

function addDays(d, days) {
  const res = new Date(d);
  res.setDate(res.getDate() + days);
  return res;
}

// Keep historical bookings completed before 2026-11-20
const TODAY_STR = '2026-11-20';
const pastBookings = (db.bookings || []).filter(b => b.checkOutDate <= TODAY_STR);
const pastPayments = (db.payments || []).filter(p => {
  const b = (db.bookings || []).find(bk => bk.id === p.bookingId);
  return b && b.checkOutDate <= TODAY_STR;
});

console.log(`Retaining ${pastBookings.length} historical completed bookings and ${pastPayments.length} past payments.`);

// Upcoming Bookings generator (2026-11-20 to 2027-01-31)
const upcomingBookings = [];
const upcomingPayments = [];

let bookingCounter = 500;
let paymentCounter = 900;

// Group bookings templates
const groupTemplates = [
  {
    name: 'Đoàn VinFast Year-End Party 2026',
    propertyId: 'prop_1',
    roomIds: ['r_201', 'r_202', 'r_203', 'r_204', 'r_301'],
    checkIn: '2026-12-18',
    checkOut: '2026-12-21',
    note: 'Đoàn công ty đặt trước phòng VIP & Deluxe hội thảo tất niên'
  },
  {
    name: 'Hội Khóa Bách Khoa K48',
    propertyId: 'prop_2',
    roomIds: ['r_go1', 'r_go2', 'r_gac1', 'r_bung1'],
    checkIn: '2026-12-24',
    checkOut: '2026-12-27',
    note: 'Đoàn họp lớp Giáng Sinh Đà Lạt'
  },
  {
    name: 'Đoàn Du Lịch Countdown 2027 - CenLand',
    propertyId: 'prop_1',
    roomIds: ['r_101', 'r_102', 'r_103', 'r_201', 'r_202'],
    checkIn: '2026-12-31',
    checkOut: '2027-01-03',
    note: 'Đoàn countdown năm mới 2027 ngắm pháo hoa biển'
  },
  {
    name: 'Công Ty CP Công Nghệ FPT - Tất Niên 2026',
    propertyId: 'prop_3',
    roomIds: ['r_v1', 'r_v2', 'r_v3', 'r_f1', 'r_f2'],
    checkIn: '2027-01-15',
    checkOut: '2027-01-18',
    note: 'Bao trọn khu Villa Hội An tổ chức Year End Gala'
  },
  {
    name: 'Đại Gia Đình Bác Thành (HN)',
    propertyId: 'prop_1',
    roomIds: ['r_301', 'r_302', 'r_203'],
    checkIn: '2027-01-22',
    checkOut: '2027-01-25',
    note: 'Gia đình nghỉ dưỡng giáp Tết'
  }
];

// Room calendar schedule map: roomId -> [{ start, end }]
const occupiedSchedules = {};
rooms.forEach(r => occupiedSchedules[r.id] = []);

// Pre-place group bookings
groupTemplates.forEach(grp => {
  const cust = pickOne(customers);
  const src = { id: 'direct', name: 'Trực tiếp / Hotline' };
  const groupId = `grp_${randInt(100, 999)}`;

  grp.roomIds.forEach(roomId => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;
    const rt = rtMap[room.roomTypeId] || {};

    const inDate = parseDate(grp.checkIn);
    const outDate = parseDate(grp.checkOut);
    const nights = Math.round((outDate - inDate) / (1000 * 60 * 60 * 24));

    // Calculate rates
    const nightlyRates = [];
    let roomTotal = 0;
    const cur = new Date(inDate);
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    for (let d = 0; d < nights; d++) {
      const dt = new Date(cur);
      dt.setDate(dt.getDate() + d);
      const isWk = (dt.getDay() === 5 || dt.getDay() === 6);
      const rate = isWk ? (rt.priceWeekend || 900000) : (rt.priceWeekday || 700000);
      roomTotal += rate;
      nightlyRates.push({
        date: formatDate(dt),
        dayName: dayNames[dt.getDay()],
        isWeekend: isWk,
        rate
      });
    }

    const srv = [extraServicesCatalog[2]]; // Breakfast
    const servicesTotal = srv.reduce((s, x) => s + x.price, 0);
    const grandTotal = roomTotal + servicesTotal;
    const deposit = Math.round(grandTotal * 0.5 / 10000) * 10000;
    const paid = deposit;
    const balance = grandTotal - paid;

    const bMonth = grp.checkIn.slice(2, 4) + grp.checkIn.slice(5, 7);
    const bookingId = `BK${bMonth}-${String(bookingCounter++).padStart(3, '0')}`;

    const booking = {
      id: bookingId,
      groupId,
      groupName: grp.name,
      customerId: cust.id,
      customerName: cust.name,
      customerPhone: cust.phone,
      propertyId: grp.propertyId,
      roomId: room.id,
      roomName: room.name,
      roomTypeName: rt.name,
      checkInDate: grp.checkIn,
      checkOutDate: grp.checkOut,
      nights,
      guestsCount: rt.capacity || 2,
      status: 'confirmed',
      source: src.id,
      sourceName: src.name,
      nightlyRates,
      roomTotal,
      services: srv,
      servicesTotal,
      grandTotal,
      deposit,
      paid,
      balance,
      notes: `${grp.note} (Nhóm: ${grp.name})`,
      createdAt: '2026-11-15T09:00:00Z'
    };

    upcomingBookings.push(booking);
    occupiedSchedules[room.id].push({ start: grp.checkIn, end: grp.checkOut });

    // Deposit payment
    upcomingPayments.push({
      id: `PAY-${String(paymentCounter++).padStart(4, '0')}`,
      date: '2026-11-16',
      bookingId: booking.id,
      customerName: cust.name,
      roomProperty: `${room.name} · ${propMap[grp.propertyId]}`,
      type: 'deposit',
      typeName: 'Đặt cọc',
      method: 'transfer',
      methodName: 'Chuyển khoản',
      amount: deposit,
      recipient: 'Quản trị viên',
      notes: `Cọc 50% đoàn ${grp.name} (${booking.id})`
    });
  });
});

// Now fill in each room schedule from 2026-11-20 to 2027-01-31
const END_DATE_STR = '2027-01-31';
const END_DATE = parseDate(END_DATE_STR);

rooms.forEach((room, rIdx) => {
  if (room.id === 'r_104') return; // Room 104 in maintenance

  const rt = rtMap[room.roomTypeId] || {};
  let curDate = parseDate('2026-11-20');

  // Today Nov 20: 14 rooms have active in-house stay
  if (rIdx % 3 !== 0) {
    const priorDays = pickOne([1, 2, 3]);
    const checkIn = formatDate(addDays(curDate, -priorDays));
    const stayNights = priorDays + pickOne([1, 2, 3]);
    const checkOut = formatDate(addDays(parseDate(checkIn), stayNights));

    const cust = pickOne(customers);
    const src = pickSource();

    const nightlyRates = [];
    let roomTotal = 0;
    const cD = parseDate(checkIn);
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    for (let d = 0; d < stayNights; d++) {
      const dt = addDays(cD, d);
      const isWk = (dt.getDay() === 5 || dt.getDay() === 6);
      const rate = isWk ? (rt.priceWeekend || 900000) : (rt.priceWeekday || 700000);
      roomTotal += rate;
      nightlyRates.push({
        date: formatDate(dt),
        dayName: dayNames[dt.getDay()],
        isWeekend: isWk,
        rate
      });
    }

    const srvCount = randInt(0, 2);
    const srv = [];
    for (let s = 0; s < srvCount; s++) srv.push(pickOne(extraServicesCatalog));
    const servicesTotal = srv.reduce((sum, x) => sum + x.price, 0);
    const grandTotal = roomTotal + servicesTotal;
    const deposit = Math.round(grandTotal * 0.4 / 10000) * 10000;
    const paid = deposit;
    const balance = grandTotal - paid;

    const bookingId = `BK2611-${String(bookingCounter++).padStart(3, '0')}`;
    const booking = {
      id: bookingId,
      groupId: null,
      groupName: '',
      customerId: cust.id,
      customerName: cust.name,
      customerPhone: cust.phone,
      propertyId: room.propertyId,
      roomId: room.id,
      roomName: room.name,
      roomTypeName: rt.name,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      nights: stayNights,
      guestsCount: rt.capacity || 2,
      status: 'occupied',
      source: src.id,
      sourceName: src.name,
      nightlyRates,
      roomTotal,
      services: srv,
      servicesTotal,
      grandTotal,
      deposit,
      paid,
      balance,
      notes: 'Khách đang lưu trú tại phòng',
      createdAt: `${checkIn}T08:00:00Z`
    };

    upcomingBookings.push(booking);
    occupiedSchedules[room.id].push({ start: checkIn, end: checkOut });

    upcomingPayments.push({
      id: `PAY-${String(paymentCounter++).padStart(4, '0')}`,
      date: checkIn,
      bookingId: booking.id,
      customerName: cust.name,
      roomProperty: `${room.name} · ${propMap[room.propertyId]}`,
      type: 'deposit',
      typeName: 'Đặt cọc',
      method: pickOne(paymentMethods).id,
      methodName: 'Chuyển khoản',
      amount: deposit,
      recipient: 'Quản trị viên',
      notes: `Cọc đơn ${booking.id}`
    });

    curDate = parseDate(checkOut);
  }

  // Iterate from curDate up to 2027-01-31
  while (curDate < END_DATE) {
    const curStr = formatDate(curDate);

    // Check if curDate falls inside or near an existing group booking
    const bookedSlot = occupiedSchedules[room.id].find(s => curStr >= s.start && curStr < s.end);
    if (bookedSlot) {
      curDate = parseDate(bookedSlot.end);
      continue;
    }

    // Occasional gap of 1-2 empty days
    if (random() > 0.82) {
      curDate = addDays(curDate, randInt(1, 2));
      continue;
    }

    // Determine nights: 2 to 4 nights
    let nights = pickOne([2, 2, 2, 3, 3, 4]);
    let checkIn = curDate;
    let checkOut = addDays(checkIn, nights);

    // If checkOut crosses a booked group slot, truncate
    const nextSlot = occupiedSchedules[room.id].find(s => formatDate(checkIn) < s.start && formatDate(checkOut) > s.start);
    if (nextSlot) {
      checkOut = parseDate(nextSlot.start);
      nights = Math.round((checkOut - checkIn) / (1000 * 60 * 60 * 24));
      if (nights <= 0) {
        curDate = parseDate(nextSlot.end);
        continue;
      }
    }

    if (checkIn >= END_DATE) break;

    const checkInStr = formatDate(checkIn);
    const checkOutStr = formatDate(checkOut);

    const cust = pickOne(customers);
    const src = pickSource();

    // Nightly rates
    const nightlyRates = [];
    let roomTotal = 0;
    const cD = new Date(checkIn);
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    for (let d = 0; d < nights; d++) {
      const dt = addDays(cD, d);
      const isWk = (dt.getDay() === 5 || dt.getDay() === 6);
      const rate = isWk ? (rt.priceWeekend || 900000) : (rt.priceWeekday || 700000);
      roomTotal += rate;
      nightlyRates.push({
        date: formatDate(dt),
        dayName: dayNames[dt.getDay()],
        isWeekend: isWk,
        rate
      });
    }

    const srvCount = (random() > 0.5) ? randInt(1, 2) : 0;
    const srv = [];
    for (let s = 0; s < srvCount; s++) srv.push(pickOne(extraServicesCatalog));
    const servicesTotal = srv.reduce((sum, x) => sum + x.price, 0);
    const grandTotal = roomTotal + servicesTotal;

    // Status: 85% confirmed, 15% hold
    const isHold = (random() > 0.85);
    const status = isHold ? 'hold' : 'confirmed';
    const deposit = isHold ? 0 : Math.round(grandTotal * (random() > 0.5 ? 0.4 : 0.5) / 10000) * 10000;
    const paid = deposit;
    const balance = grandTotal - paid;

    const bMonth = checkInStr.slice(2, 4) + checkInStr.slice(5, 7);
    const bookingId = `BK${bMonth}-${String(bookingCounter++).padStart(3, '0')}`;

    const notesList = [
      'Đặt phòng du lịch gia đình',
      'Khách yêu cầu phòng yên tĩnh tầng cao',
      'Hẹn đón sân bay lúc 13h30',
      'Khách đặt qua OTA thanh toán trước',
      'Kèm thuê 01 xe máy số',
      'Đi trăng mật, hỗ trợ setup hoa hồng',
      'Khách quen đặt trước kỳ nghỉ Tết',
      'Báo giờ nhận phòng sớm lúc 11h'
    ];

    const booking = {
      id: bookingId,
      groupId: null,
      groupName: '',
      customerId: cust.id,
      customerName: cust.name,
      customerPhone: cust.phone,
      propertyId: room.propertyId,
      roomId: room.id,
      roomName: room.name,
      roomTypeName: rt.name,
      checkInDate: checkInStr,
      checkOutDate: checkOutStr,
      nights,
      guestsCount: rt.capacity || 2,
      status,
      source: src.id,
      sourceName: src.name,
      nightlyRates,
      roomTotal,
      services: srv,
      servicesTotal,
      grandTotal,
      deposit,
      paid,
      balance,
      notes: pickOne(notesList),
      createdAt: `${formatDate(addDays(checkIn, -randInt(5, 14)))}T10:00:00Z`
    };

    upcomingBookings.push(booking);
    occupiedSchedules[room.id].push({ start: checkInStr, end: checkOutStr });

    // Deposit payment record for confirmed bookings
    if (status === 'confirmed' && deposit > 0) {
      const pMethod = pickOne(paymentMethods);
      upcomingPayments.push({
        id: `PAY-${String(paymentCounter++).padStart(4, '0')}`,
        date: formatDate(addDays(checkIn, -randInt(2, 10))),
        bookingId: booking.id,
        customerName: cust.name,
        roomProperty: `${room.name} · ${propMap[room.propertyId]}`,
        type: 'deposit',
        typeName: 'Đặt cọc',
        method: pMethod.id,
        methodName: pMethod.name,
        amount: deposit,
        recipient: 'Quản trị viên',
        notes: `Cọc đơn đặt phòng ${booking.id}`
      });
    }

    curDate = addDays(checkOut, randInt(0, 1));
  }
});

// Merge past + upcoming bookings
const allBookings = [...pastBookings, ...upcomingBookings];
// Sort by checkInDate ascending
allBookings.sort((a, b) => a.checkInDate.localeCompare(b.checkInDate));

// Merge past + upcoming payments
const allPayments = [...pastPayments, ...upcomingPayments];
allPayments.sort((a, b) => a.date.localeCompare(b.date));

console.log(`Generated ${upcomingBookings.length} upcoming bookings through Jan 2027.`);
console.log(`Total Bookings: ${allBookings.length}`);
console.log(`Total Payments: ${allPayments.length}`);

// Recalculate customer metrics
customers.forEach(c => {
  const cBookings = allBookings.filter(b => b.customerId === c.id);
  c.stayCount = cBookings.length;
  c.nightsCount = cBookings.reduce((s, b) => s + b.nights, 0);
  c.totalSpend = cBookings.reduce((s, b) => s + b.grandTotal, 0);
  if (cBookings.length > 0) {
    const dates = cBookings.map(b => b.checkInDate).sort();
    c.lastStay = dates[dates.length - 1];
  }
  // Tier calculation
  if (c.totalSpend >= 50000000 || c.stayCount >= 6) {
    c.tier = 'vip';
  } else if (c.totalSpend >= 15000000 || c.stayCount >= 3) {
    c.tier = 'loyal';
  } else {
    c.tier = 'regular';
  }
});

const vips = customers.filter(c => c.tier === 'vip').length;
const loyals = customers.filter(c => c.tier === 'loyal').length;
const regulars = customers.filter(c => c.tier === 'regular').length;
console.log(`Customers updated: ${customers.length} (VIP: ${vips}, Loyal: ${loyals}, Regular: ${regulars})`);

// Update Housekeeping status for today (2026-11-20)
rooms.forEach(r => {
  if (r.id === 'r_104') {
    r.housekeepingStatus = 'maintenance';
    r.maintenanceReason = 'Sửa điều hoà';
    r.nextGuest = 'Dự kiến xong 15/12';
    return;
  }

  // Find active booking today
  const active = allBookings.find(b => b.roomId === r.id && TODAY_STR >= b.checkInDate && TODAY_STR < b.checkOutDate);
  const arriving = allBookings.find(b => b.roomId === r.id && b.checkInDate === TODAY_STR);
  const dueOut = allBookings.find(b => b.roomId === r.id && b.checkOutDate === TODAY_STR);
  const next = allBookings.find(b => b.roomId === r.id && b.checkInDate > TODAY_STR);

  if (active) {
    r.housekeepingStatus = 'occupied';
    const [y, m, d] = active.checkOutDate.split('-');
    r.nextGuest = `${active.customerName} · đến ${d}/${m}`;
  } else if (arriving) {
    r.housekeepingStatus = 'arriving';
    r.nextGuest = `${arriving.customerName} · nhận hôm nay`;
  } else if (dueOut) {
    r.housekeepingStatus = 'due_out';
    r.nextGuest = `${dueOut.customerName} · trả hôm nay`;
  } else if (next) {
    r.housekeepingStatus = 'clean';
    const [y, m, d] = next.checkInDate.split('-');
    r.nextGuest = `Khách kế: ${d}/${m}`;
  } else {
    r.housekeepingStatus = 'clean';
    r.nextGuest = 'Sẵn sàng đón khách';
  }
});

// Update database
db.bookings = allBookings;
db.payments = allPayments;
db.customers = customers;
db.rooms = rooms;

fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');
console.log(`Saved successfully to ${DATA_FILE}`);
