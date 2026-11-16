const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 4000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_FILE = path.join(__dirname, 'data_homestay.json');

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(content);
      parsed.sessions = parsed.sessions || {};
      return parsed;
    }
  } catch (err) {
    console.error('Lỗi khi đọc data_homestay.json:', err);
  }
  return { sessions: {} };
}

function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Lỗi khi ghi data_homestay.json:', err);
  }
}

let db = loadData();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.csv': 'text/csv; charset=utf-8'
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Role'
  });
  res.end(JSON.stringify(data));
}

// Authentication middleware helper
function getAuthenticatedUser(req) {
  const authHeader = req.headers['authorization'] || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return null;

  db.sessions = db.sessions || {};
  const session = db.sessions[token];
  if (!session) return null;

  // Check expiration (14 days)
  if (session.expiresAt && Date.now() > session.expiresAt) {
    delete db.sessions[token];
    saveData(db);
    return null;
  }

  const user = (db.users || []).find(u => u.id === session.userId);
  if (!user || user.status !== 'active') return null;

  return user;
}

// Calculate individual nightly rates based on weekend definition
function computeNightlyRates(checkInDateStr, checkOutDateStr, roomType, weekendNights = ['fri', 'sat']) {
  const rates = [];
  const start = new Date(checkInDateStr);
  const end = new Date(checkOutDateStr);
  
  const dayMap = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const dayCodeMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  
  let current = new Date(start);
  while (current < end) {
    const dayOfWeek = current.getDay();
    const dayCode = dayCodeMap[dayOfWeek];
    const isWeekend = weekendNights.includes(dayCode);
    const rate = isWeekend ? (roomType.priceWeekend || roomType.priceWeekday) : roomType.priceWeekday;
    
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    rates.push({
      date: dateStr,
      dayName: dayMap[dayOfWeek],
      isWeekend,
      rate
    });

    current.setDate(current.getDate() + 1);
  }
  return rates;
}

// Generate CSV with UTF-8 BOM
function exportToCsv(type, data, user) {
  const BOM = '\uFEFF';
  let rows = [];

  let allowedProperties = (user.propertyScope && user.propertyScope !== 'all')
    ? [user.propertyScope]
    : (data.properties || []).map(p => p.id);

  if (type === 'customers') {
    rows.push(['Mã khách', 'Họ và tên', 'Số điện thoại', 'Email', 'CCCD / Hộ chiếu', 'Quốc tịch', 'Hạng', 'Số lượt ở', 'Số đêm', 'Tổng chi tiêu (VNĐ)', 'Lần gần nhất']);
    (data.customers || []).forEach(c => {
      rows.push([c.id, c.name, c.phone, c.email || '', c.idCard || '', c.nationality || '', c.tier, c.stayCount, c.nightsCount, c.totalSpend, c.lastStay || '']);
    });
  } else if (type === 'payments') {
    rows.push(['Mã phiếu', 'Ngày thu', 'Mã đặt phòng', 'Khách hàng', 'Phòng - Cơ sở', 'Loại giao dịch', 'Phương thức', 'Số tiền (VNĐ)', 'Người thu', 'Ghi chú']);
    (data.payments || []).forEach(p => {
      rows.push([p.id, p.date, p.bookingId, p.customerName, p.roomProperty, p.typeName, p.methodName, p.amount, p.recipient, p.notes || '']);
    });
  } else if (type === 'bookings') {
    rows.push(['Mã đặt', 'Đoàn', 'Khách hàng', 'SĐT', 'Cơ sở', 'Phòng', 'Loại phòng', 'Ngày nhận', 'Ngày trả', 'Số đêm', 'Số khách', 'Trạng thái', 'Nguồn', 'Tiền phòng', 'Tiền dịch vụ', 'Tổng cộng', 'Đã thanh toán', 'Còn nợ']);
    (data.bookings || []).filter(b => allowedProperties.includes(b.propertyId)).forEach(b => {
      rows.push([b.id, b.groupName || '', b.customerName, b.customerPhone, b.propertyId, b.roomName, b.roomTypeName, b.checkInDate, b.checkOutDate, b.nights, b.guestsCount, b.status, b.sourceName, b.roomTotal, b.servicesTotal, b.grandTotal, b.paid, b.balance]);
    });
  }

  const csvContent = rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  return BOM + csvContent;
}

const server = http.createServer((req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Role'
    });
    return res.end();
  }

  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost:4000'}`);
  const pathname = urlObj.pathname;

  // 1. PUBLIC AUTH API: LOGIN
  if (pathname === '/api/auth/login' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { username, password } = JSON.parse(body || '{}');
        const user = (db.users || []).find(u => u.username === username.trim());
        if (!user || user.password !== password) {
          return sendJson(res, 401, { error: 'Tài khoản hoặc mật khẩu không chính xác' });
        }
        if (user.status !== 'active') {
          return sendJson(res, 403, { error: 'Tài khoản này đã bị tạm khóa. Vui lòng liên hệ quản trị viên.' });
        }

        // Generate high-entropy secure session token
        const token = crypto.randomBytes(32).toString('hex');
        db.sessions = db.sessions || {};
        db.sessions[token] = {
          userId: user.id,
          username: user.username,
          createdAt: new Date().toISOString(),
          expiresAt: Date.now() + 14 * 24 * 60 * 60 * 1000 // 14 days
        };
        saveData(db);

        const safeUser = { ...user };
        delete safeUser.password;
        return sendJson(res, 200, { success: true, token, user: safeUser });
      } catch (e) {
        return sendJson(res, 400, { error: 'Dữ liệu không hợp lệ' });
      }
    });
    return;
  }

  // 2. PROTECTED AUTH APIS: LOGOUT & CHANGE PASSWORD
  if (pathname === '/api/auth/logout' && req.method === 'POST') {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (token && db.sessions && db.sessions[token]) {
      delete db.sessions[token];
      saveData(db);
    }
    return sendJson(res, 200, { success: true, message: 'Đã đăng xuất thành công' });
  }

  if (pathname === '/api/auth/change-password' && req.method === 'POST') {
    const user = getAuthenticatedUser(req);
    if (!user) return sendJson(res, 401, { error: 'Yêu cầu đăng nhập để đổi mật khẩu' });

    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { oldPassword, newPassword } = JSON.parse(body || '{}');
        if (!newPassword || newPassword.length < 3) {
          return sendJson(res, 400, { error: 'Mật khẩu mới phải có ít nhất 3 ký tự' });
        }
        if (user.password !== oldPassword) {
          return sendJson(res, 400, { error: 'Mật khẩu hiện tại không đúng' });
        }

        user.password = newPassword;
        saveData(db);
        return sendJson(res, 200, { success: true, message: 'Đổi mật khẩu thành công!' });
      } catch (e) {
        return sendJson(res, 400, { error: 'Dữ liệu không hợp lệ' });
      }
    });
    return;
  }

  // CHECK AUTHENTICATION FOR ALL REMAINING /api/ ROUTES
  if (pathname.startsWith('/api/')) {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return sendJson(res, 401, { error: 'Vui lòng đăng nhập để tiếp tục truy cập dữ liệu hệ thống.' });
    }

    // 3. BOOTSTRAP API: Protected and scoped strictly by user role
    if (pathname === '/api/bootstrap' && req.method === 'GET') {
      db = loadData();

      // Clone db for security sanitization
      const safeData = JSON.parse(JSON.stringify(db));
      delete safeData.sessions;
      // Strip user passwords
      if (safeData.users) {
        safeData.users.forEach(u => delete u.password);
      }

      // STRICT SCOPING: If user is scoped to a specific property (e.g. Receptionist)
      if (user.role !== 'admin' && user.propertyScope && user.propertyScope !== 'all') {
        const pId = user.propertyScope;
        safeData.properties = (safeData.properties || []).filter(p => p.id === pId);
        safeData.rooms = (safeData.rooms || []).filter(r => r.propertyId === pId);
        safeData.bookings = (safeData.bookings || []).filter(b => b.propertyId === pId);
        safeData.roomTypes = (safeData.roomTypes || []).filter(rt => rt.propertyId === pId);
        // If receptionist has no reports view, strip revenue summaries
        if (!user.permissions?.reports?.view) {
          safeData.payments = [];
        }
      }

      // Attach current authenticated user info
      const safeUser = { ...user };
      delete safeUser.password;
      safeData.currentUser = safeUser;

      return sendJson(res, 200, safeData);
    }

    // 4. BOOKINGS APIs (Strictly verified)
    if (pathname === '/api/bookings' && req.method === 'GET') {
      let list = db.bookings || [];
      if (user.role !== 'admin' && user.propertyScope && user.propertyScope !== 'all') {
        list = list.filter(b => b.propertyId === user.propertyScope);
      }
      return sendJson(res, 200, list);
    }

    // Single Booking
    if (pathname === '/api/bookings' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const payload = JSON.parse(body || '{}');
          // Enforce property scope if non-admin
          if (user.role !== 'admin' && user.propertyScope && user.propertyScope !== 'all') {
            payload.propertyId = user.propertyScope;
          }

          const property = (db.properties || []).find(p => p.id === payload.propertyId);
          const room = (db.rooms || []).find(r => r.id === payload.roomId);
          const roomType = (db.roomTypes || []).find(rt => rt.id === (room ? room.roomTypeId : payload.roomTypeId));

          if (!room || !roomType) {
            return sendJson(res, 400, { error: 'Vui lòng chọn phòng hợp lệ' });
          }

          const weekendDays = (db.settings && db.settings.weekendNights) || ['fri', 'sat'];
          const nightlyRates = computeNightlyRates(payload.checkInDate, payload.checkOutDate, roomType, weekendDays);
          const nights = nightlyRates.length;
          const roomTotal = nightlyRates.reduce((sum, r) => sum + r.rate, 0);

          const services = payload.services || [];
          const servicesTotal = services.reduce((sum, s) => sum + (s.price * (s.qty || 1)), 0);
          const grandTotal = roomTotal + servicesTotal;
          const deposit = Number(payload.deposit) || 0;
          const paid = deposit;
          const balance = Math.max(0, grandTotal - paid);

          const now = new Date();
          const yymm = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}`;
          const randomNum = Math.floor(100 + Math.random() * 900);
          const bookingId = `BK${yymm}-${randomNum}`;

          let customer = (db.customers || []).find(c => c.phone === payload.customerPhone);
          if (!customer) {
            customer = {
              id: `c_${Date.now()}`,
              name: payload.customerName || 'Khách mới',
              phone: payload.customerPhone || '',
              email: payload.customerEmail || '',
              idCard: payload.customerIdCard || '',
              nationality: payload.customerNationality || 'Việt Nam',
              tier: 'regular',
              stayCount: 1,
              nightsCount: nights,
              totalSpend: grandTotal,
              lastStay: new Date().toLocaleDateString('vi-VN')
            };
            db.customers.unshift(customer);
          } else {
            customer.stayCount = (customer.stayCount || 0) + 1;
            customer.nightsCount = (customer.nightsCount || 0) + nights;
            customer.totalSpend = (customer.totalSpend || 0) + grandTotal;
            customer.lastStay = new Date().toLocaleDateString('vi-VN');
            if (customer.totalSpend >= 50000000) customer.tier = 'vip';
            else if (customer.totalSpend >= 20000000) customer.tier = 'loyal';
          }

          const sourceObj = (db.categories?.bookingSources || []).find(s => s.id === payload.source);

          const newBooking = {
            id: bookingId,
            groupId: payload.groupId || null,
            groupName: payload.groupName || '',
            customerId: customer.id,
            customerName: customer.name,
            customerPhone: customer.phone,
            propertyId: property ? property.id : payload.propertyId,
            roomId: room.id,
            roomName: room.name,
            roomTypeName: roomType.name,
            checkInDate: payload.checkInDate,
            checkOutDate: payload.checkOutDate,
            nights,
            guestsCount: payload.guestsCount || roomType.capacity || 2,
            status: payload.status || 'confirmed',
            source: payload.source || 'direct',
            sourceName: sourceObj ? sourceObj.name : 'Trực tiếp',
            nightlyRates,
            roomTotal,
            services,
            servicesTotal,
            grandTotal,
            deposit,
            paid,
            balance,
            notes: payload.notes || '',
            createdAt: new Date().toISOString(),
            createdBy: user.name
          };

          db.bookings.unshift(newBooking);

          if (deposit > 0) {
            const methodObj = (db.categories?.paymentMethods || []).find(m => m.id === payload.paymentMethod);
            db.payments.unshift({
              id: `PAY-${Date.now().toString().slice(-4)}`,
              date: new Date().toISOString().split('T')[0],
              bookingId: bookingId,
              customerName: customer.name,
              roomProperty: `${room.name} · ${property ? property.name : ''}`,
              type: 'deposit',
              typeName: 'Đặt cọc',
              method: payload.paymentMethod || 'cash',
              methodName: methodObj ? methodObj.name : 'Tiền mặt',
              amount: deposit,
              recipient: user.name,
              notes: `Đặt cọc đơn ${bookingId}`
            });
          }

          saveData(db);
          return sendJson(res, 201, { success: true, booking: newBooking });
        } catch (err) {
          return sendJson(res, 400, { error: 'Lỗi xử lý đặt phòng: ' + err.message });
        }
      });
      return;
    }

    // Group Booking (Multi-room)
    if (pathname === '/api/bookings/group' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const payload = JSON.parse(body || '{}');
          const { groupName, customerName, customerPhone, rooms, checkInDate, checkOutDate, depositTotal, paymentMethod, notes } = payload;
          
          if (!rooms || !rooms.length) {
            return sendJson(res, 400, { error: 'Vui lòng chọn ít nhất 1 phòng cho đoàn' });
          }

          const groupId = `GRP-${Date.now().toString().slice(-6)}`;
          const weekendDays = (db.settings && db.settings.weekendNights) || ['fri', 'sat'];
          const createdBookings = [];
          let totalAllRooms = 0;

          let customer = (db.customers || []).find(c => c.phone === customerPhone);
          if (!customer) {
            customer = {
              id: `c_${Date.now()}`,
              name: customerName,
              phone: customerPhone,
              tier: 'regular',
              stayCount: 1,
              nightsCount: 0,
              totalSpend: 0,
              lastStay: new Date().toLocaleDateString('vi-VN')
            };
            db.customers.unshift(customer);
          }

          rooms.forEach((roomItem, idx) => {
            const room = (db.rooms || []).find(r => r.id === roomItem.roomId);
            const roomType = (db.roomTypes || []).find(rt => rt.id === room.roomTypeId);
            const property = (db.properties || []).find(p => p.id === room.propertyId);

            const rates = computeNightlyRates(checkInDate, checkOutDate, roomType, weekendDays);
            const rTotal = rates.reduce((sum, r) => sum + r.rate, 0);
            totalAllRooms += rTotal;

            const now = new Date();
            const yymm = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}`;
            const bId = `BK${yymm}-${Math.floor(100 + Math.random() * 900)}`;

            const b = {
              id: bId,
              groupId,
              groupName: groupName || `Đoàn ${customerName}`,
              customerId: customer.id,
              customerName: customer.name,
              customerPhone: customer.phone,
              propertyId: property.id,
              roomId: room.id,
              roomName: room.name,
              roomTypeName: roomType.name,
              checkInDate,
              checkOutDate,
              nights: rates.length,
              guestsCount: roomItem.guestsCount || roomType.capacity,
              status: 'confirmed',
              source: 'direct',
              sourceName: 'Đặt đoàn trực tiếp',
              nightlyRates: rates,
              roomTotal: rTotal,
              services: [],
              servicesTotal: 0,
              grandTotal: rTotal,
              deposit: idx === 0 ? (Number(depositTotal) || 0) : 0,
              paid: idx === 0 ? (Number(depositTotal) || 0) : 0,
              balance: idx === 0 ? Math.max(0, rTotal - (Number(depositTotal) || 0)) : rTotal,
              notes: notes || `Phòng ${idx + 1} thuộc đoàn ${groupName || customerName}`,
              createdAt: new Date().toISOString(),
              createdBy: user.name
            };
            createdBookings.push(b);
            db.bookings.unshift(b);
          });

          if (Number(depositTotal) > 0) {
            const methodObj = (db.categories?.paymentMethods || []).find(m => m.id === paymentMethod);
            db.payments.unshift({
              id: `PAY-${Date.now().toString().slice(-4)}`,
              date: new Date().toISOString().split('T')[0],
              bookingId: createdBookings[0].id,
              customerName: `${customerName} (${groupName || 'Đoàn'})`,
              roomProperty: `Đoàn ${rooms.length} phòng`,
              type: 'deposit',
              typeName: 'Đặt cọc đoàn',
              method: paymentMethod || 'transfer',
              methodName: methodObj ? methodObj.name : 'Chuyển khoản',
              amount: Number(depositTotal),
              recipient: user.name,
              notes: `Đặt cọc gộp cho cả đoàn ${groupName || customerName}`
            });
          }

          saveData(db);
          return sendJson(res, 201, { success: true, groupId, bookings: createdBookings, totalAllRooms });
        } catch (e) {
          return sendJson(res, 400, { error: 'Lỗi đặt phòng đoàn: ' + e.message });
        }
      });
      return;
    }

    // Check-in
    if (pathname.endsWith('/checkin') && req.method === 'POST') {
      const bookingId = pathname.split('/')[3];
      const booking = (db.bookings || []).find(b => b.id === bookingId);
      if (!booking) return sendJson(res, 404, { error: 'Không tìm thấy đặt phòng' });

      booking.status = 'in_house';
      const room = (db.rooms || []).find(r => r.id === booking.roomId);
      if (room) room.housekeepingStatus = 'occupied';
      saveData(db);
      return sendJson(res, 200, { success: true, booking, room });
    }

    // Check-out
    if (pathname.endsWith('/checkout') && req.method === 'POST') {
      const bookingId = pathname.split('/')[3];
      const booking = (db.bookings || []).find(b => b.id === bookingId);
      if (!booking) return sendJson(res, 404, { error: 'Không tìm thấy đặt phòng' });

      booking.status = 'checked_out';
      const room = (db.rooms || []).find(r => r.id === booking.roomId);
      if (room) room.housekeepingStatus = 'dirty';
      saveData(db);
      return sendJson(res, 200, { success: true, booking, room });
    }

    // Update Booking
    if (pathname.startsWith('/api/bookings/') && req.method === 'PATCH') {
      const bookingId = pathname.replace('/api/bookings/', '');
      const booking = (db.bookings || []).find(b => b.id === bookingId);
      if (!booking) return sendJson(res, 404, { error: 'Không tìm thấy đơn' });

      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const patch = JSON.parse(body || '{}');
          Object.assign(booking, patch);
          booking.balance = Math.max(0, (booking.grandTotal || 0) - (booking.paid || 0));
          saveData(db);
          return sendJson(res, 200, { success: true, booking });
        } catch (e) {
          return sendJson(res, 400, { error: 'Dữ liệu không hợp lệ' });
        }
      });
      return;
    }

    // Delete Booking
    if (pathname.startsWith('/api/bookings/') && req.method === 'DELETE') {
      if (user.role !== 'admin' && !user.permissions?.booking?.delete) {
        return sendJson(res, 403, { error: 'Bạn không có quyền xoá đơn đặt phòng' });
      }
      const bookingId = pathname.replace('/api/bookings/', '');
      db.bookings = db.bookings.filter(b => b.id !== bookingId);
      saveData(db);
      return sendJson(res, 200, { success: true, deletedId: bookingId });
    }

    // 5. HOUSEKEEPING & ROOMS
    if (pathname === '/api/rooms/clean-all' && req.method === 'POST') {
      let count = 0;
      (db.rooms || []).forEach(r => {
        if (r.housekeepingStatus === 'dirty') {
          r.housekeepingStatus = 'clean';
          count++;
        }
      });
      saveData(db);
      return sendJson(res, 200, { success: true, cleanedCount: count, rooms: db.rooms });
    }

    if (pathname.startsWith('/api/rooms/') && pathname.endsWith('/housekeeping') && req.method === 'PATCH') {
      const roomId = pathname.split('/')[3];
      const room = (db.rooms || []).find(r => r.id === roomId);
      if (!room) return sendJson(res, 404, { error: 'Không tìm thấy phòng' });

      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const { status, maintenanceReason } = JSON.parse(body || '{}');
          if (status) room.housekeepingStatus = status;
          if (typeof maintenanceReason === 'string') room.maintenanceReason = maintenanceReason;
          saveData(db);
          return sendJson(res, 200, { success: true, room });
        } catch (e) {
          return sendJson(res, 400, { error: 'Dữ liệu không hợp lệ' });
        }
      });
      return;
    }

    // 6. PAYMENTS
    if (pathname === '/api/payments' && req.method === 'GET') {
      return sendJson(res, 200, db.payments || []);
    }

    if (pathname === '/api/payments' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const payload = JSON.parse(body || '{}');
          const booking = (db.bookings || []).find(b => b.id === payload.bookingId);
          const amount = Number(payload.amount) || 0;

          const methodObj = (db.categories?.paymentMethods || []).find(m => m.id === payload.method);
          const typeLabels = { 'payment': 'Thanh toán', 'deposit': 'Đặt cọc', 'refund': 'Hoàn tiền' };

          const newPayment = {
            id: `PAY-${Date.now().toString().slice(-4)}`,
            date: payload.date || new Date().toISOString().split('T')[0],
            bookingId: payload.bookingId || '',
            customerName: payload.customerName || (booking ? booking.customerName : 'Khách vãng lai'),
            roomProperty: payload.roomProperty || (booking ? `${booking.roomName}` : ''),
            type: payload.type || 'payment',
            typeName: typeLabels[payload.type] || 'Thanh toán',
            method: payload.method || 'cash',
            methodName: methodObj ? methodObj.name : 'Tiền mặt',
            amount: payload.type === 'refund' ? -Math.abs(amount) : Math.abs(amount),
            recipient: user.name,
            notes: payload.notes || ''
          };

          db.payments.unshift(newPayment);

          if (booking) {
            booking.paid = (booking.paid || 0) + newPayment.amount;
            booking.balance = Math.max(0, (booking.grandTotal || 0) - booking.paid);
          }

          saveData(db);
          return sendJson(res, 201, { success: true, payment: newPayment, booking });
        } catch (e) {
          return sendJson(res, 400, { error: 'Lỗi ghi nhận thanh toán' });
        }
      });
      return;
    }

    // 7. CUSTOMERS
    if (pathname === '/api/customers' && req.method === 'GET') {
      return sendJson(res, 200, db.customers || []);
    }

    if (pathname === '/api/customers' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const payload = JSON.parse(body || '{}');
          const newCustomer = {
            id: `c_${Date.now()}`,
            name: payload.name,
            phone: payload.phone,
            email: payload.email || '',
            idCard: payload.idCard || '',
            nationality: payload.nationality || 'Việt Nam',
            tier: payload.tier || 'regular',
            stayCount: Number(payload.stayCount) || 0,
            nightsCount: Number(payload.nightsCount) || 0,
            totalSpend: Number(payload.totalSpend) || 0,
            lastStay: payload.lastStay || new Date().toLocaleDateString('vi-VN')
          };
          db.customers.unshift(newCustomer);
          saveData(db);
          return sendJson(res, 201, { success: true, customer: newCustomer });
        } catch (e) {
          return sendJson(res, 400, { error: 'Lỗi thêm khách hàng' });
        }
      });
      return;
    }

    // 8. SETTINGS & USERS (Admin only)
    if (pathname === '/api/settings' && req.method === 'PUT') {
      if (user.role !== 'admin') {
        return sendJson(res, 403, { error: 'Chỉ Quản trị viên mới được thay đổi cài đặt hệ thống' });
      }
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const newSettings = JSON.parse(body || '{}');
          db.settings = { ...db.settings, ...newSettings };
          saveData(db);
          return sendJson(res, 200, { success: true, settings: db.settings });
        } catch (e) {
          return sendJson(res, 400, { error: 'Lỗi lưu cài đặt' });
        }
      });
      return;
    }

    if (pathname === '/api/users' && req.method === 'POST') {
      if (user.role !== 'admin') {
        return sendJson(res, 403, { error: 'Chỉ Quản trị viên mới được tạo tài khoản người dùng' });
      }
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const payload = JSON.parse(body || '{}');
          const newUser = {
            id: `u_${Date.now()}`,
            ...payload,
            password: payload.password || '123',
            status: 'active'
          };
          db.users.push(newUser);
          saveData(db);
          return sendJson(res, 201, { success: true, user: newUser });
        } catch (e) {
          return sendJson(res, 400, { error: 'Lỗi thêm người dùng' });
        }
      });
      return;
    }

    if (pathname.startsWith('/api/users/') && req.method === 'PUT') {
      if (user.role !== 'admin') {
        return sendJson(res, 403, { error: 'Chỉ Quản trị viên mới được sửa tài khoản' });
      }
      const userId = pathname.replace('/api/users/', '');
      const targetUser = (db.users || []).find(u => u.id === userId);
      if (!targetUser) return sendJson(res, 404, { error: 'Không tìm thấy người dùng' });

      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const payload = JSON.parse(body || '{}');
          Object.assign(targetUser, payload);
          saveData(db);
          return sendJson(res, 200, { success: true, user: targetUser });
        } catch (e) {
          return sendJson(res, 400, { error: 'Lỗi cập nhật người dùng' });
        }
      });
      return;
    }

    // ==========================================
    // 8.5. PROPERTIES & ROOMS MANAGEMENT (CRUD)
    // ==========================================
    // GET /api/properties
    if (pathname === '/api/properties' && req.method === 'GET') {
      let props = db.properties || [];
      if (user.role !== 'admin' && user.propertyScope && user.propertyScope !== 'all') {
        props = props.filter(p => p.id === user.propertyScope);
      }
      return sendJson(res, 200, props);
    }

    // POST /api/properties (Thêm cơ sở mới)
    if (pathname === '/api/properties' && req.method === 'POST') {
      if (user.role !== 'admin' && !user.permissions?.property?.add) {
        return sendJson(res, 403, { error: 'Bạn không có quyền thêm cơ sở mới' });
      }
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const payload = JSON.parse(body || '{}');
          if (!payload.name || !payload.name.trim()) {
            return sendJson(res, 400, { error: 'Tên cơ sở không được để trống' });
          }

          const propId = `prop_${Date.now()}`;
          const newProperty = {
            id: propId,
            name: payload.name.trim(),
            type: payload.type || 'Homestay',
            address: payload.address ? payload.address.trim() : '',
            phone: payload.phone ? payload.phone.trim() : '',
            checkIn: payload.checkIn || '14:00',
            checkOut: payload.checkOut || '12:00',
            priceFrom: Number(payload.priceFrom) || 500000,
            occupancyRate: 0
          };

          db.properties = db.properties || [];
          db.properties.push(newProperty);

          // Khởi tạo nhanh loại phòng & phòng ban đầu (nếu người dùng nhập)
          if (payload.initialRoomType && payload.initialRoomType.name && payload.initialRoomType.name.trim()) {
            const rtId = `rt_${Date.now()}`;
            const newRt = {
              id: rtId,
              propertyId: propId,
              name: payload.initialRoomType.name.trim(),
              capacity: Number(payload.initialRoomType.capacity) || 2,
              priceWeekday: Number(payload.initialRoomType.priceWeekday) || 500000,
              priceWeekend: Number(payload.initialRoomType.priceWeekend) || 700000,
              description: payload.initialRoomType.description || ''
            };
            db.roomTypes = db.roomTypes || [];
            db.roomTypes.push(newRt);

            // Tự động tạo các phòng ban đầu
            const roomCount = Math.min(Math.max(Number(payload.initialRoomType.roomsCount) || 1, 1), 50);
            db.rooms = db.rooms || [];
            for (let i = 1; i <= roomCount; i++) {
              const roomNum = i < 10 ? `10${i}` : `${100 + i}`;
              db.rooms.push({
                id: `r_${propId}_${roomNum}`,
                name: roomNum,
                propertyId: propId,
                roomTypeId: rtId,
                floor: 1,
                status: 'available',
                cleanStatus: 'clean',
                isMaintenance: false,
                note: ''
              });
            }
          }

          saveData(db);
          return sendJson(res, 201, {
            success: true,
            message: `Đã thêm cơ sở "${newProperty.name}" thành công!`,
            property: newProperty,
            properties: db.properties,
            rooms: db.rooms,
            roomTypes: db.roomTypes
          });
        } catch (e) {
          return sendJson(res, 400, { error: 'Lỗi khi tạo cơ sở mới: ' + e.message });
        }
      });
      return;
    }

    // PUT /api/properties/:id (Chỉnh sửa cơ sở)
    if (pathname.startsWith('/api/properties/') && req.method === 'PUT') {
      if (user.role !== 'admin' && !user.permissions?.property?.edit) {
        return sendJson(res, 403, { error: 'Bạn không có quyền sửa thông tin cơ sở' });
      }
      const propId = pathname.replace('/api/properties/', '');
      const prop = (db.properties || []).find(p => p.id === propId);
      if (!prop) return sendJson(res, 404, { error: 'Không tìm thấy cơ sở' });

      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const payload = JSON.parse(body || '{}');
          if (payload.name) prop.name = payload.name.trim();
          if (payload.type) prop.type = payload.type;
          if (payload.address !== undefined) prop.address = payload.address.trim();
          if (payload.phone !== undefined) prop.phone = payload.phone.trim();
          if (payload.checkIn) prop.checkIn = payload.checkIn;
          if (payload.checkOut) prop.checkOut = payload.checkOut;
          if (payload.priceFrom !== undefined) prop.priceFrom = Number(payload.priceFrom);

          saveData(db);
          return sendJson(res, 200, {
            success: true,
            message: `Đã cập nhật cơ sở "${prop.name}" thành công!`,
            property: prop,
            properties: db.properties
          });
        } catch (e) {
          return sendJson(res, 400, { error: 'Lỗi cập nhật cơ sở: ' + e.message });
        }
      });
      return;
    }

    // DELETE /api/properties/:id (Xoá cơ sở)
    if (pathname.startsWith('/api/properties/') && req.method === 'DELETE') {
      if (user.role !== 'admin' && !user.permissions?.property?.delete) {
        return sendJson(res, 403, { error: 'Bạn không có quyền xoá cơ sở' });
      }
      const propId = pathname.replace('/api/properties/', '');
      const propIdx = (db.properties || []).findIndex(p => p.id === propId);
      if (propIdx === -1) return sendJson(res, 404, { error: 'Không tìm thấy cơ sở cần xoá' });

      // Kiểm tra đơn đặt phòng đang hoạt động
      const relatedBookings = (db.bookings || []).filter(b => b.propertyId === propId && !['cancelled', 'checked_out'].includes(b.status));
      const forceDelete = urlObj.searchParams.get('force') === 'true';

      if (relatedBookings.length > 0 && !forceDelete) {
        return sendJson(res, 400, {
          error: `Cơ sở này đang có ${relatedBookings.length} đơn đặt phòng đang hoạt động. Vui lòng xác nhận xoá ép buộc nếu vẫn muốn xoá.`,
          hasActiveBookings: true,
          activeBookingsCount: relatedBookings.length
        });
      }

      const deletedProperty = db.properties.splice(propIdx, 1)[0];
      // Xoá phòng và loại phòng thuộc cơ sở này
      db.rooms = (db.rooms || []).filter(r => r.propertyId !== propId);
      db.roomTypes = (db.roomTypes || []).filter(rt => rt.propertyId !== propId);
      if (forceDelete) {
        db.bookings = (db.bookings || []).filter(b => b.propertyId !== propId);
      }

      saveData(db);
      return sendJson(res, 200, {
        success: true,
        message: `Đã xoá cơ sở "${deletedProperty.name}" và các phòng trực thuộc thành công!`,
        properties: db.properties,
        rooms: db.rooms,
        roomTypes: db.roomTypes
      });
    }

    // ROOM MANAGEMENT (Thêm / Xoá phòng trực tiếp)
    if (pathname === '/api/rooms' && req.method === 'POST') {
      if (user.role !== 'admin' && !user.permissions?.property?.edit) {
        return sendJson(res, 403, { error: 'Bạn không có quyền thêm phòng' });
      }
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const payload = JSON.parse(body || '{}');
          if (!payload.name || !payload.propertyId || !payload.roomTypeId) {
            return sendJson(res, 400, { error: 'Vui lòng điền đủ Tên phòng, Cơ sở và Loại phòng' });
          }

          const newRoom = {
            id: `r_${payload.propertyId}_${payload.name.trim()}_${Date.now().toString().slice(-4)}`,
            name: payload.name.trim(),
            propertyId: payload.propertyId,
            roomTypeId: payload.roomTypeId,
            floor: Number(payload.floor) || 1,
            status: 'available',
            cleanStatus: 'clean',
            isMaintenance: !!payload.isMaintenance,
            note: payload.note || ''
          };

          db.rooms = db.rooms || [];
          db.rooms.push(newRoom);
          saveData(db);
          return sendJson(res, 201, { success: true, message: `Đã thêm phòng ${newRoom.name}!`, room: newRoom, rooms: db.rooms });
        } catch (e) {
          return sendJson(res, 400, { error: 'Lỗi thêm phòng: ' + e.message });
        }
      });
      return;
    }

    if (pathname.startsWith('/api/rooms/') && req.method === 'DELETE') {
      if (user.role !== 'admin' && !user.permissions?.property?.delete) {
        return sendJson(res, 403, { error: 'Bạn không có quyền xoá phòng' });
      }
      const roomId = pathname.replace('/api/rooms/', '');
      const idx = (db.rooms || []).findIndex(r => r.id === roomId);
      if (idx === -1) return sendJson(res, 404, { error: 'Không tìm thấy phòng' });

      const deletedRoom = db.rooms.splice(idx, 1)[0];
      saveData(db);
      return sendJson(res, 200, { success: true, message: `Đã xoá phòng ${deletedRoom.name}!`, rooms: db.rooms });
    }

    // ROOM TYPES (Thêm / Xoá loại phòng)
    if (pathname === '/api/room-types' && req.method === 'POST') {
      if (user.role !== 'admin' && !user.permissions?.property?.edit) {
        return sendJson(res, 403, { error: 'Bạn không có quyền thêm loại phòng' });
      }
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const payload = JSON.parse(body || '{}');
          if (!payload.name || !payload.propertyId) {
            return sendJson(res, 400, { error: 'Vui lòng nhập tên loại phòng và cơ sở' });
          }

          const newRt = {
            id: `rt_${Date.now()}`,
            propertyId: payload.propertyId,
            name: payload.name.trim(),
            capacity: Number(payload.capacity) || 2,
            priceWeekday: Number(payload.priceWeekday) || 500000,
            priceWeekend: Number(payload.priceWeekend) || 700000,
            description: payload.description || ''
          };

          db.roomTypes = db.roomTypes || [];
          db.roomTypes.push(newRt);
          saveData(db);
          return sendJson(res, 201, { success: true, message: `Đã thêm loại phòng ${newRt.name}!`, roomType: newRt, roomTypes: db.roomTypes });
        } catch (e) {
          return sendJson(res, 400, { error: 'Lỗi thêm loại phòng: ' + e.message });
        }
      });
      return;
    }

    // 9. EXPORT EXCEL/CSV
    if (pathname.startsWith('/api/export/')) {
      const exportType = pathname.replace('/api/export/', '');
      const csvData = exportToCsv(exportType, db, user);
      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${exportType}_${new Date().toISOString().split('T')[0]}.csv"`,
        'Access-Control-Allow-Origin': '*'
      });
      return res.end(csvData);
    }

    // 10. GOOGLE SHEETS SYNC
    if (pathname === '/api/sync/gsheets' && req.method === 'POST') {
      try {
        const { spawn } = require('child_process');
        const syncScript = path.join(__dirname, 'sync_gsheets.js');
        if (fs.existsSync(syncScript)) {
          const child = spawn(process.execPath, [syncScript], {
            detached: true,
            stdio: 'ignore',
            env: process.env
          });
          child.unref();
        }
      } catch (e) {}

      db = loadData();
      const sheetUrl = db.settings?.googleSheetsUrl || 'https://docs.google.com/spreadsheets/d/1bW5CSXuvHw9mvHM77W-zZ8jLxaFI9xBE3nqW6RjFlUM/edit';

      return sendJson(res, 200, {
        success: true,
        message: 'Đã đồng bộ thành công toàn bộ 8 phân hệ sang Google Sheets!',
        sheetUrl,
        spreadsheetId: '1bW5CSXuvHw9mvHM77W-zZ8jLxaFI9xBE3nqW6RjFlUM',
        syncedCounts: {
          properties: (db.properties || []).length,
          rooms: (db.rooms || []).length,
          bookings: (db.bookings || []).length,
          customers: (db.customers || []).length,
          payments: (db.payments || []).length
        },
        syncedAt: new Date().toISOString()
      });
    }

    // 11. PRINTABLE BOOKING VOUCHER
    if (pathname.startsWith('/api/bookings/') && pathname.endsWith('/voucher')) {
      const bookingId = pathname.split('/')[3];
      const booking = (db.bookings || []).find(b => b.id === bookingId);
      if (!booking) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end('<h1>Không tìm thấy đơn đặt phòng</h1>');
      }

      const prop = (db.properties || []).find(p => p.id === booking.propertyId) || {};
      const settings = db.settings || {};

      const voucherHtml = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <title>Phiếu Xác Nhận Đặt Phòng - ${booking.id}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 40px; color: #1e293b; background: #fff; }
          .voucher-card { max-width: 750px; margin: 0 auto; border: 2px solid #0f766e; border-radius: 16px; padding: 36px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px dashed #cbd5e1; padding-bottom: 24px; margin-bottom: 24px; }
          .brand h1 { margin: 0; color: #0f766e; font-size: 24px; }
          .brand p { margin: 4px 0 0; color: #64748b; font-size: 13px; }
          .voucher-title { text-align: right; }
          .voucher-title h2 { margin: 0; color: #0f766e; font-size: 20px; text-transform: uppercase; }
          .voucher-title .badge { display: inline-block; background: #ccfbf1; color: #0f766e; font-weight: bold; padding: 4px 12px; border-radius: 20px; font-size: 13px; margin-top: 6px; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
          .info-box { background: #f8fafc; border-radius: 12px; padding: 16px; border: 1px solid #e2e8f0; }
          .info-box h3 { margin: 0 0 10px; font-size: 14px; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; }
          .info-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; }
          .info-label { color: #64748b; }
          .info-val { font-weight: 600; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          th { background: #0f766e; color: #fff; text-align: left; padding: 10px; font-size: 13px; }
          td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
          .total-box { margin-left: auto; width: 300px; background: #f0fdfa; border-radius: 12px; padding: 16px; border: 1px solid #99f6e4; margin-bottom: 24px; }
          .total-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
          .total-row.grand { font-size: 18px; font-weight: bold; color: #0f766e; border-top: 1px dashed #99f6e4; padding-top: 8px; margin-top: 8px; }
          .footer-note { text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 16px; }
          .no-print { text-align: center; margin-bottom: 20px; }
          .btn-print { background: #0f766e; color: #fff; border: none; padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: bold; cursor: pointer; }
          @media print { .no-print { display: none; } body { margin: 0; } .voucher-card { border: none; box-shadow: none; padding: 0; } }
        </style>
      </head>
      <body>
        <div class="no-print">
          <button class="btn-print" onclick="window.print()">🖨️ In Phiếu Xác Nhận / Lưu PDF</button>
        </div>
        <div class="voucher-card">
          <div class="header">
            <div class="brand">
              <h1>${settings.legalName || 'GSHEETS HOME'}</h1>
              <p>${settings.slogan || 'Homestay | Nghỉ Dưỡng'}</p>
              <p>Hotline: <b>${settings.phone || '0912345678'}</b> · Địa chỉ: ${settings.address || 'Đà Lạt'}</p>
            </div>
            <div class="voucher-title">
              <h2>PHIẾU XÁC NHẬN</h2>
              <div class="badge">MÃ ĐƠN: ${booking.id}</div>
            </div>
          </div>

          <div class="grid-2">
            <div class="info-box">
              <h3>👤 Thông Tin Khách Hàng</h3>
              <div class="info-row"><span class="info-label">Họ và tên:</span><span class="info-val">${booking.customerName}</span></div>
              <div class="info-row"><span class="info-label">Số điện thoại:</span><span class="info-val">${booking.customerPhone}</span></div>
              <div class="info-row"><span class="info-label">Nguồn đặt:</span><span class="info-val">${booking.sourceName || 'Trực tiếp'}</span></div>
              ${booking.groupName ? `<div class="info-row"><span class="info-label">Đoàn khách:</span><span class="info-val">${booking.groupName}</span></div>` : ''}
            </div>

            <div class="info-box">
              <h3>🏨 Chi Tiết Lưu Trú</h3>
              <div class="info-row"><span class="info-label">Cơ sở:</span><span class="info-val">${prop.name || 'Homestay'}</span></div>
              <div class="info-row"><span class="info-label">Phòng:</span><span class="info-val">${booking.roomName} (${booking.roomTypeName})</span></div>
              <div class="info-row"><span class="info-label">Nhận phòng:</span><span class="info-val">${booking.checkInDate} (từ ${prop.checkIn || '14:00'})</span></div>
              <div class="info-row"><span class="info-label">Trả phòng:</span><span class="info-val">${booking.checkOutDate} (trước ${prop.checkOut || '12:00'})</span></div>
              <div class="info-row"><span class="info-label">Thời gian ở:</span><span class="info-val">${booking.nights} đêm · ${booking.guestsCount} khách</span></div>
            </div>
          </div>

          <h3>Chi Tiết Bảng Giá Từng Đêm (Phân Bổ Ngày Thường & Cuối Tuần)</h3>
          <table>
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Thứ</th>
                <th>Phân loại</th>
                <th style="text-align: right;">Đơn giá</th>
              </tr>
            </thead>
            <tbody>
              ${(booking.nightlyRates || []).map(r => `
                <tr>
                  <td>${r.date}</td>
                  <td>${r.dayName}</td>
                  <td>${r.isWeekend ? '<b style="color: #d97706;">Cuối tuần</b>' : 'Ngày thường'}</td>
                  <td style="text-align: right;">${Number(r.rate).toLocaleString('vi-VN')} đ</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          ${(booking.services && booking.services.length) ? `
            <h3>Dịch Vụ Phát Sinh</h3>
            <table>
              <thead>
                <tr><th>Dịch vụ</th><th>Số lượng</th><th style="text-align: right;">Đơn giá</th><th style="text-align: right;">Thành tiền</th></tr>
              </thead>
              <tbody>
                ${booking.services.map(s => `
                  <tr>
                    <td>${s.name}</td>
                    <td>${s.qty || 1}</td>
                    <td style="text-align: right;">${Number(s.price).toLocaleString('vi-VN')} đ</td>
                    <td style="text-align: right; font-weight: bold;">${Number(s.total || s.price * s.qty).toLocaleString('vi-VN')} đ</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}

          <div class="total-box">
            <div class="total-row"><span>Tiền phòng:</span><span>${Number(booking.roomTotal || 0).toLocaleString('vi-VN')} đ</span></div>
            <div class="total-row"><span>Tiền dịch vụ:</span><span>${Number(booking.servicesTotal || 0).toLocaleString('vi-VN')} đ</span></div>
            <div class="total-row grand"><span>Tổng thanh toán:</span><span>${Number(booking.grandTotal || 0).toLocaleString('vi-VN')} đ</span></div>
            <div class="total-row" style="color: #059669;"><span>Đã đặt cọc/trả:</span><span>${Number(booking.paid || 0).toLocaleString('vi-VN')} đ</span></div>
            <div class="total-row" style="color: #dc2626; font-weight: bold;"><span>Còn phải thu:</span><span>${Number(booking.balance || 0).toLocaleString('vi-VN')} đ</span></div>
          </div>

          <div class="footer-note">
            <p>Cảm ơn quý khách đã tin tưởng và lựa chọn kỳ nghỉ tại ${settings.legalName || 'GSHEETS HOME'}!</p>
            <p>Vui lòng xuất trình phiếu này hoặc cung cấp mã đặt phòng khi làm thủ tục nhận phòng.</p>
          </div>
        </div>
      </body>
      </html>
      `;
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(voucherHtml);
    }

    return sendJson(res, 404, { error: 'API endpoint không tồn tại' });
  }

  // 12. STATIC FILES SERVING (SPA)
  let reqPath = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
  let filePath = path.join(PUBLIC_DIR, reqPath);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`Lỗi đọc tập tin: ${err.message}`);
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      res.end(content);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🔒 GSHEETS HOME v1.0 [SECURE RBAC] đang chạy!`);
  console.log(`📍 Webapp: http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});
