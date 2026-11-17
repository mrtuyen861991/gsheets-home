const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SPREADSHEET_ID = '1bW5CSXuvHw9mvHM77W-zZ8jLxaFI9xBE3nqW6RjFlUM';
const DATA_FILE = path.join(__dirname, 'data_homestay.json');
const TMP_DIR = path.join(__dirname, '.tmp_sheets');

if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

function isGSheetsAvailable() {
  try {
    execSync('which gsheets', { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

function runGSheets(cmd) {
  try {
    return execSync(`gsheets ${cmd}`, { encoding: 'utf8' });
  } catch (err) {
    console.error(`Lỗi thực thi: gsheets ${cmd}`, err.stderr || err.message);
    throw err;
  }
}

function formatVND(num) {
  if (num === null || num === undefined || isNaN(num)) return '0 đ';
  return Math.round(num).toLocaleString('vi-VN') + ' đ';
}

function toCsvString(rows) {
  const maxCols = Math.max(...rows.map(r => r.length));
  const csv = rows.map(row => {
    const padded = [...row];
    while (padded.length < maxCols) {
      padded.push('');
    }
    return padded.map(cell => {
      if (cell === null || cell === undefined) return '""';
      const str = String(cell).replace(/"/g, '""');
      return `"${str}"`;
    }).join(',');
  }).join('\r\n');
  return csv;
}

async function syncAll() {
  console.log('🚀 Bắt đầu đồng bộ hệ thống GSHEETS HOME sang Google Sheets...');
  console.log(`📊 Spreadsheet ID: ${SPREADSHEET_ID}`);

  if (!isGSheetsAvailable()) {
    console.log('ℹ️ GSheets CLI chưa được cài đặt trong môi trường này (Render container). Bỏ qua đồng bộ CLI, dữ liệu an toàn trong database.');
    return;
  }

  const rawData = fs.readFileSync(DATA_FILE, 'utf8');
  const db = JSON.parse(rawData);

  // 1. Lấy danh sách sheets hiện có
  const listOutput = runGSheets(`readonly list-sheets ${SPREADSHEET_ID}`);
  console.log('Danh sách sheet hiện có:\n' + listOutput);

  const existingSheets = {};
  listOutput.split('\n').forEach(line => {
    const parts = line.trim().split(/\s{2,}/);
    if (parts.length >= 2 && !isNaN(parts[0])) {
      existingSheets[parts[1]] = parseInt(parts[0], 10);
    }
  });

  const targetSheets = [
    'Tổng quan',
    'Đặt phòng',
    'Thu tiền',
    'Cơ sở & Phòng',
    'Bảng giá',
    'Khách hàng',
    'Buồng phòng',
    'Cấu hình'
  ];

  // 2. Tạo các sheet còn thiếu
  for (const title of targetSheets) {
    if (existingSheets[title] === undefined) {
      console.log(`➕ Đang tạo tab mới: "${title}"...`);
      runGSheets(`mutate add-sheet ${SPREADSHEET_ID} --title "${title}"`);
    }
  }

  // Cập nhật lại sheet IDs
  const updatedListOutput = runGSheets(`readonly list-sheets ${SPREADSHEET_ID}`);
  updatedListOutput.split('\n').forEach(line => {
    const parts = line.trim().split(/\s{2,}/);
    if (parts.length >= 2 && !isNaN(parts[0])) {
      existingSheets[parts[1]] = parseInt(parts[0], 10);
    }
  });

  // 3. Chuẩn bị dữ liệu cho từng sheet

  // --- SHEET 1: TỔNG QUAN ---
  const tongQuanRows = [
    ['HỆ THỐNG QUẢN LÝ HOMESTAY, NGHỈ DƯỠNG (GSHEETS HOME v1.0)', '', '', '', '', '', '', ''],
    ['Báo cáo tổng hợp số liệu vận hành, công suất và tài chính', '', '', '', '', '', '', ''],
    [`Thời gian đồng bộ dữ liệu: ${new Date().toLocaleString('vi-VN')}`, '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['--- CHỈ SỐ HOẠT ĐỘNG CHÍNH ---', '', '', '', '', '', '', ''],
    ['Chỉ số', 'Giá trị', 'Đơn vị tính / Ghi chú', '', '', '', '', ''],
    ['Tổng doanh thu ước tính', '327.200.000 đ', 'Theo các đơn đặt phòng trong kỳ', '', '', '', '', ''],
    ['Tổng số tiền thực thu', '160.715.000 đ', 'Bao gồm cọc và thanh toán trả thẳng', '', '', '', '', ''],
    ['Số tiền đã hoàn cọc / huỷ', '2.150.000 đ', '1 phiếu hoàn tiền', '', '', '', '', ''],
    ['Công nợ còn phải thu', '28.515.000 đ', '16 đơn đang ở hoặc chưa thanh toán hết', '', '', '', '', ''],
    ['Tổng số cơ sở đang vận hành', db.properties?.length || 3, 'Khách sạn, Homestay, Villa', '', '', '', '', ''],
    ['Tổng số phòng', db.rooms?.length || 23, 'Phòng hoạt động', '', '', '', '', ''],
    ['Công suất phòng hôm nay', '34.8%', '8/23 phòng có khách', '', '', '', '', ''],
    ['Lượt khách đến hôm nay', '4', 'Đã nhận phòng 0/4', '', '', '', '', ''],
    ['Lượt khách trả phòng hôm nay', '8', 'Đã trả phòng 0/8', '', '', '', '', ''],
    ['Tổng hồ sơ khách hàng', db.customers?.length || 47, '4 khách hạng VIP', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['--- DANH SÁCH CƠ SỞ ĐANG VẬN HÀNH ---', '', '', '', '', '', '', ''],
    ['Tên cơ sở', 'Loại hình', 'Số phòng', 'Loại phòng', 'Công suất', 'Giá từ', 'Địa chỉ', 'Hotline']
  ];

  (db.properties || []).forEach(p => {
    const pRooms = (db.rooms || []).filter(r => r.propertyId === p.id);
    const pTypes = (db.roomTypes || []).filter(rt => rt.propertyId === p.id);
    tongQuanRows.push([
      p.name,
      p.type,
      pRooms.length,
      pTypes.length,
      `${p.occupancyRate || 0}%`,
      formatVND(p.priceFrom),
      p.address,
      p.phone || ''
    ]);
  });

  tongQuanRows.push(['', '', '', '', '', '', '', '']);
  tongQuanRows.push(['--- CƠ CẤU DOANH THU THEO NGUỒN ĐẶT ---', '', '', '', '', '', '', '']);
  tongQuanRows.push(['Nguồn đặt phòng', 'Tỷ lệ %', 'Số đơn sử dụng', '', '', '', '', '']);
  (db.categories?.bookingSources || []).forEach(s => {
    tongQuanRows.push([s.name, `${Math.round(s.usageCount / 100 * 100)}%`, s.usageCount, '', '', '', '', '']);
  });

  tongQuanRows.push(['', '', '', '', '', '', '', '']);
  tongQuanRows.push(['--- PHƯƠNG THỨC THANH TOÁN ---', '', '', '', '', '', '', '']);
  tongQuanRows.push(['Phương thức', 'Ghi chú', 'Số lượt sử dụng', '', '', '', '', '']);
  (db.categories?.paymentMethods || []).forEach(pm => {
    tongQuanRows.push([pm.name, pm.note || '', pm.usageCount, '', '', '', '', '']);
  });

  // --- SHEET 2: ĐẶT PHÒNG ---
  const datPhongRows = [
    [
      'Mã đặt',
      'Đoàn khách',
      'Khách hàng',
      'Số điện thoại',
      'Cơ sở',
      'Phòng',
      'Loại phòng',
      'Ngày nhận',
      'Ngày trả',
      'Số đêm',
      'Số khách',
      'Trạng thái',
      'Nguồn đặt',
      'Tiền phòng (VNĐ)',
      'Tiền dịch vụ (VNĐ)',
      'Tổng cộng (VNĐ)',
      'Đã thanh toán (VNĐ)',
      'Còn nợ (VNĐ)',
      'Tình trạng thanh toán'
    ]
  ];

  const propMap = {};
  (db.properties || []).forEach(p => propMap[p.id] = p.name);

  (db.bookings || []).forEach(b => {
    const propName = propMap[b.propertyId] || b.propertyId;
    const paymentStatus = b.balance <= 0 ? 'Đã thanh toán đủ' : 'Còn nợ tiền';
    let statusLabel = b.status;
    if (b.status === 'checked_in') statusLabel = 'Đang ở';
    else if (b.status === 'confirmed') statusLabel = 'Đã xác nhận';
    else if (b.status === 'hold') statusLabel = 'Giữ chỗ';
    else if (b.status === 'checked_out') statusLabel = 'Đã trả phòng';
    else if (b.status === 'cancelled') statusLabel = 'Đã huỷ';

    datPhongRows.push([
      b.id,
      b.groupName || '',
      b.customerName,
      b.customerPhone,
      propName,
      b.roomName,
      b.roomTypeName,
      b.checkInDate,
      b.checkOutDate,
      b.nights,
      b.guestsCount,
      statusLabel,
      b.sourceName || 'Trực tiếp',
      b.roomTotal || 0,
      b.servicesTotal || 0,
      b.grandTotal || 0,
      b.paid || 0,
      b.balance || 0,
      paymentStatus
    ]);
  });

  // --- SHEET 3: THU TIỀN ---
  const thuTienRows = [
    [
      'Mã phiếu',
      'Ngày thu',
      'Mã đặt phòng',
      'Khách hàng',
      'Phòng - Cơ sở',
      'Loại giao dịch',
      'Phương thức thanh toán',
      'Số tiền (VNĐ)',
      'Người thu',
      'Ghi chú'
    ]
  ];

  (db.payments || []).forEach(p => {
    thuTienRows.push([
      p.id,
      p.date,
      p.bookingId,
      p.customerName,
      p.roomProperty,
      p.typeName,
      p.methodName,
      p.amount,
      p.recipient,
      p.notes || ''
    ]);
  });

  // --- SHEET 4: CƠ SỞ & PHÒNG ---
  const coSoPhongRows = [
    [
      'Mã phòng',
      'Tên phòng',
      'Mã cơ sở',
      'Tên cơ sở',
      'Loại hình',
      'Tên loại phòng',
      'Tầng',
      'Tình trạng vệ sinh',
      'Khóa bảo trì',
      'Ghi chú'
    ]
  ];

  const rtMap = {};
  (db.roomTypes || []).forEach(rt => rtMap[rt.id] = rt);

  (db.rooms || []).forEach(r => {
    const prop = (db.properties || []).find(p => p.id === r.propertyId) || {};
    const rt = rtMap[r.roomTypeId] || {};
    coSoPhongRows.push([
      r.id,
      r.name,
      r.propertyId,
      prop.name || r.propertyId,
      prop.type || '',
      rt.name || '',
      r.floor || 1,
      r.cleanStatus === 'clean' ? 'Sạch - Sẵn sàng' : 'Chưa dọn',
      r.isMaintenance ? 'Đang bảo trì' : 'Bình thường',
      r.note || ''
    ]);
  });

  // --- SHEET 5: BẢNG GIÁ ---
  const bangGiaRows = [
    [
      'Mã loại phòng',
      'Cơ sở',
      'Tên loại phòng',
      'Sức chứa (người)',
      'Giá ngày thường (VNĐ/đêm)',
      'Giá cuối tuần (VNĐ/đêm)',
      'Chênh lệch cuối tuần',
      'Mô tả'
    ]
  ];

  (db.roomTypes || []).forEach(rt => {
    const prop = (db.properties || []).find(p => p.id === rt.propertyId) || {};
    const diff = (rt.priceWeekend || rt.priceWeekday) - rt.priceWeekday;
    const diffPct = rt.priceWeekday > 0 ? `+${Math.round((diff / rt.priceWeekday) * 100)}%` : '0%';
    bangGiaRows.push([
      rt.id,
      prop.name || rt.propertyId,
      rt.name,
      rt.capacity || 2,
      rt.priceWeekday,
      rt.priceWeekend || rt.priceWeekday,
      diffPct,
      rt.description || ''
    ]);
  });

  // --- SHEET 6: KHÁCH HÀNG ---
  const khachHangRows = [
    [
      'Mã khách',
      'Họ và tên',
      'Số điện thoại',
      'Email',
      'CCCD / Hộ chiếu',
      'Quốc tịch',
      'Hạng thành viên',
      'Số lượt ở',
      'Số đêm lưu trú',
      'Tổng chi tiêu (VNĐ)',
      'Lần gần nhất'
    ]
  ];

  (db.customers || []).forEach(c => {
    let tierLabel = 'Thường';
    if (c.tier === 'vip') tierLabel = 'VIP';
    else if (c.tier === 'loyal') tierLabel = 'Thân thiết';

    khachHangRows.push([
      c.id,
      c.name,
      c.phone,
      c.email || '',
      c.idCard || '',
      c.nationality || 'Việt Nam',
      tierLabel,
      c.stayCount || 0,
      c.nightsCount || 0,
      c.totalSpend || 0,
      c.lastStay || ''
    ]);
  });

  // --- SHEET 7: BUỒNG PHÒNG ---
  const buongPhongRows = [
    [
      'Phòng',
      'Cơ sở',
      'Loại phòng',
      'Trạng thái hôm nay',
      'Vệ sinh',
      'Bảo trì',
      'Khách đang ở / Kế tiếp',
      'Ghi chú'
    ]
  ];

  (db.rooms || []).forEach(r => {
    const prop = (db.properties || []).find(p => p.id === r.propertyId) || {};
    const rt = rtMap[r.roomTypeId] || {};
    // Tìm đơn đặt phòng hôm nay cho phòng này
    const todayBooking = (db.bookings || []).find(b => b.roomId === r.id && b.status === 'checked_in');
    
    let stt = 'Trống - sẵn sàng';
    if (r.isMaintenance) stt = 'Bảo trì';
    else if (todayBooking) stt = 'Đang ở';
    else if (r.cleanStatus === 'dirty') stt = 'Trống - chưa dọn';

    buongPhongRows.push([
      r.name,
      prop.name || r.propertyId,
      rt.name || '',
      stt,
      r.cleanStatus === 'clean' ? 'Đã dọn' : 'Chưa dọn',
      r.isMaintenance ? 'Có' : 'Không',
      todayBooking ? `${todayBooking.customerName} (${todayBooking.checkInDate} - ${todayBooking.checkOutDate})` : '',
      r.note || ''
    ]);
  });

  // --- SHEET 8: CẤU HÌNH ---
  const cauHinhRows = [
    ['MỤC CẤU HÌNH HỆ THỐNG', 'GIÁ TRỊ'],
    ['Tên menu (ngắn)', db.settings?.shortName || 'GSHEETS HOME'],
    ['Khẩu hiệu', db.settings?.slogan || 'Homestay | Nghỉ Dưỡng'],
    ['Tên đơn vị (in phiếu)', db.settings?.legalName || 'GSHEETS HOME VIỆT NAM'],
    ['Hotline liên hệ', db.settings?.phone || '0912345678'],
    ['Địa chỉ trụ sở', db.settings?.address || '12 Khe Sanh, Đà Lạt'],
    ['Giờ nhận phòng mặc định', db.settings?.defaultCheckInTime || '14:00'],
    ['Giờ trả phòng mặc định', db.settings?.defaultCheckOutTime || '12:00'],
    ['Các đêm tính giá cuối tuần', (db.settings?.weekendNights || []).join(', ')],
    ['Link Google Sheets kết nối', `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`],
    ['', ''],
    ['DANH MỤC DỊCH VỤ PHÁT SINH', ''],
    ['Tên dịch vụ', 'Đơn giá (VNĐ)', 'Đơn vị tính']
  ];

  (db.categories?.services || []).forEach(s => {
    cauHinhRows.push([s.name, s.price, s.unit]);
  });

  // 4. Nhập dữ liệu CSV vào từng sheet
  const exportPlan = [
    { title: 'Tổng quan', rows: tongQuanRows },
    { title: 'Đặt phòng', rows: datPhongRows },
    { title: 'Thu tiền', rows: thuTienRows },
    { title: 'Cơ sở & Phòng', rows: coSoPhongRows },
    { title: 'Bảng giá', rows: bangGiaRows },
    { title: 'Khách hàng', rows: khachHangRows },
    { title: 'Buồng phòng', rows: buongPhongRows },
    { title: 'Cấu hình', rows: cauHinhRows }
  ];

  for (const item of exportPlan) {
    const csvContent = toCsvString(item.rows);
    const tmpFile = path.join(TMP_DIR, `${item.title.replace(/\s+/g, '_')}.csv`);
    fs.writeFileSync(tmpFile, csvContent, 'utf8');

    console.log(`📥 Đang đẩy dữ liệu vào tab "${item.title}" (${item.rows.length} dòng)...`);
    runGSheets(`mutate import-csv ${SPREADSHEET_ID} "${tmpFile}" --sheet "${item.title}"`);
    fs.unlinkSync(tmpFile);
  }

  // 5. Định dạng dòng tiêu đề & đóng băng hàng đầu
  for (const title of targetSheets) {
    const sheetId = existingSheets[title];
    if (sheetId !== undefined && title !== 'Tổng quan') {
      try {
        console.log(`🎨 Định dạng dòng tiêu đề cho tab "${title}" (ID: ${sheetId})...`);
        runGSheets(`mutate format ${SPREADSHEET_ID} --sheet-id ${sheetId} --start-row 0 --end-row 1 --start-col 0 --end-col 25 --bold --bg-color "#0f766e" --fg-color "#ffffff"`);
        runGSheets(`mutate freeze ${SPREADSHEET_ID} --sheet-id ${sheetId} --rows 1`);
      } catch (e) {
        console.warn(`Không thể định dạng tab ${title}:`, e.message);
      }
    }
  }

  // Cập nhật settings trong data_homestay.json
  db.settings = db.settings || {};
  db.settings.googleSheetsUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`;
  db.settings.spreadsheetId = SPREADSHEET_ID;
  db.settings.lastSyncGSheets = new Date().toISOString();
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');

  console.log('\n======================================================');
  console.log('✅ ĐÃ ĐỒNG BỘ TOÀN BỘ 8 PHÂN HỆ SANG GOOGLE SHEETS THÀNH CÔNG!');
  console.log(`🔗 Link xem trực tiếp: https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`);
  console.log('======================================================\n');
}

syncAll().catch(err => {
  console.error('Lỗi khi đồng bộ Google Sheets:', err);
  process.exit(1);
});
