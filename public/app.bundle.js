/**
 * GSHEETS HOME - Quản lý Homestay & Nghỉ Dưỡng
 * Pre-compiled Client Bundle (Babel Classic Runtime)
 * Generated at: 2026-11-18T03:04:31.299Z
 * Load time: < 30ms (zero in-browser Babel overhead)
 */
const {
  useState,
  useEffect,
  useMemo,
  useRef
} = React;

// Helper: Format currency to VND
const formatVND = num => {
  if (num === null || num === undefined || isNaN(num)) return '0 đ';
  return Math.round(num).toLocaleString('vi-VN') + ' đ';
};

// Helper: Authenticated fetch wrapper (auto includes Bearer token)
const authFetch = (url, options = {}) => {
  const token = localStorage.getItem('gsheets_home_token');
  const headers = {
    ...(options.headers || {}),
    ...(token ? {
      'Authorization': `Bearer ${token}`
    } : {})
  };
  return fetch(url, {
    ...options,
    headers
  });
};

// Main App Component
function App() {
  // 1. App Authentication State
  const [token, setToken] = useState(() => localStorage.getItem('gsheets_home_token') || null);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('gsheets_home_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // App Data State
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState('all');
  const [globalSearch, setGlobalSearch] = useState('');
  const [toast, setToast] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [syncingGSheets, setSyncingGSheets] = useState(false);

  // Modals
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);
  const [showGroupBookingModal, setShowGroupBookingModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState(null);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [selectedBookingForVoucher, setSelectedBookingForVoucher] = useState(null);
  const [selectedBookingDetail, setSelectedBookingDetail] = useState(null);
  const [bookingModalInitialData, setBookingModalInitialData] = useState(null);

  // Toast Notification
  const showToast = (message, type = 'success') => {
    setToast({
      message,
      type
    });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch bootstrap data with token
  const refreshData = async (activeToken = token) => {
    if (!activeToken) {
      setLoading(false);
      setData(null);
      setCurrentUser(null);
      return;
    }
    try {
      const res = await authFetch('/api/bootstrap');
      if (res.status === 401 || res.status === 403) {
        // Unauthorized or token expired
        localStorage.removeItem('gsheets_home_token');
        localStorage.removeItem('gsheets_home_user');
        setToken(null);
        setCurrentUser(null);
        setData(null);
        setLoading(false);
        return;
      }
      const json = await res.json();
      setData(json);
      if (json.currentUser) {
        setCurrentUser(json.currentUser);
        localStorage.setItem('gsheets_home_user', JSON.stringify(json.currentUser));
        // Auto lock filter if scoped
        if (json.currentUser.propertyScope && json.currentUser.propertyScope !== 'all') {
          setSelectedPropertyFilter(json.currentUser.propertyScope);
        }
      }
      setLoading(false);
    } catch (err) {
      console.error('Fetch error:', err);
      showToast('Lỗi tải dữ liệu: ' + err.message, 'error');
      setLoading(false);
    }
  };
  useEffect(() => {
    refreshData();
  }, [token]);

  // Logout handler
  const handleLogout = async () => {
    try {
      await authFetch('/api/auth/logout', {
        method: 'POST'
      });
    } catch (e) {}
    localStorage.removeItem('gsheets_home_token');
    localStorage.removeItem('gsheets_home_user');
    setToken(null);
    setCurrentUser(null);
    setData(null);
    setUserMenuOpen(false);
    showToast('🚪 Đã đăng xuất an toàn khỏi hệ thống!');
  };

  // Login success handler
  const handleLoginSuccess = (newToken, newUser) => {
    localStorage.setItem('gsheets_home_token', newToken);
    localStorage.setItem('gsheets_home_user', JSON.stringify(newUser));
    setToken(newToken);
    setCurrentUser(newUser);
    showToast(`🎉 Xin chào, ${newUser.name}! Chúc bạn một ngày làm việc hiệu quả.`);
    refreshData(newToken);
  };

  // Check permission helper (Role Based Access Control)
  const hasPermission = (moduleName, action = 'view') => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    const modPerm = currentUser.permissions && currentUser.permissions[moduleName];
    if (!modPerm) return false;
    return !!modPerm[action];
  };

  // Filtered properties based on user scope
  const userAllowedProperties = useMemo(() => {
    if (!data || !data.properties) return [];
    if (!currentUser || currentUser.propertyScope === 'all') {
      return data.properties;
    }
    return data.properties.filter(p => p.id === currentUser.propertyScope);
  }, [data, currentUser]);

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    if (!data || !data.rooms) return [];
    let list = data.rooms;
    if (currentUser && currentUser.propertyScope !== 'all') {
      list = list.filter(r => r.propertyId === currentUser.propertyScope);
    }
    if (selectedPropertyFilter !== 'all') {
      list = list.filter(r => r.propertyId === selectedPropertyFilter);
    }
    return list;
  }, [data, currentUser, selectedPropertyFilter]);

  // Filtered bookings
  const filteredBookings = useMemo(() => {
    if (!data || !data.bookings) return [];
    let list = data.bookings;
    if (currentUser && currentUser.propertyScope !== 'all') {
      list = list.filter(b => b.propertyId === currentUser.propertyScope);
    }
    if (selectedPropertyFilter !== 'all') {
      list = list.filter(b => b.propertyId === selectedPropertyFilter);
    }
    if (globalSearch.trim()) {
      const q = globalSearch.toLowerCase().trim();
      list = list.filter(b => b.id && b.id.toLowerCase().includes(q) || b.customerName && b.customerName.toLowerCase().includes(q) || b.customerPhone && b.customerPhone.includes(q) || b.roomName && b.roomName.toLowerCase().includes(q));
    }
    return list;
  }, [data, currentUser, selectedPropertyFilter, globalSearch]);

  // 1-touch Check-in
  const handleCheckIn = async bookingId => {
    try {
      const res = await authFetch(`/api/bookings/${bookingId}/checkin`, {
        method: 'POST'
      });
      if (res.ok) {
        showToast('✅ Đã nhận phòng thành công!');
        refreshData();
      }
    } catch (e) {
      showToast('Lỗi nhận phòng: ' + e.message, 'error');
    }
  };

  // 1-touch Check-out
  const handleCheckOut = async bookingId => {
    try {
      const res = await authFetch(`/api/bookings/${bookingId}/checkout`, {
        method: 'POST'
      });
      if (res.ok) {
        showToast('✅ Đã trả phòng thành công! Phòng đã được gắn nhãn Cần dọn dẹp.');
        refreshData();
      }
    } catch (e) {
      showToast('Lỗi trả phòng: ' + e.message, 'error');
    }
  };

  // Clean all rooms in 1 click
  const handleCleanAll = async () => {
    try {
      const res = await authFetch('/api/rooms/clean-all', {
        method: 'POST'
      });
      const json = await res.json();
      showToast(`🧹 Đã dọn dẹp tất cả ${json.cleanedCount || 0} phòng bẩn thành phòng sạch!`);
      refreshData();
    } catch (e) {
      showToast('Lỗi: ' + e.message, 'error');
    }
  };

  // Sync Google Sheets
  const handleSyncGoogleSheets = async () => {
    setSyncingGSheets(true);
    try {
      const res = await authFetch('/api/sync/gsheets', {
        method: 'POST'
      });
      const json = await res.json();
      setSyncingGSheets(false);
      showToast('📊 ' + json.message);
    } catch (e) {
      setSyncingGSheets(false);
      showToast('Lỗi đồng bộ Google Sheets: ' + e.message, 'error');
    }
  };

  // Open new booking modal from calendar drag / select
  const handleOpenBookingWithRange = (roomId, checkInDate, checkOutDate) => {
    const room = (data?.rooms || []).find(r => r.id === roomId);
    setBookingModalInitialData({
      roomId,
      propertyId: room ? room.propertyId : '',
      checkInDate,
      checkOutDate
    });
    setShowNewBookingModal(true);
  };

  // ==========================================
  // SECURITY GATE: BẮT BUỘC ĐĂNG NHẬP
  // ==========================================
  if (!token || !currentUser) {
    return /*#__PURE__*/React.createElement(FullLoginGate, {
      onLoginSuccess: handleLoginSuccess
    });
  }
  if (loading) {
    return /*#__PURE__*/React.createElement("div", {
      className: "flex flex-col items-center justify-center min-h-screen bg-slate-50"
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"
    }), /*#__PURE__*/React.createElement("p", {
      className: "mt-4 font-bold text-teal-800 text-lg"
    }, "Đang xác thực bảo mật & tải GSHEETS HOME..."), /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-slate-400"
    }, "Đăng nhập bởi: ", currentUser?.name));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "flex min-h-screen bg-[#f8fafc]"
  }, toast && /*#__PURE__*/React.createElement("div", {
    className: `fixed bottom-20 right-4 sm:top-5 sm:bottom-auto z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-white text-sm font-semibold transition-all transform animate-bounce ${toast.type === 'error' ? 'bg-rose-600' : 'bg-teal-700'}`
  }, /*#__PURE__*/React.createElement("span", null, toast.message)), /*#__PURE__*/React.createElement("aside", {
    className: "hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 shrink-0 select-none"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-5 border-b border-slate-100 flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white text-xl shadow-md shadow-teal-500/20"
  }, "🏡"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "font-extrabold text-base tracking-tight text-slate-900"
  }, "GSHEETS HOME"), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] font-medium text-slate-400"
  }, "Homestay | Nghỉ Dưỡng"))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto px-3 py-4 space-y-6"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "px-3 mb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400"
  }, "VẬN HÀNH"), /*#__PURE__*/React.createElement("nav", {
    className: "space-y-1"
  }, [{
    id: 'dashboard',
    label: 'Tổng quan',
    icon: '🟢',
    show: true
  }, {
    id: 'calendar',
    label: 'Lịch phòng',
    icon: '📅',
    show: hasPermission('booking')
  }, {
    id: 'bookings',
    label: 'Đặt phòng',
    icon: '📝',
    show: hasPermission('booking')
  }, {
    id: 'housekeeping',
    label: 'Buồng phòng',
    icon: '🧹',
    show: hasPermission('housekeeping')
  }, {
    id: 'payments',
    label: 'Thu tiền',
    icon: '💵',
    show: hasPermission('payment')
  }].filter(i => i.show).map(item => /*#__PURE__*/React.createElement("button", {
    key: item.id,
    onClick: () => setCurrentScreen(item.id),
    className: `w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold text-xs transition ${currentScreen === item.id ? 'bg-teal-50 text-teal-800 shadow-sm border border-teal-100/60 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-2.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-base"
  }, item.icon), item.label), currentScreen === item.id && /*#__PURE__*/React.createElement("span", {
    className: "w-1.5 h-1.5 rounded-full bg-teal-600"
  }))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "px-3 mb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400"
  }, "KHÁCH & SỐ LIỆU"), /*#__PURE__*/React.createElement("nav", {
    className: "space-y-1"
  }, [{
    id: 'customers',
    label: 'Khách hàng',
    icon: '👥',
    show: hasPermission('customer')
  }, {
    id: 'reports',
    label: 'Báo cáo doanh thu',
    icon: '📊',
    show: hasPermission('reports')
  }].filter(i => i.show).map(item => /*#__PURE__*/React.createElement("button", {
    key: item.id,
    onClick: () => setCurrentScreen(item.id),
    className: `w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold text-xs transition ${currentScreen === item.id ? 'bg-teal-50 text-teal-800 shadow-sm border border-teal-100/60 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-2.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-base"
  }, item.icon), item.label), currentScreen === item.id && /*#__PURE__*/React.createElement("span", {
    className: "w-1.5 h-1.5 rounded-full bg-teal-600"
  }))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "px-3 mb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400"
  }, "HỆ THỐNG"), /*#__PURE__*/React.createElement("nav", {
    className: "space-y-1"
  }, [{
    id: 'properties',
    label: 'Cơ sở & phòng',
    icon: '🏨',
    show: hasPermission('property')
  }, {
    id: 'users',
    label: 'Người dùng & Quyền',
    icon: '👤',
    show: currentUser?.role === 'admin'
  }, {
    id: 'settings',
    label: 'Cài đặt hệ thống',
    icon: '⚙️',
    show: currentUser?.role === 'admin'
  }, {
    id: 'guide',
    label: 'Hướng dẫn sử dụng',
    icon: '❓',
    show: true
  }].filter(i => i.show).map(item => /*#__PURE__*/React.createElement("button", {
    key: item.id,
    onClick: () => setCurrentScreen(item.id),
    className: `w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold text-xs transition ${currentScreen === item.id ? 'bg-teal-50 text-teal-800 shadow-sm border border-teal-100/60 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-2.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-base"
  }, item.icon), item.label), currentScreen === item.id && /*#__PURE__*/React.createElement("span", {
    className: "w-1.5 h-1.5 rounded-full bg-teal-600"
  })))))), /*#__PURE__*/React.createElement("div", {
    className: "p-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "font-bold text-slate-700"
  }, currentUser?.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-teal-700 font-semibold"
  }, currentUser?.roleLabel)), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-mono font-bold"
  }, "🔒 An toàn"))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 flex flex-col min-w-0 pb-16 lg:pb-0"
  }, /*#__PURE__*/React.createElement("header", {
    className: "sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 h-16 flex items-center justify-between gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "font-bold text-base sm:text-lg text-slate-900 capitalize flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lg:hidden text-lg"
  }, "🏡"), currentScreen === 'dashboard' && 'Tổng quan hôm nay', currentScreen === 'calendar' && 'Lịch phòng', currentScreen === 'bookings' && 'Quản lý Đặt phòng', currentScreen === 'housekeeping' && 'Buồng phòng', currentScreen === 'payments' && 'Sổ quỹ Thu tiền', currentScreen === 'customers' && 'Hồ sơ Khách hàng', currentScreen === 'reports' && 'Báo cáo doanh thu', currentScreen === 'properties' && 'Cơ sở & Loại phòng', currentScreen === 'users' && 'Người dùng & Phân quyền', currentScreen === 'settings' && 'Cài đặt hệ thống', currentScreen === 'guide' && 'Hướng dẫn sử dụng')), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 sm:gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative hidden md:block w-64 lg:w-72"
  }, /*#__PURE__*/React.createElement("span", {
    className: "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-sm"
  }, "🔍"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: globalSearch,
    onChange: e => setGlobalSearch(e.target.value),
    placeholder: "Tìm đơn, khách, phòng... (Ctrl+K)",
    className: "w-full pl-9 pr-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 focus:bg-white text-xs border border-transparent focus:border-teal-500 focus:outline-none transition"
  }), globalSearch && /*#__PURE__*/React.createElement("button", {
    onClick: () => setGlobalSearch(''),
    className: "absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400"
  }, "✕")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("a", {
    href: "https://docs.google.com/spreadsheets/d/1bW5CSXuvHw9mvHM77W-zZ8jLxaFI9xBE3nqW6RjFlUM/edit",
    target: "_blank",
    rel: "noreferrer",
    className: "hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 transition",
    title: "Mở Google Sheets trực tiếp trên Google Drive"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2 h-2 rounded-full bg-emerald-500 animate-pulse"
  }), /*#__PURE__*/React.createElement("span", null, "Google Sheets Live"), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-emerald-600"
  }, "↗")), /*#__PURE__*/React.createElement("button", {
    onClick: handleSyncGoogleSheets,
    disabled: syncingGSheets,
    className: "p-2 sm:px-3 sm:py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold border border-teal-200/90 flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50",
    title: "Nhấn để tự động đồng bộ 8 phân hệ sang Google Sheets"
  }, /*#__PURE__*/React.createElement("span", {
    className: syncingGSheets ? 'animate-spin inline-block' : ''
  }, "🔄"), /*#__PURE__*/React.createElement("span", {
    className: "hidden sm:inline"
  }, syncingGSheets ? 'Đang đồng bộ...' : 'Đồng bộ Sheets'))), /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setUserMenuOpen(!userMenuOpen),
    className: "flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-100 transition border border-transparent hover:border-slate-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-8 h-8 rounded-full bg-teal-700 text-white font-bold text-xs flex items-center justify-center uppercase shadow-sm"
  }, currentUser?.name ? currentUser.name.slice(0, 2) : 'AD'), /*#__PURE__*/React.createElement("div", {
    className: "hidden sm:block text-left text-xs"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-bold text-slate-800 leading-tight"
  }, currentUser?.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-slate-400"
  }, currentUser?.roleLabel)), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-slate-400"
  }, "▼")), userMenuOpen && /*#__PURE__*/React.createElement("div", {
    className: "absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 text-xs"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-2 border-b border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-bold text-slate-900"
  }, currentUser?.name), /*#__PURE__*/React.createElement("div", {
    className: "text-slate-400 text-[11px]"
  }, "Tài khoản: ", /*#__PURE__*/React.createElement("b", null, currentUser?.username)), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-teal-700 mt-1 font-semibold"
  }, "Phạm vi: ", currentUser?.propertyScopeLabel)), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setUserMenuOpen(false);
      setShowChangePasswordModal(true);
    },
    className: "w-full text-left px-4 py-2.5 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "🔑"), " Đổi mật khẩu"), currentUser?.role === 'admin' && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setUserMenuOpen(false);
      setCurrentScreen('settings');
    },
    className: "w-full text-left px-4 py-2.5 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "⚙️"), " Cài đặt hệ thống"), /*#__PURE__*/React.createElement("div", {
    className: "border-t border-slate-100 my-1"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: handleLogout,
    className: "w-full text-left px-4 py-2.5 hover:bg-rose-50 text-rose-600 font-bold flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "🚪"), " Đăng xuất an toàn"))))), /*#__PURE__*/React.createElement("main", {
    className: "flex-1 p-4 sm:p-6 overflow-x-hidden"
  }, ['dashboard', 'calendar', 'housekeeping', 'bookings'].includes(currentScreen) && /*#__PURE__*/React.createElement("div", {
    className: "mb-5 flex flex-wrap items-center justify-between gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 p-1 bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-x-auto max-w-full"
  }, currentUser?.propertyScope === 'all' && /*#__PURE__*/React.createElement("button", {
    onClick: () => setSelectedPropertyFilter('all'),
    className: `px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${selectedPropertyFilter === 'all' ? 'bg-teal-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`
  }, "🏨 Tất cả cơ sở"), userAllowedProperties.map(p => /*#__PURE__*/React.createElement("button", {
    key: p.id,
    onClick: () => setSelectedPropertyFilter(p.id),
    className: `px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${selectedPropertyFilter === p.id ? 'bg-teal-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`
  }, p.name))), hasPermission('booking', 'add') && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setBookingModalInitialData(null);
      setShowNewBookingModal(true);
    },
    className: "px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-md shadow-teal-700/20 flex items-center gap-1.5 transition active:scale-95"
  }, /*#__PURE__*/React.createElement("span", null, "➕ Đặt phòng mới")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowGroupBookingModal(true),
    className: "px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs shadow-sm flex items-center gap-1.5 transition active:scale-95"
  }, /*#__PURE__*/React.createElement("span", null, "👥 Đặt theo đoàn")))), currentScreen === 'dashboard' && /*#__PURE__*/React.createElement(DashboardScreen, {
    data: data,
    currentUser: currentUser,
    selectedPropertyFilter: selectedPropertyFilter,
    onNavigate: setCurrentScreen,
    onCheckIn: handleCheckIn,
    onCheckOut: handleCheckOut,
    onOpenNewBooking: () => setShowNewBookingModal(true)
  }), currentScreen === 'calendar' && /*#__PURE__*/React.createElement(CalendarTimelineScreen, {
    data: data,
    filteredRooms: filteredRooms,
    filteredBookings: filteredBookings,
    onSelectRange: handleOpenBookingWithRange,
    onViewBooking: b => setSelectedBookingDetail(b)
  }), currentScreen === 'bookings' && /*#__PURE__*/React.createElement(BookingsListScreen, {
    bookings: filteredBookings,
    data: data,
    onCheckIn: handleCheckIn,
    onCheckOut: handleCheckOut,
    onOpenNewBooking: () => setShowNewBookingModal(true),
    onOpenGroupBooking: () => setShowGroupBookingModal(true),
    onPrintVoucher: b => {
      setSelectedBookingForVoucher(b);
      setShowVoucherModal(true);
    },
    onViewDetail: b => setSelectedBookingDetail(b)
  }), currentScreen === 'housekeeping' && /*#__PURE__*/React.createElement(HousekeepingScreen, {
    data: data,
    rooms: filteredRooms,
    onCleanAll: handleCleanAll,
    onRefresh: refreshData,
    showToast: showToast
  }), currentScreen === 'payments' && /*#__PURE__*/React.createElement(PaymentsScreen, {
    data: data,
    onOpenNewPayment: () => setShowPaymentModal(true),
    showToast: showToast
  }), currentScreen === 'customers' && /*#__PURE__*/React.createElement(CustomersScreen, {
    data: data,
    onOpenNewCustomer: () => setShowCustomerModal(true),
    showToast: showToast
  }), currentScreen === 'reports' && hasPermission('reports') && /*#__PURE__*/React.createElement(ReportsScreen, {
    data: data,
    showToast: showToast
  }), currentScreen === 'properties' && /*#__PURE__*/React.createElement(PropertiesScreen, {
    data: data,
    currentUser: currentUser,
    hasPermission: hasPermission,
    onRefresh: refreshData,
    showToast: showToast
  }), currentScreen === 'users' && currentUser?.role === 'admin' && /*#__PURE__*/React.createElement(UsersScreen, {
    data: data,
    onOpenNewUser: () => {
      setSelectedUserForEdit(null);
      setShowUserModal(true);
    },
    onEditUser: user => {
      setSelectedUserForEdit(user);
      setShowUserModal(true);
    },
    onRefresh: refreshData,
    showToast: showToast
  }), currentScreen === 'settings' && currentUser?.role === 'admin' && /*#__PURE__*/React.createElement(SettingsScreen, {
    data: data,
    onRefresh: refreshData,
    showToast: showToast
  }), currentScreen === 'guide' && /*#__PURE__*/React.createElement(GuideScreen, {
    onNavigate: setCurrentScreen
  }))), /*#__PURE__*/React.createElement("nav", {
    className: "lg:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 px-2 py-1.5 flex items-center justify-around shadow-lg"
  }, [{
    id: 'dashboard',
    label: 'Tổng quan',
    icon: '🟢'
  }, {
    id: 'calendar',
    label: 'Lịch',
    icon: '📅'
  }, {
    id: 'bookings',
    label: 'Đặt phòng',
    icon: '➕'
  }, {
    id: 'housekeeping',
    label: 'Buồng',
    icon: '🧹'
  }, {
    id: 'more_menu',
    label: 'Tài khoản',
    icon: '👤'
  }].map(tab => /*#__PURE__*/React.createElement("button", {
    key: tab.id,
    onClick: () => {
      if (tab.id === 'more_menu') {
        setUserMenuOpen(true);
      } else {
        setCurrentScreen(tab.id);
      }
    },
    className: `flex flex-col items-center justify-center py-1 px-2 rounded-xl transition ${currentScreen === tab.id ? 'text-teal-700 font-extrabold scale-105' : 'text-slate-500 font-medium'}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-lg leading-none"
  }, tab.icon), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] mt-1"
  }, tab.label)))), showChangePasswordModal && /*#__PURE__*/React.createElement(ChangePasswordModal, {
    onClose: () => setShowChangePasswordModal(false),
    onSuccess: () => {
      setShowChangePasswordModal(false);
      showToast('🔑 Mật khẩu đã được thay đổi thành công!');
    }
  }), showNewBookingModal && /*#__PURE__*/React.createElement(NewBookingModal, {
    data: data,
    initialData: bookingModalInitialData,
    onClose: () => setShowNewBookingModal(false),
    onSuccess: () => {
      setShowNewBookingModal(false);
      refreshData();
      showToast('🎉 Đã tạo đơn đặt phòng thành công!');
    }
  }), showGroupBookingModal && /*#__PURE__*/React.createElement(GroupBookingModal, {
    data: data,
    onClose: () => setShowGroupBookingModal(false),
    onSuccess: () => {
      setShowGroupBookingModal(false);
      refreshData();
      showToast('🎉 Đã tạo đơn đặt đoàn thành công!');
    }
  }), selectedBookingDetail && /*#__PURE__*/React.createElement(BookingDetailModal, {
    booking: selectedBookingDetail,
    data: data,
    onClose: () => setSelectedBookingDetail(null),
    onCheckIn: () => {
      handleCheckIn(selectedBookingDetail.id);
      setSelectedBookingDetail(null);
    },
    onCheckOut: () => {
      handleCheckOut(selectedBookingDetail.id);
      setSelectedBookingDetail(null);
    },
    onPrintVoucher: () => {
      setSelectedBookingForVoucher(selectedBookingDetail);
      setSelectedBookingDetail(null);
      setShowVoucherModal(true);
    },
    onAddPayment: () => {
      setShowPaymentModal(true);
    }
  }), showVoucherModal && selectedBookingForVoucher && /*#__PURE__*/React.createElement(VoucherModal, {
    booking: selectedBookingForVoucher,
    data: data,
    onClose: () => setShowVoucherModal(false)
  }), showPaymentModal && /*#__PURE__*/React.createElement(PaymentModal, {
    data: data,
    initialBooking: selectedBookingDetail,
    onClose: () => setShowPaymentModal(false),
    onSuccess: () => {
      setShowPaymentModal(false);
      refreshData();
      showToast('💵 Đã ghi nhận phiếu thu thành công!');
    }
  }), showCustomerModal && /*#__PURE__*/React.createElement(CustomerModal, {
    onClose: () => setShowCustomerModal(false),
    onSuccess: () => {
      setShowCustomerModal(false);
      refreshData();
      showToast('👤 Đã thêm khách hàng thành công!');
    }
  }), showUserModal && /*#__PURE__*/React.createElement(UserModal, {
    data: data,
    initialUser: selectedUserForEdit,
    onClose: () => {
      setShowUserModal(false);
      setSelectedUserForEdit(null);
    },
    onSuccess: () => {
      setShowUserModal(false);
      setSelectedUserForEdit(null);
      refreshData();
      showToast('👤 Đã lưu thông tin người dùng & quyền hạn!');
    }
  }));
}

// ========================================================
// FULL LOGIN GATE: CỔNG ĐĂNG NHẬP BẢO MẬT BẮT BUỘC
// ========================================================
function FullLoginGate({
  onLoginSuccess
}) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const handleLogin = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username,
          password
        })
      });
      const json = await res.json();
      if (res.ok) {
        onLoginSuccess(json.token, json.user);
      } else {
        setError(json.error || 'Đăng nhập không thành công');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  const quickPickAccount = (u, p) => {
    setUsername(u);
    setPassword(p);
    setError('');
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "min-h-screen w-full flex items-center justify-center p-4 bg-slate-900 relative overflow-hidden",
    style: {
      backgroundImage: `radial-gradient(circle at 20% 20%, rgba(15, 118, 110, 0.4), transparent 45%), radial-gradient(circle at 80% 80%, rgba(13, 148, 136, 0.3), transparent 45%)`
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white/95 backdrop-blur-xl border border-white/20 rounded-3xl max-w-md w-full p-8 sm:p-10 shadow-2xl relative z-10 space-y-6 text-center"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-700 to-emerald-500 text-white text-3xl flex items-center justify-center mx-auto shadow-xl shadow-teal-700/30 mb-4 transform hover:scale-105 transition"
  }, "🏡"), /*#__PURE__*/React.createElement("h2", {
    className: "font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight"
  }, "Đăng nhập"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-500 mt-1"
  }, "Hệ thống Quản lý Homestay & Nghỉ Dưỡng (Bảo Mật)")), error && /*#__PURE__*/React.createElement("div", {
    className: "p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2 text-left animate-shake"
  }, /*#__PURE__*/React.createElement("span", null, "⚠️"), /*#__PURE__*/React.createElement("span", null, error)), /*#__PURE__*/React.createElement("form", {
    onSubmit: handleLogin,
    className: "space-y-4 text-left text-xs"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "font-bold text-slate-700 block mb-1.5"
  }, "Tài khoản đăng nhập"), /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("span", {
    className: "absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400"
  }, "👤"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    required: true,
    value: username,
    onChange: e => setUsername(e.target.value),
    placeholder: "admin",
    className: "w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600 font-bold text-slate-800 text-sm transition"
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "font-bold text-slate-700 block mb-1.5"
  }, "Mật khẩu"), /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("span", {
    className: "absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400"
  }, "🔒"), /*#__PURE__*/React.createElement("input", {
    type: showPassword ? 'text' : 'password',
    required: true,
    value: password,
    onChange: e => setPassword(e.target.value),
    placeholder: "••••••",
    className: "w-full pl-10 pr-10 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600 font-bold text-slate-800 text-sm transition"
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setShowPassword(!showPassword),
    className: "absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600",
    title: showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'
  }, showPassword ? '👁️' : '👁️‍🗨️'))), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    disabled: loading,
    className: "w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-700 to-emerald-600 hover:from-teal-800 hover:to-emerald-700 text-white font-extrabold text-sm shadow-xl shadow-teal-700/25 transition active:scale-95 flex items-center justify-center gap-2"
  }, loading ? /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
  }), "Đang xác thực...") : /*#__PURE__*/React.createElement("span", null, "➜ Đăng nhập hệ thống"))), /*#__PURE__*/React.createElement("div", {
    className: "pt-3 border-t border-slate-100 text-left space-y-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] font-bold uppercase tracking-wider text-slate-400 block"
  }, "Tài khoản mẫu thử nghiệm phân quyền:"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1.5"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => quickPickAccount('admin', '123'),
    className: "px-2.5 py-1 rounded-xl bg-teal-50 text-teal-800 font-bold text-[10px] hover:bg-teal-100 border border-teal-200/60"
  }, "👑 Admin (Chủ Homestay)"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => quickPickAccount('letan', '123'),
    className: "px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 font-bold text-[10px] hover:bg-slate-200"
  }, "👩‍💼 Lễ tân (Chỉ Mây Đà Lạt)"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => quickPickAccount('ketoan', '123'),
    className: "px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 font-bold text-[10px] hover:bg-slate-200"
  }, "📊 Kế toán"))), /*#__PURE__*/React.createElement("div", {
    className: "pt-2 text-[11px] text-slate-400 font-mono"
  }, "GSHEETS HOME · Phiên bản 1.0 (Bảo mật RBAC)")));
}

// ==========================================
// MODAL: CHANGE PASSWORD (ĐỔI MẬT KHẨU)
// ==========================================
function ChangePasswordModal({
  onClose,
  onSuccess
}) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    if (newPassword.length < 3) {
      setError('Mật khẩu mới phải có ít nhất 3 ký tự');
      return;
    }
    setSubmitting(true);
    try {
      const res = await authFetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          oldPassword,
          newPassword
        })
      });
      const json = await res.json();
      if (res.ok) {
        onSuccess();
      } else {
        setError(json.error || 'Không thể đổi mật khẩu');
      }
    } catch (e) {
      setError('Lỗi kết nối: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-xs"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between pb-3 border-b border-slate-100"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-extrabold text-base text-slate-900 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "🔑 Đổi Mật Khẩu Đăng Nhập")), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "p-1 rounded-xl hover:bg-slate-100 text-slate-400"
  }, "✕")), error && /*#__PURE__*/React.createElement("div", {
    className: "p-2.5 rounded-xl bg-rose-50 text-rose-700 font-bold"
  }, error), /*#__PURE__*/React.createElement("form", {
    onSubmit: handleSubmit,
    className: "space-y-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "font-bold text-slate-700 block mb-1"
  }, "Mật khẩu hiện tại *"), /*#__PURE__*/React.createElement("input", {
    type: "password",
    required: true,
    value: oldPassword,
    onChange: e => setOldPassword(e.target.value),
    className: "w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "font-bold text-slate-700 block mb-1"
  }, "Mật khẩu mới *"), /*#__PURE__*/React.createElement("input", {
    type: "password",
    required: true,
    value: newPassword,
    onChange: e => setNewPassword(e.target.value),
    className: "w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "font-bold text-slate-700 block mb-1"
  }, "Xác nhận mật khẩu mới *"), /*#__PURE__*/React.createElement("input", {
    type: "password",
    required: true,
    value: confirmPassword,
    onChange: e => setConfirmPassword(e.target.value),
    className: "w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-end gap-2 pt-3 border-t border-slate-100"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClose,
    className: "px-4 py-2 rounded-xl bg-slate-100 font-bold text-slate-600"
  }, "Hủy"), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    disabled: submitting,
    className: "px-5 py-2 rounded-xl bg-teal-700 text-white font-bold shadow-md"
  }, submitting ? 'Đang lưu...' : 'Lưu Mật Khẩu')))));
}

// ==========================================
// SCREEN 1: DASHBOARD (TỔNG QUAN HÔM NAY)
// ==========================================
function DashboardScreen({
  data,
  currentUser,
  selectedPropertyFilter,
  onNavigate,
  onCheckIn,
  onCheckOut,
  onOpenNewBooking
}) {
  const todayBookingsArriving = useMemo(() => {
    return (data?.bookings || []).filter(b => b.status === 'confirmed' || b.status === 'hold').slice(0, 4);
  }, [data]);
  const [tabLichTrongNgay, setTabLichTrongNgay] = useState('arriving');
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative rounded-3xl overflow-hidden shadow-lg p-6 sm:p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-6",
    style: {
      backgroundImage: `linear-gradient(to right, rgba(15, 23, 42, 0.88), rgba(15, 23, 42, 0.65)), url(${data?.settings?.bannerUrl || 'https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=1600&q=80'})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs uppercase font-extrabold tracking-widest text-teal-300"
  }, "Thứ sáu, 13/11/2026 · ", data?.properties?.length || 3, " cơ sở, ", data?.rooms?.length || 23, " phòng"), /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl sm:text-3xl font-extrabold tracking-tight mt-1"
  }, "Xin chào, ", /*#__PURE__*/React.createElement("span", {
    className: "text-teal-400"
  }, currentUser?.name || 'Quản trị viên')), /*#__PURE__*/React.createElement("p", {
    className: "mt-2 text-slate-300 text-xs sm:text-sm max-w-xl leading-relaxed"
  }, "Hôm nay có ", /*#__PURE__*/React.createElement("b", null, "4 lượt khách đến"), " (đã nhận 0), ", /*#__PURE__*/React.createElement("b", null, "8 lượt trả phòng"), " và ", /*#__PURE__*/React.createElement("b", null, "14 phòng đang có khách"), ". Công suất đạt ", /*#__PURE__*/React.createElement("b", null, "34.8%"), ".")), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2.5"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onOpenNewBooking,
    className: "px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 font-bold text-xs text-white shadow-md flex items-center gap-1.5 transition active:scale-95"
  }, /*#__PURE__*/React.createElement("span", null, "➕ Đặt phòng")), /*#__PURE__*/React.createElement("button", {
    onClick: () => onNavigate('calendar'),
    className: "px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md font-bold text-xs text-white border border-white/20 flex items-center gap-1.5 transition"
  }, /*#__PURE__*/React.createElement("span", null, "📅 Lịch phòng")), /*#__PURE__*/React.createElement("button", {
    onClick: () => onNavigate('housekeeping'),
    className: "px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md font-bold text-xs text-white border border-white/20 flex items-center gap-1.5 transition"
  }, /*#__PURE__*/React.createElement("span", null, "🧹 Buồng phòng")), currentUser?.permissions?.payment?.view && /*#__PURE__*/React.createElement("button", {
    onClick: () => onNavigate('payments'),
    className: "px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md font-bold text-xs text-white border border-white/20 flex items-center gap-1.5 transition"
  }, /*#__PURE__*/React.createElement("span", null, "💵 Thu tiền")))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-bold text-slate-500 uppercase"
  }, "Công suất hôm nay"), /*#__PURE__*/React.createElement("span", {
    className: "w-6 h-6 rounded-full bg-teal-50 text-teal-600 text-xs flex items-center justify-center font-bold"
  }, "35%")), /*#__PURE__*/React.createElement("div", {
    className: "mt-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-black text-teal-800"
  }, "34,8%"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-slate-400 mt-0.5"
  }, "8/23 phòng có khách"))), /*#__PURE__*/React.createElement("div", {
    className: "p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-bold text-slate-500 uppercase"
  }, "Khách đến hôm nay"), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700"
  }, "0/4")), /*#__PURE__*/React.createElement("div", {
    className: "mt-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-black text-amber-600"
  }, "4"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-slate-400 mt-0.5"
  }, "Đã nhận phòng 0/4"))), /*#__PURE__*/React.createElement("div", {
    className: "p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-bold text-slate-500 uppercase"
  }, "Trả phòng hôm nay"), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700"
  }, "0/8")), /*#__PURE__*/React.createElement("div", {
    className: "mt-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-black text-sky-600"
  }, "8"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-slate-400 mt-0.5"
  }, "Đã trả 0/8"))), currentUser?.permissions?.reports?.view !== false ? /*#__PURE__*/React.createElement("div", {
    className: "p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-teal-700 to-emerald-800 text-white shadow-md flex flex-col justify-between col-span-2 sm:col-span-1"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-bold text-teal-200 uppercase flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("span", null, "💰 Doanh thu đến hôm nay")), /*#__PURE__*/React.createElement("div", {
    className: "text-xl sm:text-2xl font-black mt-2"
  }, "149.231.500 đ")), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-teal-100 mt-1 flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("span", null, "▲ 11% cùng kỳ T10 · cả tháng 327 tr"))) : /*#__PURE__*/React.createElement("div", {
    className: "p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 flex flex-col justify-between col-span-2 sm:col-span-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-bold uppercase"
  }, "Bảo mật Doanh thu"), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-400 mt-2"
  }, "Chỉ Quản trị viên và Kế toán mới được xem số liệu tài chính.")), /*#__PURE__*/React.createElement("div", {
    className: "p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between col-span-2 sm:col-span-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-bold text-rose-600 uppercase"
  }, "Còn phải thu"), /*#__PURE__*/React.createElement("span", {
    className: "text-xs"
  }, "⚠️")), /*#__PURE__*/React.createElement("div", {
    className: "mt-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-black text-rose-600"
  }, "28.515.000 đ"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-slate-400 mt-0.5"
  }, "16 đơn đang ở / đã trả còn nợ")))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 lg:grid-cols-12 gap-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-extrabold text-base text-slate-900 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "🕒 Lịch trong ngày")), /*#__PURE__*/React.createElement("div", {
    className: "flex p-1 bg-slate-100 rounded-xl text-xs font-bold"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setTabLichTrongNgay('arriving'),
    className: `px-3 py-1 rounded-lg transition ${tabLichTrongNgay === 'arriving' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-500'}`
  }, "Khách đến ", /*#__PURE__*/React.createElement("span", {
    className: "ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-teal-100 text-teal-700"
  }, "4")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setTabLichTrongNgay('departing'),
    className: `px-3 py-1 rounded-lg transition ${tabLichTrongNgay === 'departing' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-500'}`
  }, "Trả phòng ", /*#__PURE__*/React.createElement("span", {
    className: "ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700"
  }, "8")))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3 pt-2"
  }, [{
    id: 'BK2611-054',
    name: 'Ngô Văn Hà',
    room: 'Phòng Bungalow A · Homestay Mây Đà Lạt',
    avatarBg: 'bg-amber-500',
    initials: 'VH'
  }, {
    id: 'BK2611-055',
    name: 'Nguyễn Hải Trang',
    room: 'Phòng Gác mái 2 · Homestay Mây Đà Lạt',
    avatarBg: 'bg-teal-600',
    initials: 'HT'
  }, {
    id: 'BK2611-056',
    name: 'Trần Gia Phúc',
    room: 'Phòng Gỗ 3 · Homestay Mây Đà Lạt',
    avatarBg: 'bg-rose-500',
    initials: 'GP'
  }, {
    id: 'BK2611-057',
    name: 'Bùi Gia Long',
    room: 'Phòng V2 · Villa Phố Cổ Hội An · 3 đêm',
    avatarBg: 'bg-red-500',
    initials: 'GL'
  }].map(item => /*#__PURE__*/React.createElement("div", {
    key: item.id,
    className: "flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/70 hover:bg-slate-100 border border-slate-100 transition"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: `w-10 h-10 rounded-full ${item.avatarBg} text-white font-black text-xs flex items-center justify-center shadow-sm`
  }, item.initials), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "font-bold text-sm text-slate-900"
  }, item.name), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-500"
  }, item.room))), /*#__PURE__*/React.createElement("button", {
    onClick: () => onCheckIn(item.id),
    className: "px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-sm shadow-teal-700/20 transition active:scale-95 whitespace-nowrap"
  }, "Nhận phòng"))))), /*#__PURE__*/React.createElement("div", {
    className: "lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-extrabold text-base text-slate-900 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "📈 Công suất 14 ngày tới")), /*#__PURE__*/React.createElement("button", {
    onClick: () => onNavigate('calendar'),
    className: "text-xs font-bold text-teal-700 hover:underline"
  }, "Xem lịch →")), /*#__PURE__*/React.createElement("div", {
    className: "p-4 rounded-2xl bg-slate-50 border border-slate-100 mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between text-xs mb-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-slate-500"
  }, "Dự kiến cao nhất: T6 20/11"), /*#__PURE__*/React.createElement("span", {
    className: "font-black text-teal-700"
  }, "52.2%")), /*#__PURE__*/React.createElement("div", {
    className: "w-full bg-slate-200 h-2 rounded-full overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-teal-500 to-emerald-500 h-full rounded-full",
    style: {
      width: '52.2%'
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center text-[10px] text-slate-400 mt-1"
  }, /*#__PURE__*/React.createElement("span", null, "Hôm nay (34.8%)"), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-rose-500"
  }, "Mục tiêu 80%"))), /*#__PURE__*/React.createElement("div", {
    className: "h-32 flex items-end justify-between gap-1 pt-4 px-2 border-b border-slate-100"
  }, [35, 42, 38, 45, 50, 48, 52, 40, 44, 48, 55, 60, 58, 45].map((val, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: "flex-1 flex flex-col items-center gap-1 group"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full bg-teal-100 group-hover:bg-teal-600 rounded-t transition-all",
    style: {
      height: `${val * 1.5}px`
    },
    title: `Ngày +${idx}: ${val}%`
  })))), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between text-[9px] text-slate-400 pt-1"
  }, /*#__PURE__*/React.createElement("span", null, "T6 13/11"), /*#__PURE__*/React.createElement("span", null, "T4 18/11"), /*#__PURE__*/React.createElement("span", null, "T5 26/11"))), /*#__PURE__*/React.createElement("div", {
    className: "pt-4 border-t border-slate-100 mt-4 flex items-center justify-between text-xs"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-3 h-3 rounded-full bg-emerald-500"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-slate-600"
  }, "Trống sẵn sàng: ", /*#__PURE__*/React.createElement("b", null, "5"))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-3 h-3 rounded-full bg-amber-500"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-slate-600"
  }, "Chưa dọn: ", /*#__PURE__*/React.createElement("b", null, "2"))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-3 h-3 rounded-full bg-rose-500"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-slate-600"
  }, "Bảo trì: ", /*#__PURE__*/React.createElement("b", null, "1")))))));
}

// ========================================================
// SCREEN 2: LỊCH PHÒNG (TIMELINE / GANTT VIEW)
// ========================================================
function CalendarTimelineScreen({
  data,
  filteredRooms,
  filteredBookings,
  onSelectRange,
  onViewBooking
}) {
  const [viewDays, setViewDays] = useState(14);
  const [startDateOffset, setStartDateOffset] = useState(0);
  const baseDate = new Date('2026-11-12');
  const timelineDates = useMemo(() => {
    const dates = [];
    const start = new Date(baseDate);
    start.setDate(start.getDate() + startDateOffset);
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    for (let i = 0; i < viewDays; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const isToday = dd === '13' && mm === '11';
      dates.push({
        dateStr,
        day: dd,
        month: mm,
        dayOfWeek: dayNames[d.getDay()],
        isToday,
        isWeekend: d.getDay() === 5 || d.getDay() === 6
      });
    }
    return dates;
  }, [baseDate, startDateOffset, viewDays]);
  const roomsByProperty = useMemo(() => {
    const map = {};
    (filteredRooms || []).forEach(r => {
      if (!map[r.propertyId]) map[r.propertyId] = [];
      map[r.propertyId].push(r);
    });
    return map;
  }, [filteredRooms]);
  const handleCellClick = (room, dateItem) => {
    if (room.housekeepingStatus === 'maintenance') {
      alert(`Phòng ${room.name} đang bảo trì (${room.maintenanceReason || 'Đang sửa chữa'}), không thể đặt!`);
      return;
    }
    const nextDate = new Date(dateItem.dateStr);
    nextDate.setDate(nextDate.getDate() + 2);
    const nextDateStr = nextDate.toISOString().split('T')[0];
    onSelectRange(room.id, dateItem.dateStr, nextDateStr);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setStartDateOffset(o => o - 7),
    className: "w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-600 font-bold"
  }, "‹"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setStartDateOffset(0),
    className: "px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
  }, "Hôm nay"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setStartDateOffset(o => o + 7),
    className: "w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-600 font-bold"
  }, "›"), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-slate-800 ml-2"
  }, "📅 ", timelineDates[0]?.day, "/", timelineDates[0]?.month, " - ", timelineDates[timelineDates.length - 1]?.day, "/", timelineDates[timelineDates.length - 1]?.month, "/2026")), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex p-1 bg-slate-100 rounded-xl text-xs font-bold"
  }, [7, 14, 30].map(days => /*#__PURE__*/React.createElement("button", {
    key: days,
    onClick: () => setViewDays(days),
    className: `px-3 py-1 rounded-lg transition ${viewDays === days ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-500'}`
  }, days, " ngày"))), /*#__PURE__*/React.createElement("div", {
    className: "hidden xl:flex items-center gap-3 text-xs font-medium text-slate-600"
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2.5 h-2.5 rounded-full bg-amber-400"
  }), " Giữ chỗ"), /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2.5 h-2.5 rounded-full bg-sky-500"
  }), " Đã xác nhận"), /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2.5 h-2.5 rounded-full bg-emerald-500"
  }), " Đang ở"), /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2.5 h-2.5 rounded-full bg-slate-400"
  }), " Đã trả"), /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2 h-2 rounded-full bg-rose-600"
  }), " Còn nợ")))), /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-2 bg-amber-50/50 border-b border-amber-100/60 text-[11px] text-amber-800 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", null, "💡 ", /*#__PURE__*/React.createElement("b", null, "Mẹo thao tác:"), " Bấm hoặc kéo chuột trên các ô ngày trống để mở ngay form ", /*#__PURE__*/React.createElement("b", null, "Đặt phòng mới"), " với phòng & ngày tự điền.")), /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto relative"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full border-collapse text-xs select-none"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    className: "bg-slate-50/90 border-b border-slate-200"
  }, /*#__PURE__*/React.createElement("th", {
    className: "sticky left-0 z-20 bg-slate-100 p-3 text-left font-extrabold text-slate-700 w-44 min-w-[176px] border-r border-slate-200"
  }, "PHÒNG"), timelineDates.map(d => /*#__PURE__*/React.createElement("th", {
    key: d.dateStr,
    className: `p-2 text-center border-r border-slate-200 min-w-[65px] ${d.isToday ? 'bg-teal-50 text-teal-800' : d.isWeekend ? 'bg-slate-100/50' : ''}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-slate-400 uppercase font-bold"
  }, d.dayOfWeek), /*#__PURE__*/React.createElement("div", {
    className: `text-sm font-extrabold mt-0.5 inline-block px-1.5 py-0.2 rounded-full ${d.isToday ? 'bg-teal-700 text-white' : 'text-slate-800'}`
  }, d.day), /*#__PURE__*/React.createElement("div", {
    className: "text-[9px] text-slate-400"
  }, "th", d.month))))), /*#__PURE__*/React.createElement("tbody", null, Object.entries(roomsByProperty).map(([propId, pRooms]) => {
    const prop = (data?.properties || []).find(p => p.id === propId) || {
      name: 'Cơ sở'
    };
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: propId
    }, /*#__PURE__*/React.createElement("tr", {
      className: "bg-teal-50/80 border-b border-teal-100 font-bold text-teal-900"
    }, /*#__PURE__*/React.createElement("td", {
      className: "sticky left-0 z-10 bg-teal-50/90 p-2.5 px-3 border-r border-teal-200"
    }, "🏨 ", prop.name, " (", pRooms.length, " phòng)"), timelineDates.map(d => /*#__PURE__*/React.createElement("td", {
      key: d.dateStr,
      className: "p-1 text-center border-r border-teal-100 text-[10px] text-teal-700"
    }, Math.max(1, pRooms.length - 2)))), pRooms.map(room => {
      const roomType = (data?.roomTypes || []).find(rt => rt.id === room.roomTypeId) || {};
      const isMaintenance = room.housekeepingStatus === 'maintenance';
      const roomBookings = filteredBookings.filter(b => b.roomId === room.id);
      return /*#__PURE__*/React.createElement("tr", {
        key: room.id,
        className: "border-b border-slate-100 hover:bg-slate-50/40 relative h-12"
      }, /*#__PURE__*/React.createElement("td", {
        className: "sticky left-0 z-10 bg-white p-2.5 px-3 border-r border-slate-200 flex items-center justify-between"
      }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
        className: "font-extrabold text-sm text-slate-900"
      }, room.name), /*#__PURE__*/React.createElement("div", {
        className: "text-[10px] text-slate-400 leading-tight"
      }, roomType.name || '')), isMaintenance && /*#__PURE__*/React.createElement("span", {
        className: "text-xs text-rose-500 font-bold",
        title: room.maintenanceReason || 'Bảo trì'
      }, "🛠️")), timelineDates.map(d => {
        const booking = roomBookings.find(b => d.dateStr >= b.checkInDate && d.dateStr < b.checkOutDate);
        return /*#__PURE__*/React.createElement("td", {
          key: d.dateStr,
          onClick: () => handleCellClick(room, d),
          className: `p-1 border-r border-slate-100 relative cursor-pointer hover:bg-teal-50/30 ${isMaintenance ? 'bg-striped-diagonal cursor-not-allowed' : ''} ${d.isToday ? 'bg-teal-50/20' : ''}`
        }, booking && /*#__PURE__*/React.createElement("div", {
          onClick: e => {
            e.stopPropagation();
            onViewBooking(booking);
          },
          className: `booking-bar w-full h-8 rounded-lg px-2 flex items-center justify-between text-[11px] font-bold text-white shadow-sm overflow-hidden ${booking.status === 'in_house' ? 'bg-emerald-600' : booking.status === 'hold' ? 'bg-amber-500' : booking.status === 'checked_out' ? 'bg-slate-400' : 'bg-sky-600'}`,
          title: `${booking.customerName} (${booking.checkInDate} - ${booking.checkOutDate})`
        }, /*#__PURE__*/React.createElement("span", {
          className: "truncate"
        }, booking.customerName), booking.balance > 0 && /*#__PURE__*/React.createElement("span", {
          className: "w-2 h-2 rounded-full bg-rose-500 shrink-0 ml-1",
          title: `Còn nợ: ${formatVND(booking.balance)}`
        })));
      }));
    }));
  })))));
}

// ==========================================
// SCREEN 3: BOOKINGS LIST & MANAGEMENT
// ==========================================
function BookingsListScreen({
  bookings,
  data,
  onCheckIn,
  onCheckOut,
  onOpenNewBooking,
  onOpenGroupBooking,
  onPrintVoucher,
  onViewDetail
}) {
  const [filterStatus, setFilterStatus] = useState('all');
  const displayed = bookings.filter(b => {
    if (filterStatus !== 'all' && b.status !== filterStatus) return false;
    return true;
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center justify-between gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "font-extrabold text-xl text-slate-900"
  }, "Danh Sách Đặt Phòng"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400"
  }, "Hiển thị ", displayed.length, " đơn đặt phòng")), /*#__PURE__*/React.createElement("div", {
    className: "flex p-1 bg-slate-100 rounded-xl text-xs font-bold overflow-x-auto"
  }, [{
    id: 'all',
    label: 'Tất cả'
  }, {
    id: 'confirmed',
    label: 'Đã xác nhận'
  }, {
    id: 'in_house',
    label: 'Đang ở'
  }, {
    id: 'hold',
    label: 'Giữ chỗ'
  }, {
    id: 'checked_out',
    label: 'Đã trả'
  }].map(f => /*#__PURE__*/React.createElement("button", {
    key: f.id,
    onClick: () => setFilterStatus(f.id),
    className: `px-3 py-1 rounded-lg transition whitespace-nowrap ${filterStatus === f.id ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-500'}`
  }, f.label)))), /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full text-xs text-left border-collapse"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    className: "border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]"
  }, /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2"
  }, "Mã đặt"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2"
  }, "Khách hàng"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2"
  }, "Phòng / Cơ sở"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2"
  }, "Lưu trú"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2"
  }, "Trạng thái"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2 text-right"
  }, "Tổng tiền"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2 text-right"
  }, "Còn nợ"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2 text-center"
  }, "Thao tác"))), /*#__PURE__*/React.createElement("tbody", {
    className: "divide-y divide-slate-100 font-medium"
  }, displayed.map(b => /*#__PURE__*/React.createElement("tr", {
    key: b.id,
    className: "hover:bg-slate-50/60 transition"
  }, /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 font-mono font-bold text-teal-700"
  }, b.id, b.groupName && /*#__PURE__*/React.createElement("span", {
    className: "block text-[9px] text-amber-600 font-sans"
  }, "👥 ", b.groupName)), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-bold text-slate-900"
  }, b.customerName), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-slate-400"
  }, b.customerPhone, " · ", b.sourceName)), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-slate-800"
  }, b.roomName), /*#__PURE__*/React.createElement("span", {
    className: "text-slate-400 text-[11px] block"
  }, b.roomTypeName)), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2"
  }, /*#__PURE__*/React.createElement("div", null, b.checkInDate, " → ", b.checkOutDate), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-slate-400"
  }, b.nights, " đêm · ", b.guestsCount, " khách")), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: `px-2.5 py-1 rounded-full font-bold text-[10px] ${b.status === 'in_house' ? 'bg-emerald-100 text-emerald-800' : b.status === 'hold' ? 'bg-amber-100 text-amber-800' : b.status === 'checked_out' ? 'bg-slate-200 text-slate-700' : 'bg-sky-100 text-sky-800'}`
  }, b.status === 'in_house' ? 'Đang ở' : b.status === 'hold' ? 'Giữ chỗ' : b.status === 'checked_out' ? 'Đã trả' : 'Đã xác nhận')), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right font-bold text-slate-900"
  }, formatVND(b.grandTotal)), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right"
  }, b.balance > 0 ? /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-rose-600"
  }, formatVND(b.balance)) : /*#__PURE__*/React.createElement("span", {
    className: "text-emerald-600 font-bold"
  }, "Đủ")), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-center gap-1.5"
  }, b.status === 'confirmed' && /*#__PURE__*/React.createElement("button", {
    onClick: () => onCheckIn(b.id),
    className: "px-2.5 py-1 rounded-lg bg-teal-600 text-white font-bold text-[10px] hover:bg-teal-700"
  }, "Nhận"), b.status === 'in_house' && /*#__PURE__*/React.createElement("button", {
    onClick: () => onCheckOut(b.id),
    className: "px-2.5 py-1 rounded-lg bg-slate-700 text-white font-bold text-[10px] hover:bg-slate-800"
  }, "Trả"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onPrintVoucher(b),
    className: "p-1 rounded-lg text-slate-500 hover:bg-slate-200",
    title: "In phiếu xác nhận"
  }, "🖨️"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onViewDetail(b),
    className: "p-1 rounded-lg text-teal-600 hover:bg-teal-50",
    title: "Xem chi tiết"
  }, "👁️")))))))));
}

// ==========================================
// SCREEN 4: HOUSEKEEPING (BUỒNG PHÒNG 6 MÀU)
// ==========================================
function HousekeepingScreen({
  data,
  rooms,
  onCleanAll,
  onRefresh,
  showToast
}) {
  const [filterStatus, setFilterStatus] = useState('all');
  const counts = useMemo(() => {
    const c = {
      occupied: 0,
      due_out: 0,
      arriving: 0,
      clean: 0,
      dirty: 0,
      maintenance: 0
    };
    (rooms || []).forEach(r => {
      if (c[r.housekeepingStatus] !== undefined) c[r.housekeepingStatus]++;
    });
    return c;
  }, [rooms]);
  const handleUpdateStatus = async (roomId, newStatus) => {
    try {
      const res = await authFetch(`/api/rooms/${roomId}/housekeeping`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: newStatus
        })
      });
      if (res.ok) {
        showToast('✅ Đã cập nhật trạng thái phòng!');
        onRefresh();
      }
    } catch (e) {
      showToast('Lỗi: ' + e.message, 'error');
    }
  };
  const roomsByProp = useMemo(() => {
    const map = {};
    (rooms || []).forEach(r => {
      if (filterStatus !== 'all' && r.housekeepingStatus !== filterStatus) return;
      if (!map[r.propertyId]) map[r.propertyId] = [];
      map[r.propertyId].push(r);
    });
    return map;
  }, [rooms, filterStatus]);
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center justify-between gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "font-extrabold text-xl text-slate-900"
  }, "Buồng phòng"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-500"
  }, "Tình trạng phòng hôm nay — bấm vào phòng để nhận / trả phòng hoặc đánh dấu đã dọn")), /*#__PURE__*/React.createElement("button", {
    onClick: onCleanAll,
    className: "px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-md shadow-teal-700/20 flex items-center gap-2 transition active:scale-95"
  }, /*#__PURE__*/React.createElement("span", null, "🧹 Đã dọn tất cả"))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2 pt-2"
  }, [{
    id: 'occupied',
    label: 'Đang ở',
    count: counts.occupied,
    colorClass: 'bg-sky-100 text-sky-800 border-sky-300'
  }, {
    id: 'due_out',
    label: 'Đến hạn trả',
    count: counts.due_out,
    colorClass: 'bg-rose-100 text-rose-800 border-rose-300'
  }, {
    id: 'arriving',
    label: 'Khách đến hôm nay',
    count: counts.arriving,
    colorClass: 'bg-purple-100 text-purple-800 border-purple-300'
  }, {
    id: 'clean',
    label: 'Trống – sẵn sàng',
    count: counts.clean,
    colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-300'
  }, {
    id: 'dirty',
    label: 'Trống – chưa dọn',
    count: counts.dirty,
    colorClass: 'bg-amber-100 text-amber-800 border-amber-300'
  }, {
    id: 'maintenance',
    label: 'Bảo trì',
    count: counts.maintenance,
    colorClass: 'bg-slate-200 text-slate-800 border-slate-300'
  }].map(badge => /*#__PURE__*/React.createElement("button", {
    key: badge.id,
    onClick: () => setFilterStatus(filterStatus === badge.id ? 'all' : badge.id),
    className: `px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition ${badge.colorClass} ${filterStatus === badge.id ? 'ring-2 ring-teal-600 scale-105 shadow-sm' : 'opacity-85 hover:opacity-100'}`
  }, /*#__PURE__*/React.createElement("span", null, badge.label), /*#__PURE__*/React.createElement("span", {
    className: "w-5 h-5 rounded-full bg-white/80 flex items-center justify-center text-[10px]"
  }, badge.count))))), Object.entries(roomsByProp).map(([propId, rList]) => {
    const prop = (data?.properties || []).find(p => p.id === propId) || {
      name: 'Cơ sở'
    };
    return /*#__PURE__*/React.createElement("div", {
      key: propId,
      className: "bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-4"
    }, /*#__PURE__*/React.createElement("h4", {
      className: "font-extrabold text-base text-slate-800 flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("span", null, "🏨 ", prop.name), /*#__PURE__*/React.createElement("span", {
      className: "text-xs text-slate-400 font-normal"
    }, "(", rList.length, " phòng)")), /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5"
    }, rList.map(room => {
      const roomType = (data?.roomTypes || []).find(rt => rt.id === room.roomTypeId) || {};
      const statusStyles = {
        clean: {
          bg: 'bg-emerald-50/70 border-emerald-300 text-emerald-800',
          label: 'Trống – sẵn sàng',
          badge: 'bg-emerald-600 text-white'
        },
        dirty: {
          bg: 'bg-amber-50/70 border-amber-300 text-amber-800',
          label: 'Trống – chưa dọn',
          badge: 'bg-amber-600 text-white'
        },
        occupied: {
          bg: 'bg-sky-50/70 border-sky-300 text-sky-800',
          label: 'Đang ở',
          badge: 'bg-sky-600 text-white'
        },
        due_out: {
          bg: 'bg-rose-50/70 border-rose-300 text-rose-800',
          label: 'Đến hạn trả',
          badge: 'bg-rose-600 text-white'
        },
        arriving: {
          bg: 'bg-purple-50/70 border-purple-300 text-purple-800',
          label: 'Khách đến hôm nay',
          badge: 'bg-purple-600 text-white'
        },
        maintenance: {
          bg: 'bg-slate-100 border-slate-300 text-slate-800',
          label: 'Bảo trì',
          badge: 'bg-slate-600 text-white'
        }
      };
      const style = statusStyles[room.housekeepingStatus] || statusStyles.clean;
      return /*#__PURE__*/React.createElement("div", {
        key: room.id,
        className: `p-3.5 rounded-2xl border ${style.bg} flex flex-col justify-between transition hover:shadow-md cursor-pointer`
      }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
        className: "flex items-start justify-between"
      }, /*#__PURE__*/React.createElement("span", {
        className: "text-xl font-black text-slate-900"
      }, room.name), /*#__PURE__*/React.createElement("span", {
        className: "text-xs"
      }, room.housekeepingStatus === 'clean' ? '🧼' : room.housekeepingStatus === 'dirty' ? '🧹' : room.housekeepingStatus === 'maintenance' ? '🛠️' : '🛏️')), /*#__PURE__*/React.createElement("div", {
        className: "text-[10px] text-slate-500 font-medium truncate mt-0.5"
      }, roomType.name, " · ", room.floor), /*#__PURE__*/React.createElement("div", {
        className: "mt-2.5"
      }, /*#__PURE__*/React.createElement("span", {
        className: `inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${style.badge}`
      }, style.label))), /*#__PURE__*/React.createElement("div", {
        className: "mt-3 pt-2 border-t border-black/5 flex items-center justify-between text-[10px]"
      }, /*#__PURE__*/React.createElement("span", {
        className: "truncate text-slate-500"
      }, room.nextGuest || room.maintenanceReason || 'Sẵn sàng đón khách'), room.housekeepingStatus === 'dirty' && /*#__PURE__*/React.createElement("button", {
        onClick: e => {
          e.stopPropagation();
          handleUpdateStatus(room.id, 'clean');
        },
        className: "px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[9px]",
        title: "Đánh dấu đã dọn"
      }, "Xong")));
    })));
  }));
}

// ==========================================
// ==========================================
// SCREEN 5: PAYMENTS (THU TIỀN) - IMAGE 8
// ==========================================
function PaymentsScreen({
  data,
  onOpenNewPayment,
  showToast
}) {
  const payments = data?.payments || [];
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;
  const filteredPayments = useMemo(() => {
    let list = payments;
    if (propertyFilter !== 'all') {
      list = list.filter(p => p.propertyId === propertyFilter || p.roomProperty && p.roomProperty.includes(propertyFilter));
    }
    if (methodFilter !== 'all') {
      list = list.filter(p => p.method === methodFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(p => p.bookingId && p.bookingId.toLowerCase().includes(q) || p.customerName && p.customerName.toLowerCase().includes(q) || p.notes && p.notes.toLowerCase().includes(q));
    }
    return list;
  }, [payments, propertyFilter, methodFilter, searchQuery]);
  const totals = useMemo(() => {
    let totalThu = 162865000;
    let daHoanTien = 2150000;
    let thucThu = 160715000;
    return {
      totalThu,
      daHoanTien,
      thucThu
    };
  }, []);
  const totalPages = Math.ceil(filteredPayments.length / pageSize) || 1;
  const paginatedList = filteredPayments.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const handleExportExcel = () => {
    window.open('/api/export/payments', '_blank');
    showToast('📥 Đang tải file Excel danh sách phiếu thu...');
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center justify-between gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "font-extrabold text-xl text-slate-900"
  }, "Thu tiền"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400"
  }, "Mọi phiếu đặt cọc, thanh toán và hoàn tiền của các đơn")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleExportExcel,
    className: "px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs shadow-sm flex items-center gap-1.5 transition"
  }, /*#__PURE__*/React.createElement("span", null, "📥 Xuất Excel")), /*#__PURE__*/React.createElement("button", {
    onClick: onOpenNewPayment,
    className: "px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-md shadow-teal-700/20 flex items-center gap-1.5 transition"
  }, /*#__PURE__*/React.createElement("span", null, "➕ Lập phiếu thu")))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-3 gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-emerald-500"
  }, "↓"), " Tổng thu"), /*#__PURE__*/React.createElement("div", {
    className: "mt-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl sm:text-3xl font-black text-slate-900"
  }, formatVND(totals.totalThu)), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-400 mt-1"
  }, "89 phiếu thu · cọc 141 tr"))), /*#__PURE__*/React.createElement("div", {
    className: "p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-rose-500"
  }, "↑"), " Đã hoàn tiền"), /*#__PURE__*/React.createElement("div", {
    className: "mt-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl sm:text-3xl font-black text-slate-900"
  }, formatVND(totals.daHoanTien)), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-400 mt-1"
  }, "1 phiếu hoàn"))), /*#__PURE__*/React.createElement("div", {
    className: "p-5 rounded-3xl bg-gradient-to-br from-teal-700 to-indigo-800 text-white shadow-md flex flex-col justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-teal-200 uppercase flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", null, "💳 Thực thu")), /*#__PURE__*/React.createElement("div", {
    className: "mt-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl sm:text-3xl font-black"
  }, formatVND(totals.thucThu)), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-teal-100 mt-1"
  }, "Nhiều nhất: OTA thu hộ 103 tr")))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-2.5"
  }, /*#__PURE__*/React.createElement("button", {
    className: "px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-sm flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "📅 01/11 – 30/11/2026"), /*#__PURE__*/React.createElement("span", {
    className: "text-slate-400 text-[10px]"
  }, "▼")), /*#__PURE__*/React.createElement("select", {
    value: propertyFilter,
    onChange: e => setPropertyFilter(e.target.value),
    className: "px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
  }, /*#__PURE__*/React.createElement("option", {
    value: "all"
  }, "Tất cả cơ sở"), /*#__PURE__*/React.createElement("option", {
    value: "Khách sạn Biển Xanh"
  }, "Khách sạn Biển Xanh"), /*#__PURE__*/React.createElement("option", {
    value: "Homestay Mây Đà Lạt"
  }, "Homestay Mây Đà Lạt"), /*#__PURE__*/React.createElement("option", {
    value: "Villa Phố Cổ Hội An"
  }, "Villa Phố Cổ Hội An")), /*#__PURE__*/React.createElement("select", {
    value: methodFilter,
    onChange: e => setMethodFilter(e.target.value),
    className: "px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
  }, /*#__PURE__*/React.createElement("option", {
    value: "all"
  }, "Phương thức"), /*#__PURE__*/React.createElement("option", {
    value: "cash"
  }, "Tiền mặt"), /*#__PURE__*/React.createElement("option", {
    value: "bank"
  }, "Chuyển khoản"), /*#__PURE__*/React.createElement("option", {
    value: "pos"
  }, "Thẻ POS"), /*#__PURE__*/React.createElement("option", {
    value: "momo"
  }, "Ví MoMo"), /*#__PURE__*/React.createElement("option", {
    value: "ota"
  }, "OTA thu hộ")), /*#__PURE__*/React.createElement("button", {
    className: "px-3 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs font-bold text-slate-600 shadow-sm flex items-center gap-1.5 hover:bg-slate-50"
  }, /*#__PURE__*/React.createElement("span", null, "🎛️ Lọc thêm")), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-w-[200px] relative"
  }, /*#__PURE__*/React.createElement("span", {
    className: "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs"
  }, "🔍"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Tìm mã đặt, khách, ghi chú...",
    value: searchQuery,
    onChange: e => setSearchQuery(e.target.value),
    className: "w-full pl-9 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 shadow-sm"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full text-xs text-left border-collapse"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    className: "border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]"
  }, /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2"
  }, "Ngày thu ⤓"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2"
  }, "Mã đặt"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2"
  }, "Khách"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2"
  }, "Phòng · Cơ sở"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2"
  }, "Loại"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2"
  }, "Phương thức"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2 text-right"
  }, "Số tiền"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2"
  }, "Người thu"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2"
  }, "Ghi chú"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2 text-right"
  }))), /*#__PURE__*/React.createElement("tbody", {
    className: "divide-y divide-slate-100 font-medium"
  }, paginatedList.map(p => /*#__PURE__*/React.createElement("tr", {
    key: p.id,
    className: "hover:bg-slate-50/60"
  }, /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-slate-500 whitespace-nowrap"
  }, p.date), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 font-mono font-bold text-teal-700"
  }, p.bookingId), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 font-bold text-slate-900"
  }, p.customerName), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-slate-600"
  }, p.roomProperty), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: `px-2 py-0.5 rounded-full font-bold text-[10px] ${p.type === 'deposit' ? 'bg-sky-100 text-sky-800' : p.type === 'refund' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`
  }, p.typeName)), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-slate-600"
  }, p.methodName), /*#__PURE__*/React.createElement("td", {
    className: `py-3 px-2 text-right font-black ${p.amount < 0 ? 'text-rose-600' : 'text-slate-900'}`
  }, p.amount < 0 ? `-${formatVND(Math.abs(p.amount))}` : formatVND(p.amount)), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-slate-500"
  }, p.recipient || 'Quản trị viên'), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-slate-400 italic max-w-xs truncate"
  }, p.notes), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right"
  }, /*#__PURE__*/React.createElement("button", {
    className: "w-7 h-7 rounded-xl hover:bg-slate-100 text-slate-400 font-bold inline-flex items-center justify-center"
  }, "⋮"))))), /*#__PURE__*/React.createElement("tfoot", null, /*#__PURE__*/React.createElement("tr", {
    className: "border-t-2 border-slate-300 font-black bg-slate-50/70"
  }, /*#__PURE__*/React.createElement("td", {
    colSpan: "6",
    className: "py-3 px-2"
  }, "Tổng (", filteredPayments.length, ")"), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right text-slate-900"
  }, formatVND(totals.thucThu)), /*#__PURE__*/React.createElement("td", {
    colSpan: "3"
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100 text-xs"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-slate-400 text-[11px]"
  }, "Hiển thị ", (currentPage - 1) * pageSize + 1, "–", Math.min(currentPage * pageSize, filteredPayments.length), " / ", filteredPayments.length), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("button", {
    disabled: currentPage === 1,
    onClick: () => setCurrentPage(p => Math.max(1, p - 1)),
    className: "w-7 h-7 rounded-lg border border-slate-200 text-slate-600 font-bold flex items-center justify-center disabled:opacity-30"
  }, "‹"), [...Array(Math.min(5, totalPages))].map((_, i) => /*#__PURE__*/React.createElement("button", {
    key: i + 1,
    onClick: () => setCurrentPage(i + 1),
    className: `w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center ${currentPage === i + 1 ? 'bg-teal-700 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'}`
  }, i + 1)), totalPages > 5 && /*#__PURE__*/React.createElement("span", {
    className: "text-slate-400 px-1"
  }, "..."), totalPages > 5 && /*#__PURE__*/React.createElement("button", {
    onClick: () => setCurrentPage(totalPages),
    className: `w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center ${currentPage === totalPages ? 'bg-teal-700 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'}`
  }, totalPages), /*#__PURE__*/React.createElement("button", {
    disabled: currentPage === totalPages,
    onClick: () => setCurrentPage(p => Math.min(totalPages, p + 1)),
    className: "w-7 h-7 rounded-lg border border-slate-200 text-slate-600 font-bold flex items-center justify-center disabled:opacity-30"
  }, "›")))));
}

// ==========================================
// SCREEN 6: CUSTOMERS (KHÁCH HÀNG) - IMAGE 7
// ==========================================
function CustomersScreen({
  data,
  onOpenNewCustomer,
  showToast
}) {
  const [filterTier, setFilterTier] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;
  const customers = data?.customers || [];
  const filtered = useMemo(() => {
    let list = customers;
    if (filterTier !== 'all') {
      list = list.filter(c => c.tier === filterTier);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(c => c.name && c.name.toLowerCase().includes(q) || c.phone && c.phone.includes(q) || c.idCard && c.idCard.includes(q) || c.email && c.email.toLowerCase().includes(q));
    }
    return list;
  }, [customers, filterTier, searchQuery]);
  const vipCount = customers.filter(c => c.tier === 'vip').length;
  const totalSpent = useMemo(() => {
    return customers.reduce((s, c) => s + (c.totalSpent || 0), 0);
  }, [customers]);
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedList = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const getInitials = name => {
    if (!name) return 'KH';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };
  const getAvatarColor = idx => {
    const colors = ['bg-sky-600', 'bg-blue-600', 'bg-rose-600', 'bg-emerald-600', 'bg-amber-600', 'bg-purple-600', 'bg-teal-600'];
    return colors[idx % colors.length];
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center justify-between gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "font-extrabold text-xl text-slate-900"
  }, "Khách hàng"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400"
  }, customers.length, " khách · ", vipCount, " VIP")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      window.open('/api/export/customers', '_blank');
      showToast('📥 Đang xuất danh sách khách hàng ra Excel...');
    },
    className: "px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs shadow-sm flex items-center gap-1.5 transition"
  }, /*#__PURE__*/React.createElement("span", null, "📥 Xuất Excel")), /*#__PURE__*/React.createElement("button", {
    onClick: onOpenNewCustomer,
    className: "px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-md shadow-teal-700/20 flex items-center gap-1.5 transition"
  }, /*#__PURE__*/React.createElement("span", null, "➕ Thêm khách")))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-2.5"
  }, /*#__PURE__*/React.createElement("select", {
    value: filterTier,
    onChange: e => setFilterTier(e.target.value),
    className: "px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
  }, /*#__PURE__*/React.createElement("option", {
    value: "all"
  }, "Tất cả hạng"), /*#__PURE__*/React.createElement("option", {
    value: "standard"
  }, "Thường"), /*#__PURE__*/React.createElement("option", {
    value: "loyal"
  }, "Thân thiết"), /*#__PURE__*/React.createElement("option", {
    value: "vip"
  }, "👑 VIP")), /*#__PURE__*/React.createElement("button", {
    className: "px-3 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs font-bold text-slate-600 shadow-sm flex items-center gap-1.5 hover:bg-slate-50"
  }, /*#__PURE__*/React.createElement("span", null, "🎛️ Lọc thêm")), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-w-[220px] relative"
  }, /*#__PURE__*/React.createElement("span", {
    className: "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs"
  }, "🔍"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Tìm tên, SĐT, CCCD, email...",
    value: searchQuery,
    onChange: e => setSearchQuery(e.target.value),
    className: "w-full pl-9 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 shadow-sm"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full text-xs text-left border-collapse"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    className: "border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]"
  }, /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2"
  }, "Khách hàng"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2"
  }, "Điện thoại"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2"
  }, "CCCD / Hộ chiếu"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2"
  }, "Quốc tịch"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2"
  }, "Hạng"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2 text-center"
  }, "Lượt ở"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2 text-center"
  }, "Đêm"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2 text-right"
  }, "Tổng chi"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2"
  }, "Lần gần nhất ⤓"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2 text-right"
  }))), /*#__PURE__*/React.createElement("tbody", {
    className: "divide-y divide-slate-100 font-medium"
  }, paginatedList.map((c, idx) => /*#__PURE__*/React.createElement("tr", {
    key: c.id,
    className: "hover:bg-slate-50/60"
  }, /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 flex items-center gap-2.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: `w-8 h-8 rounded-full ${getAvatarColor(idx)} text-white font-extrabold text-[11px] flex items-center justify-center shrink-0 shadow-sm`
  }, getInitials(c.name)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-slate-900 block"
  }, c.name), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-slate-400"
  }, c.email || 'chua-co-email'))), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 font-mono text-slate-600"
  }, c.phone), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 font-mono text-slate-500"
  }, c.idCard || '0xxxxxxxxx'), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-slate-600"
  }, c.nationality || 'Việt Nam'), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2"
  }, c.tier === 'vip' ? /*#__PURE__*/React.createElement("span", {
    className: "px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-black text-[10px] inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("span", null, "👑"), " VIP") : c.tier === 'loyal' ? /*#__PURE__*/React.createElement("span", {
    className: "px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px]"
  }, "Thân thiết") : /*#__PURE__*/React.createElement("span", {
    className: "px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px]"
  }, "Thường")), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-center font-bold text-slate-700"
  }, c.totalBookings || 1), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-center text-slate-600"
  }, c.totalNights || 2), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right font-black text-slate-900"
  }, formatVND(c.totalSpent)), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-slate-500 whitespace-nowrap"
  }, c.lastStay || '12/12/2026'), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right"
  }, /*#__PURE__*/React.createElement("button", {
    className: "w-7 h-7 rounded-xl hover:bg-slate-100 text-slate-400 font-bold inline-flex items-center justify-center"
  }, "⋮"))))), /*#__PURE__*/React.createElement("tfoot", null, /*#__PURE__*/React.createElement("tr", {
    className: "border-t-2 border-slate-300 font-black bg-slate-50/70"
  }, /*#__PURE__*/React.createElement("td", {
    colSpan: "7",
    className: "py-3 px-2"
  }, "Tổng (", customers.length, ")"), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right text-slate-900"
  }, formatVND(totalSpent)), /*#__PURE__*/React.createElement("td", {
    colSpan: "2"
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100 text-xs"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-slate-400 text-[11px]"
  }, "Hiển thị ", (currentPage - 1) * pageSize + 1, "–", Math.min(currentPage * pageSize, filtered.length), " / ", filtered.length), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("button", {
    disabled: currentPage === 1,
    onClick: () => setCurrentPage(p => Math.max(1, p - 1)),
    className: "w-7 h-7 rounded-lg border border-slate-200 text-slate-600 font-bold flex items-center justify-center disabled:opacity-30"
  }, "‹"), [...Array(totalPages)].map((_, i) => /*#__PURE__*/React.createElement("button", {
    key: i + 1,
    onClick: () => setCurrentPage(i + 1),
    className: `w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center ${currentPage === i + 1 ? 'bg-teal-700 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'}`
  }, i + 1)), /*#__PURE__*/React.createElement("button", {
    disabled: currentPage === totalPages,
    onClick: () => setCurrentPage(p => Math.min(totalPages, p + 1)),
    className: "w-7 h-7 rounded-lg border border-slate-200 text-slate-600 font-bold flex items-center justify-center disabled:opacity-30"
  }, "›")))));
}

// SCREEN 7: REPORTS (BÁO CÁO KINH DOANH)
// ==========================================
function DonutChart({
  segments,
  centerTitle,
  centerValue
}) {
  const size = 120;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;
  return /*#__PURE__*/React.createElement("div", {
    className: "relative flex items-center justify-center shrink-0",
    style: {
      width: size,
      height: size
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: `0 0 ${size} ${size}`,
    className: "rotate-[-90deg]"
  }, segments.map((seg, i) => {
    const dash = `${seg.percent / 100 * circumference} ${circumference}`;
    const offset = -(accumulatedPercent / 100 * circumference);
    accumulatedPercent += seg.percent;
    return /*#__PURE__*/React.createElement("circle", {
      key: i,
      cx: size / 2,
      cy: size / 2,
      r: radius,
      fill: "transparent",
      stroke: seg.color,
      strokeWidth: strokeWidth,
      strokeDasharray: dash,
      strokeDashoffset: offset
    });
  })), /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-slate-400 font-semibold leading-none"
  }, centerTitle), /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-black text-slate-800 leading-tight mt-0.5"
  }, centerValue)));
}
function ReportsScreen({
  data,
  showToast
}) {
  const [propertyFilter, setPropertyFilter] = useState('all');
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center justify-between gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "font-extrabold text-xl text-slate-900"
  }, "Báo cáo kinh doanh"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400"
  }, "Kỳ 01/11 - 30/11/2026 · 23 phòng · 30 ngày")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => window.print(),
    className: "px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs shadow-sm flex items-center gap-1.5 transition"
  }, /*#__PURE__*/React.createElement("span", null, "🖨️ In báo cáo")), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      window.open('/api/export/bookings', '_blank');
      showToast('📥 Đang xuất báo cáo ra file Excel...');
    },
    className: "px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-md shadow-teal-700/20 flex items-center gap-1.5 transition"
  }, /*#__PURE__*/React.createElement("span", null, "📥 Xuất Excel")))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-2.5"
  }, /*#__PURE__*/React.createElement("button", {
    className: "px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-sm flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "📅 01/11 – 30/11/2026"), /*#__PURE__*/React.createElement("span", {
    className: "text-slate-400 text-[10px]"
  }, "▼")), /*#__PURE__*/React.createElement("select", {
    value: propertyFilter,
    onChange: e => setPropertyFilter(e.target.value),
    className: "px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
  }, /*#__PURE__*/React.createElement("option", {
    value: "all"
  }, "Tất cả cơ sở"), /*#__PURE__*/React.createElement("option", {
    value: "prop_1"
  }, "Khách sạn Biển Xanh"), /*#__PURE__*/React.createElement("option", {
    value: "prop_2"
  }, "Homestay Mây Đà Lạt"), /*#__PURE__*/React.createElement("option", {
    value: "prop_3"
  }, "Villa Phố Cổ Hội An")), /*#__PURE__*/React.createElement("button", {
    className: "px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600 shadow-sm flex items-center gap-1.5 hover:bg-slate-50"
  }, /*#__PURE__*/React.createElement("span", null, "🎛️ Lọc thêm"))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-4 rounded-2xl bg-gradient-to-br from-teal-700 to-emerald-800 text-white shadow-sm flex flex-col justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] font-bold uppercase text-teal-200 flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("span", null, "💰 Doanh thu")), /*#__PURE__*/React.createElement("div", {
    className: "mt-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xl font-black"
  }, "327,2 tr"), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-teal-100 flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("span", null, "▼ 12,4% so với kỳ trước")))), /*#__PURE__*/React.createElement("div", {
    className: "p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("span", null, "🌙 Đêm phòng bán")), /*#__PURE__*/React.createElement("div", {
    className: "mt-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xl font-black text-slate-900"
  }, "354"), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-slate-400"
  }, "trên 690 đêm có sẵn"))), /*#__PURE__*/React.createElement("div", {
    className: "p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("span", null, "📊 Công suất")), /*#__PURE__*/React.createElement("div", {
    className: "mt-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xl font-black text-emerald-600"
  }, "51,3%"), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-slate-400"
  }, "Đêm bán / có sẵn"))), /*#__PURE__*/React.createElement("div", {
    className: "p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("span", null, "🏷️ Giá TB / đêm (ADR)")), /*#__PURE__*/React.createElement("div", {
    className: "mt-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xl font-black text-slate-900"
  }, "876.320 đ"), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-slate-400"
  }, "Tiền phòng ÷ đêm bán"))), /*#__PURE__*/React.createElement("div", {
    className: "p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("span", null, "📈 RevPAR")), /*#__PURE__*/React.createElement("div", {
    className: "mt-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xl font-black text-purple-600"
  }, "449.590 đ"), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-slate-400"
  }, "Tiền phòng ÷ đêm có sẵn"))), /*#__PURE__*/React.createElement("div", {
    className: "p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("span", null, "💳 Thực thu trong kỳ")), /*#__PURE__*/React.createElement("div", {
    className: "mt-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xl font-black text-teal-800"
  }, "160,7 tr"), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-slate-400"
  }, "90 phiếu thu / hoàn")))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 lg:grid-cols-2 gap-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center justify-between gap-2"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-extrabold text-sm text-slate-800"
  }, "Doanh thu theo thời gian"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 text-[10px] font-bold text-slate-500"
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2.5 h-2.5 rounded bg-teal-600"
  }), " Tiền phòng"), /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2.5 h-2.5 rounded bg-amber-500"
  }), " Dịch vụ"), /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2.5 h-2.5 rounded bg-blue-600"
  }), " Phí huỷ / giữ cọc"))), /*#__PURE__*/React.createElement("div", {
    className: "h-48 flex items-end justify-between gap-1 pt-4 border-b border-slate-100 relative"
  }, [{
    r: 8,
    s: 1.2,
    c: 0
  }, {
    r: 9.5,
    s: 1.5,
    c: 0
  }, {
    r: 7.8,
    s: 0.8,
    c: 0
  }, {
    r: 10.2,
    s: 1.0,
    c: 0
  }, {
    r: 13.5,
    s: 2.2,
    c: 0
  }, {
    r: 14.8,
    s: 2.8,
    c: 0
  }, {
    r: 11.0,
    s: 1.5,
    c: 0
  }, {
    r: 8.5,
    s: 1.0,
    c: 0
  }, {
    r: 9.2,
    s: 0.8,
    c: 0
  }, {
    r: 10.5,
    s: 1.2,
    c: 0
  }, {
    r: 12.0,
    s: 1.8,
    c: 0
  }, {
    r: 9.0,
    s: 0.5,
    c: 0
  }, {
    r: 8.2,
    s: 0.9,
    c: 0
  }, {
    r: 11.5,
    s: 1.6,
    c: 0
  }, {
    r: 14.0,
    s: 2.5,
    c: 0
  }, {
    r: 13.0,
    s: 2.0,
    c: 0
  }, {
    r: 9.5,
    s: 1.1,
    c: 1.5
  }, {
    r: 8.8,
    s: 0.7,
    c: 0
  }, {
    r: 10.0,
    s: 1.4,
    c: 0
  }, {
    r: 12.5,
    s: 1.9,
    c: 0
  }, {
    r: 15.0,
    s: 2.6,
    c: 0
  }, {
    r: 14.2,
    s: 2.2,
    c: 0
  }, {
    r: 10.5,
    s: 1.3,
    c: 0
  }, {
    r: 9.0,
    s: 0.8,
    c: 0
  }, {
    r: 11.2,
    s: 1.5,
    c: 0
  }, {
    r: 13.8,
    s: 2.0,
    c: 0
  }, {
    r: 16.5,
    s: 3.0,
    c: 0
  }, {
    r: 15.5,
    s: 2.5,
    c: 0
  }, {
    r: 11.8,
    s: 1.4,
    c: 0
  }, {
    r: 9.2,
    s: 0.9,
    c: 0
  }].map((item, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: "flex-1 flex flex-col justify-end items-center h-full z-10"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full flex flex-col items-center"
  }, item.c > 0 && /*#__PURE__*/React.createElement("div", {
    className: "w-full bg-blue-600 rounded-t-sm",
    style: {
      height: `${item.c * 5}px`
    }
  }), item.s > 0 && /*#__PURE__*/React.createElement("div", {
    className: "w-full bg-amber-500",
    style: {
      height: `${item.s * 5}px`
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "w-full bg-teal-600 rounded-t-sm",
    style: {
      height: `${item.r * 6}px`
    }
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between text-[10px] text-slate-400 pt-1"
  }, /*#__PURE__*/React.createElement("span", null, "01/11"), /*#__PURE__*/React.createElement("span", null, "07/11"), /*#__PURE__*/React.createElement("span", null, "15/11"), /*#__PURE__*/React.createElement("span", null, "21/11"), /*#__PURE__*/React.createElement("span", null, "30/11"))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-extrabold text-sm text-slate-800"
  }, "Công suất phòng theo thời gian"), /*#__PURE__*/React.createElement("div", {
    className: "h-48 relative border-b border-slate-100 flex items-center justify-center"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "w-full h-full",
    viewBox: "0 0 500 160",
    preserveAspectRatio: "none"
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "areaGradient",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: "#0d9488",
    stopOpacity: "0.35"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: "#0d9488",
    stopOpacity: "0.0"
  }))), /*#__PURE__*/React.createElement("line", {
    x1: "0",
    y1: "16",
    x2: "500",
    y2: "16",
    stroke: "#f1f5f9",
    strokeDasharray: "3 3"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "0",
    y1: "52",
    x2: "500",
    y2: "52",
    stroke: "#f1f5f9",
    strokeDasharray: "3 3"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "0",
    y1: "88",
    x2: "500",
    y2: "88",
    stroke: "#f1f5f9",
    strokeDasharray: "3 3"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "0",
    y1: "124",
    x2: "500",
    y2: "124",
    stroke: "#f1f5f9",
    strokeDasharray: "3 3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M 0 95 C 40 80, 70 85, 110 50 C 140 40, 160 55, 190 75 C 220 90, 240 60, 270 45 C 300 70, 320 65, 360 40 C 390 65, 420 50, 460 35 C 480 60, 490 85, 500 95 L 500 160 L 0 160 Z",
    fill: "url(#areaGradient)"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M 0 95 C 40 80, 70 85, 110 50 C 140 40, 160 55, 190 75 C 220 90, 240 60, 270 45 C 300 70, 320 65, 360 40 C 390 65, 420 50, 460 35 C 480 60, 490 85, 500 95",
    fill: "none",
    stroke: "#0d9488",
    strokeWidth: "3",
    strokeLinecap: "round"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between text-[10px] text-slate-400 pt-1"
  }, /*#__PURE__*/React.createElement("span", null, "01/11"), /*#__PURE__*/React.createElement("span", null, "07/11"), /*#__PURE__*/React.createElement("span", null, "15/11"), /*#__PURE__*/React.createElement("span", null, "21/11"), /*#__PURE__*/React.createElement("span", null, "30/11")))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-4"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-extrabold text-xs text-slate-800"
  }, "Doanh thu theo nguồn đặt"), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-center py-2"
  }, /*#__PURE__*/React.createElement(DonutChart, {
    centerTitle: "Doanh thu",
    centerValue: "327 tr",
    segments: [{
      percent: 31.0,
      color: '#0d9488'
    }, {
      percent: 22.9,
      color: '#ea580c'
    }, {
      percent: 22.2,
      color: '#2563eb'
    }, {
      percent: 14.5,
      color: '#10b981'
    }, {
      percent: 9.4,
      color: '#8b5cf6'
    }]
  })), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5 text-[11px] pt-2 border-t border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1.5 text-slate-600"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2 h-2 rounded-full bg-teal-600"
  }), " Điện thoại / Zalo"), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-slate-800"
  }, "31%")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1.5 text-slate-600"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2 h-2 rounded-full bg-amber-600"
  }), " Booking.com"), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-slate-800"
  }, "22.9%")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1.5 text-slate-600"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2 h-2 rounded-full bg-blue-600"
  }), " Agoda"), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-slate-800"
  }, "22.2%")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1.5 text-slate-600"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2 h-2 rounded-full bg-emerald-500"
  }), " Airbnb"), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-slate-800"
  }, "14.5%")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1.5 text-slate-600"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2 h-2 rounded-full bg-purple-500"
  }), " Vãng lai"), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-slate-800"
  }, "9.4%")))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-4"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-extrabold text-xs text-slate-800"
  }, "Thực thu theo phương thức"), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-center py-2"
  }, /*#__PURE__*/React.createElement(DonutChart, {
    centerTitle: "Thực thu",
    centerValue: "161 tr",
    segments: [{
      percent: 64.1,
      color: '#0d9488'
    }, {
      percent: 12.3,
      color: '#ea580c'
    }, {
      percent: 11.7,
      color: '#2563eb'
    }, {
      percent: 8.2,
      color: '#8b5cf6'
    }, {
      percent: 3.7,
      color: '#ec4899'
    }]
  })), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5 text-[11px] pt-2 border-t border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1.5 text-slate-600"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2 h-2 rounded-full bg-teal-600"
  }), " OTA thu hộ"), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-slate-800"
  }, "64.1%")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1.5 text-slate-600"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2 h-2 rounded-full bg-amber-600"
  }), " Chuyển khoản"), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-slate-800"
  }, "12.3%")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1.5 text-slate-600"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2 h-2 rounded-full bg-blue-600"
  }), " Tiền mặt"), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-slate-800"
  }, "11.7%")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1.5 text-slate-600"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2 h-2 rounded-full bg-purple-500"
  }), " Thẻ POS"), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-slate-800"
  }, "8.2%")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1.5 text-slate-600"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2 h-2 rounded-full bg-pink-500"
  }), " Ví MoMo"), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-slate-800"
  }, "3.7%")))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-4"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-extrabold text-xs text-slate-800"
  }, "Trạng thái đơn (theo ngày đến)"), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-center py-2"
  }, /*#__PURE__*/React.createElement(DonutChart, {
    centerTitle: "Đơn",
    centerValue: "148",
    segments: [{
      percent: 15.5,
      color: '#ea580c'
    }, {
      percent: 49.3,
      color: '#2563eb'
    }, {
      percent: 9.5,
      color: '#16a34a'
    }, {
      percent: 18.2,
      color: '#64748b'
    }, {
      percent: 7.5,
      color: '#dc2626'
    }]
  })), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5 text-[11px] pt-2 border-t border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1.5 text-slate-600"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2 h-2 rounded-full bg-amber-600"
  }), " Giữ chỗ"), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-slate-800"
  }, "15.5%")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1.5 text-slate-600"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2 h-2 rounded-full bg-blue-600"
  }), " Đã xác nhận"), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-slate-800"
  }, "49.3%")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1.5 text-slate-600"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2 h-2 rounded-full bg-emerald-600"
  }), " Đang ở"), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-slate-800"
  }, "9.5%")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1.5 text-slate-600"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2 h-2 rounded-full bg-slate-500"
  }), " Đã trả phòng"), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-slate-800"
  }, "18.2%")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1.5 text-slate-600"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2 h-2 rounded-full bg-rose-600"
  }), " Đã huỷ"), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-slate-800"
  }, "7.5%")))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-4"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-extrabold text-xs text-slate-800"
  }, "Công suất theo thứ trong tuần"), /*#__PURE__*/React.createElement("div", {
    className: "h-44 flex items-end justify-around gap-1.5 pt-4 border-b border-slate-100"
  }, [{
    day: 'T2',
    val: 48
  }, {
    day: 'T3',
    val: 45
  }, {
    day: 'T4',
    val: 50
  }, {
    day: 'T5',
    val: 60
  }, {
    day: 'T6',
    val: 78,
    isHigh: true
  }, {
    day: 'T7',
    val: 82,
    isHigh: true
  }, {
    day: 'CN',
    val: 55
  }].map(item => /*#__PURE__*/React.createElement("div", {
    key: item.day,
    className: "flex flex-col items-center gap-1 w-8"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] font-bold text-slate-600"
  }, item.val, "%"), /*#__PURE__*/React.createElement("div", {
    className: `w-full rounded-t transition-all ${item.isHigh ? 'bg-amber-500' : 'bg-teal-600'}`,
    style: {
      height: `${item.val * 1.25}px`
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] font-bold text-slate-400"
  }, item.day)))), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between text-[10px] text-slate-400"
  }, /*#__PURE__*/React.createElement("span", null, "0%"), /*#__PURE__*/React.createElement("span", null, "50%"), /*#__PURE__*/React.createElement("span", null, "100%")))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 lg:grid-cols-2 gap-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-extrabold text-sm text-slate-800"
  }, "Tiền phòng theo loại phòng"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3 pt-2"
  }, [{
    name: 'Family Suite',
    val: 60050000,
    label: '60,1 tr',
    pct: 75
  }, {
    name: 'Deluxe hướng biển',
    val: 56885667,
    label: '56,9 tr',
    pct: 71
  }, {
    name: 'Phòng Đôi sân vườn',
    val: 52499500,
    label: '52,5 tr',
    pct: 65
  }, {
    name: 'Standard Double',
    val: 37640000,
    label: '37,6 tr',
    pct: 47
  }, {
    name: 'Phòng Gia đình',
    val: 33840000,
    label: '33,8 tr',
    pct: 42
  }, {
    name: 'Bungalow Đồi thông',
    val: 30105000,
    label: '30,1 tr',
    pct: 38
  }, {
    name: 'Phòng Gác mái',
    val: 22647000,
    label: '22,6 tr',
    pct: 28
  }, {
    name: 'Phòng Gỗ',
    val: 22605000,
    label: '22,6 tr',
    pct: 28
  }].map((item, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: "flex items-center gap-3 text-xs"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-36 text-[11px] font-semibold text-slate-600 truncate text-right"
  }, item.name), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 bg-slate-100 rounded-full h-3.5 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-600 h-full rounded-full transition-all",
    style: {
      width: `${item.pct}%`
    }
  })), /*#__PURE__*/React.createElement("span", {
    className: "w-14 text-[11px] font-bold text-slate-700 text-right"
  }, item.label)))), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-100 pl-40"
  }, /*#__PURE__*/React.createElement("span", null, "0"), /*#__PURE__*/React.createElement("span", null, "20,0 tr"), /*#__PURE__*/React.createElement("span", null, "40,0 tr"), /*#__PURE__*/React.createElement("span", null, "60,0 tr"), /*#__PURE__*/React.createElement("span", null, "80,0 tr"))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-extrabold text-sm text-slate-800"
  }, "Top dịch vụ phát sinh"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3 pt-2"
  }, [{
    name: 'Phụ thu nhận sớm / trả muộn',
    val: 2600000,
    label: '2,6 tr',
    pct: 86
  }, {
    name: 'Thêm giường phụ',
    val: 2000000,
    label: '2,0 tr',
    pct: 66
  }, {
    name: 'Thuê xe máy',
    val: 1800000,
    label: '1,8 tr',
    pct: 60
  }, {
    name: 'Ăn sáng',
    val: 1700000,
    label: '1,7 tr',
    pct: 56
  }, {
    name: 'Xe đưa đón sân bay',
    val: 1300000,
    label: '1,3 tr',
    pct: 43
  }, {
    name: 'Giặt là',
    val: 950000,
    label: '950 k',
    pct: 31
  }, {
    name: 'Minibar',
    val: 750000,
    label: '750 k',
    pct: 25
  }].map((item, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: "flex items-center gap-3 text-xs"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-44 text-[11px] font-semibold text-slate-600 truncate text-right"
  }, item.name), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 bg-slate-100 rounded-full h-3.5 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-amber-500 h-full rounded-full transition-all",
    style: {
      width: `${item.pct}%`
    }
  })), /*#__PURE__*/React.createElement("span", {
    className: "w-14 text-[11px] font-bold text-slate-700 text-right"
  }, item.label)))), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-100 pl-48"
  }, /*#__PURE__*/React.createElement("span", null, "0"), /*#__PURE__*/React.createElement("span", null, "500k"), /*#__PURE__*/React.createElement("span", null, "1,0 tr"), /*#__PURE__*/React.createElement("span", null, "1,5 tr"), /*#__PURE__*/React.createElement("span", null, "2,0 tr"), /*#__PURE__*/React.createElement("span", null, "2,5 tr"), /*#__PURE__*/React.createElement("span", null, "3,0 tr")))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-extrabold text-sm text-slate-800 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "🏨 Tổng hợp theo cơ sở")), /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full text-xs text-left border-collapse"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    className: "border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]"
  }, /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2"
  }, "Tên"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2 text-center"
  }, "Phòng"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2 text-center"
  }, "Lượt đến"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2 text-center"
  }, "Đêm bán"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2 text-center"
  }, "Công suất"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2 text-right"
  }, "Tiền phòng"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2 text-right"
  }, "Dịch vụ"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2 text-right"
  }, "Doanh thu"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2 text-right"
  }, "ADR"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2 text-right"
  }, "RevPAR"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2 text-right"
  }, "Thực thu"))), /*#__PURE__*/React.createElement("tbody", {
    className: "divide-y divide-slate-100 font-medium text-slate-700"
  }, /*#__PURE__*/React.createElement("tr", {
    className: "hover:bg-slate-50/60"
  }, /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 font-bold text-slate-900"
  }, "Khách sạn Biển Xanh"), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-center"
  }, "10"), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-center"
  }, "61"), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-center"
  }, "142"), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-center"
  }, /*#__PURE__*/React.createElement("span", {
    className: "px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]"
  }, "47.3%")), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right"
  }, formatVND(154575667)), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right"
  }, formatVND(4000000)), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right font-black text-slate-900"
  }, formatVND(158575667)), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right font-mono text-slate-500"
  }, formatVND(1088561)), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right font-mono text-slate-500"
  }, formatVND(515252)), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right font-black text-teal-800"
  }, formatVND(91805000))), /*#__PURE__*/React.createElement("tr", {
    className: "hover:bg-slate-50/60"
  }, /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 font-bold text-slate-900"
  }, "Homestay Mây Đà Lạt"), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-center"
  }, "7"), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-center"
  }, "46"), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-center"
  }, "114"), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-center"
  }, /*#__PURE__*/React.createElement("span", {
    className: "px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]"
  }, "54.3%")), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right"
  }, formatVND(75357000)), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right"
  }, formatVND(3390000)), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right font-black text-slate-900"
  }, formatVND(78747000)), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right font-mono text-slate-500"
  }, formatVND(661026)), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right font-mono text-slate-500"
  }, formatVND(358843)), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right font-black text-teal-800"
  }, formatVND(32345000))), /*#__PURE__*/React.createElement("tr", {
    className: "hover:bg-slate-50/60"
  }, /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 font-bold text-slate-900"
  }, "Villa Phố Cổ Hội An"), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-center"
  }, "6"), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-center"
  }, "41"), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-center"
  }, "98"), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-center"
  }, /*#__PURE__*/React.createElement("span", {
    className: "px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]"
  }, "54.4%")), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right"
  }, formatVND(86339500)), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right"
  }, formatVND(3500000)), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right font-black text-slate-900"
  }, formatVND(89839500)), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right font-mono text-slate-500"
  }, formatVND(881015)), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right font-mono text-slate-500"
  }, formatVND(479664)), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right font-black text-teal-800"
  }, formatVND(36565000)))), /*#__PURE__*/React.createElement("tfoot", null, /*#__PURE__*/React.createElement("tr", {
    className: "border-t-2 border-slate-300 font-black bg-slate-50/70"
  }, /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2"
  }, "Tổng (3)"), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-center"
  }, "23"), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-center"
  }, "148"), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-center"
  }, "354"), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-center"
  }, /*#__PURE__*/React.createElement("span", {
    className: "px-2 py-0.5 rounded-full bg-teal-800 text-white font-bold text-[10px]"
  }, "51.3%")), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right"
  }, formatVND(316272167)), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right"
  }, formatVND(10890000)), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right text-teal-900"
  }, formatVND(327162167)), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right font-mono"
  }, formatVND(893424)), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right font-mono"
  }, formatVND(458365)), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right text-teal-800"
  }, formatVND(160715000)))))), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-slate-400 pt-2"
  }, "Hiển thị 1–3 / 3")), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-extrabold text-sm text-slate-800 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "📋 Tổng hợp theo loại phòng")), /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full text-xs text-left border-collapse"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    className: "border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]"
  }, /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2"
  }, "Tên"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2 text-center"
  }, "Phòng"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2 text-center"
  }, "Lượt đến"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2 text-center"
  }, "Đêm bán"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2 text-center"
  }, "Công suất"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2 text-right"
  }, "Tiền phòng"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2 text-right"
  }, "Dịch vụ"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2 text-right"
  }, "Doanh thu"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2 text-right"
  }, "ADR"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2 text-right"
  }, "RevPAR"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2 text-right"
  }, "Thực thu"))), /*#__PURE__*/React.createElement("tbody", {
    className: "divide-y divide-slate-100 font-medium text-slate-700"
  }, [{
    name: 'Standard Double - Khách sạn Biển Xanh',
    r: 4,
    arr: 26,
    n: 54,
    occ: '45%',
    pRoom: 37640000,
    pSvc: 1230000,
    rev: 38870000,
    adr: 697037,
    revpar: 313667,
    realRev: 15225000
  }, {
    name: 'Deluxe hướng biển - Khách sạn Biển Xanh',
    r: 4,
    arr: 25,
    n: 53,
    occ: '44.2%',
    pRoom: 56885667,
    pSvc: 2150000,
    rev: 59035667,
    adr: 1073314,
    revpar: 474047,
    realRev: 27310000
  }, {
    name: 'Family Suite - Khách sạn Biển Xanh',
    r: 2,
    arr: 10,
    n: 35,
    occ: '58.3%',
    pRoom: 60050000,
    pSvc: 620000,
    rev: 60670000,
    adr: 1715714,
    revpar: 1000833,
    realRev: 49270000
  }, {
    name: 'Phòng Gỗ - Homestay Mây Đà Lạt',
    r: 3,
    arr: 21,
    n: 45,
    occ: '50%',
    pRoom: 22605000,
    pSvc: 600000,
    rev: 23205000,
    adr: 502333,
    revpar: 251167,
    realRev: 7420000
  }, {
    name: 'Phòng Gác mái - Homestay Mây Đà Lạt',
    r: 2,
    arr: 14,
    n: 38,
    occ: '63.3%',
    pRoom: 22647000,
    pSvc: 1310000,
    rev: 23957000,
    adr: 595974,
    revpar: 377450,
    realRev: 10570000
  }, {
    name: 'Bungalow Đồi thông - Homestay Mây Đà Lạt',
    r: 2,
    arr: 11,
    n: 31,
    occ: '51.7%',
    pRoom: 30105000,
    pSvc: 1480000,
    rev: 31585000,
    adr: 971129,
    revpar: 501750,
    realRev: 14355000
  }, {
    name: 'Phòng Đôi sân vườn - Villa Phố Cổ Hội An',
    r: 4,
    arr: 29,
    n: 71,
    occ: '59.2%',
    pRoom: 52499500,
    pSvc: 2360000,
    rev: 54859500,
    adr: 739430,
    revpar: 437496,
    realRev: 30865000
  }, {
    name: 'Phòng Gia đình - Villa Phố Cổ Hội An',
    r: 2,
    arr: 12,
    n: 27,
    occ: '45%',
    pRoom: 33840000,
    pSvc: 1140000,
    rev: 34980000,
    adr: 1253333,
    revpar: 564000,
    realRev: 5700000
  }].map((row, idx) => /*#__PURE__*/React.createElement("tr", {
    key: idx,
    className: "hover:bg-slate-50/60"
  }, /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 font-bold text-slate-900"
  }, row.name), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-center"
  }, row.r), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-center"
  }, row.arr), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-center"
  }, row.n), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-center"
  }, /*#__PURE__*/React.createElement("span", {
    className: "px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]"
  }, row.occ)), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right"
  }, formatVND(row.pRoom)), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right"
  }, formatVND(row.pSvc)), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right font-black text-slate-900"
  }, formatVND(row.rev)), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right font-mono text-slate-500"
  }, formatVND(row.adr)), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right font-mono text-slate-500"
  }, formatVND(row.revpar)), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right font-black text-teal-800"
  }, formatVND(row.realRev))))), /*#__PURE__*/React.createElement("tfoot", null, /*#__PURE__*/React.createElement("tr", {
    className: "border-t-2 border-slate-300 font-black bg-slate-50/70"
  }, /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2"
  }, "Tổng (8)"), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-center"
  }, "23"), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-center"
  }, "148"), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-center"
  }, "354"), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-center"
  }, /*#__PURE__*/React.createElement("span", {
    className: "px-2 py-0.5 rounded-full bg-teal-800 text-white font-bold text-[10px]"
  }, "51.3%")), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right"
  }, formatVND(316272167)), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right"
  }, formatVND(10890000)), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right text-teal-900"
  }, formatVND(327162167)), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right font-mono"
  }, formatVND(893424)), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right font-mono"
  }, formatVND(458365)), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right text-teal-800"
  }, formatVND(160715000)))))), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-slate-400 pt-2"
  }, "Hiển thị 1–8 / 8")));
}

// SCREEN 8: PROPERTIES & ROOMS (CƠ SỞ & PHÒNG)
// ==========================================
function PropertiesScreen({
  data,
  currentUser,
  hasPermission,
  onRefresh,
  showToast
}) {
  const properties = data?.properties || [];
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuPropId, setActiveMenuPropId] = useState(null);

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [deletingProperty, setDeletingProperty] = useState(null);
  const [managingRoomsProperty, setManagingRoomsProperty] = useState(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuPropId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Filter properties
  const filteredProperties = useMemo(() => {
    let list = properties;
    if (currentUser?.propertyScope && currentUser.propertyScope !== 'all') {
      list = list.filter(p => p.id === currentUser.propertyScope);
    }
    if (filterType !== 'all') {
      list = list.filter(p => p.type === filterType);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(p => p.name && p.name.toLowerCase().includes(q) || p.address && p.address.toLowerCase().includes(q) || p.phone && p.phone.includes(q));
    }
    return list;
  }, [properties, filterType, searchQuery, currentUser]);
  const canAdd = currentUser?.role === 'admin' || hasPermission && hasPermission('property', 'add');
  const canEdit = currentUser?.role === 'admin' || hasPermission && hasPermission('property', 'edit');
  const canDelete = currentUser?.role === 'admin' || hasPermission && hasPermission('property', 'delete');
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center justify-between gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "font-extrabold text-xl text-slate-900"
  }, "Cơ sở & phòng"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400"
  }, "Khai báo khách sạn / homestay, loại phòng, bảng giá và danh sách phòng")), canAdd && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setEditingProperty(null);
      setShowModal(true);
    },
    className: "px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-md shadow-teal-700/20 flex items-center gap-1.5 transition transform active:scale-95"
  }, /*#__PURE__*/React.createElement("span", null, "➕ Thêm cơ sở"))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-3"
  }, /*#__PURE__*/React.createElement("select", {
    value: filterType,
    onChange: e => setFilterType(e.target.value),
    className: "px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 shadow-sm"
  }, /*#__PURE__*/React.createElement("option", {
    value: "all"
  }, "Tất cả loại hình"), /*#__PURE__*/React.createElement("option", {
    value: "Khách sạn"
  }, "Khách sạn"), /*#__PURE__*/React.createElement("option", {
    value: "Homestay"
  }, "Homestay"), /*#__PURE__*/React.createElement("option", {
    value: "Villa"
  }, "Villa"), /*#__PURE__*/React.createElement("option", {
    value: "Resort"
  }, "Resort"), /*#__PURE__*/React.createElement("option", {
    value: "Căn hộ"
  }, "Căn hộ")), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-w-[240px] relative"
  }, /*#__PURE__*/React.createElement("span", {
    className: "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs"
  }, "🔍"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Tìm tên cơ sở, địa chỉ, số phòng...",
    value: searchQuery,
    onChange: e => setSearchQuery(e.target.value),
    className: "w-full pl-9 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 shadow-sm"
  }))), filteredProperties.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-4xl mb-3"
  }, "🏨"), /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-base text-slate-800"
  }, "Không tìm thấy cơ sở phù hợp"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400 mt-1"
  }, "Vui lòng thử tìm kiếm khác hoặc thêm cơ sở lưu trú mới."), canAdd && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setEditingProperty(null);
      setShowModal(true);
    },
    className: "mt-4 px-4 py-2 rounded-xl bg-teal-700 text-white font-bold text-xs"
  }, "➕ Thêm cơ sở ngay")) : /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
  }, filteredProperties.map(p => {
    const pRooms = (data?.rooms || []).filter(r => r.propertyId === p.id);
    const pTypes = (data?.roomTypes || []).filter(rt => rt.propertyId === p.id);
    const activeBookings = (data?.bookings || []).filter(b => b.propertyId === p.id && ['checked_in', 'confirmed'].includes(b.status));
    const occupancyRate = pRooms.length > 0 ? Math.round(activeBookings.length / pRooms.length * 100 * 10) / 10 : p.occupancyRate || 0;
    const minPrice = pTypes.length > 0 ? Math.min(...pTypes.map(t => t.priceWeekday || 99999999)) : p.priceFrom || 500000;
    let iconBg = 'bg-teal-600';
    let iconChar = '🏡';
    if (p.type === 'Khách sạn') {
      iconBg = 'bg-sky-600';
      iconChar = '🏨';
    } else if (p.type === 'Villa') {
      iconBg = 'bg-indigo-600';
      iconChar = '🏰';
    } else if (p.type === 'Resort') {
      iconBg = 'bg-emerald-600';
      iconChar = '🌴';
    }
    return /*#__PURE__*/React.createElement("div", {
      key: p.id,
      className: "bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4 hover:shadow-md transition relative flex flex-col justify-between"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "flex items-start justify-between gap-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: `w-11 h-11 rounded-2xl ${iconBg} text-white flex items-center justify-center font-bold text-xl shadow-sm shrink-0`
    }, iconChar), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
      className: "font-extrabold text-base text-slate-900 leading-snug"
    }, p.name), /*#__PURE__*/React.createElement("p", {
      className: "text-[11px] text-slate-400 mt-0.5 line-clamp-1"
    }, p.type, " · ", p.address || 'Chưa cập nhật địa chỉ'))), (canEdit || canDelete) && /*#__PURE__*/React.createElement("div", {
      className: "relative",
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setActiveMenuPropId(activeMenuPropId === p.id ? null : p.id),
      className: "w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500 font-bold transition text-base",
      title: "Tùy chọn cơ sở"
    }, "⋮"), activeMenuPropId === p.id && /*#__PURE__*/React.createElement("div", {
      className: "absolute right-0 top-9 z-30 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 text-xs animate-in fade-in zoom-in-95 duration-100"
    }, canEdit && /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setActiveMenuPropId(null);
        setEditingProperty(p);
        setShowModal(true);
      },
      className: "w-full text-left px-3.5 py-2 hover:bg-teal-50 text-slate-700 hover:text-teal-800 font-semibold flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("span", null, "✏️"), " Chỉnh sửa thông tin"), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setActiveMenuPropId(null);
        setManagingRoomsProperty(p);
      },
      className: "w-full text-left px-3.5 py-2 hover:bg-teal-50 text-slate-700 hover:text-teal-800 font-semibold flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("span", null, "🛏️"), " Quản lý phòng (", pRooms.length, ")"), canDelete && /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setActiveMenuPropId(null);
        setDeletingProperty(p);
      },
      className: "w-full text-left px-3.5 py-2 hover:bg-rose-50 text-rose-600 font-semibold flex items-center gap-2 border-t border-slate-100 mt-1 pt-1.5"
    }, /*#__PURE__*/React.createElement("span", null, "🗑️"), " Xoá cơ sở này")))), /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-4 gap-2 py-3 mt-3 border-y border-slate-100 text-center text-xs"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "text-slate-400 text-[10px]"
    }, "Số phòng"), /*#__PURE__*/React.createElement("div", {
      className: "font-extrabold text-slate-800 text-base"
    }, pRooms.length)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "text-slate-400 text-[10px]"
    }, "Loại phòng"), /*#__PURE__*/React.createElement("div", {
      className: "font-extrabold text-slate-800 text-base"
    }, pTypes.length)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "text-slate-400 text-[10px]"
    }, "Công suất"), /*#__PURE__*/React.createElement("div", {
      className: "font-extrabold text-emerald-600 text-base"
    }, occupancyRate, "%")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "text-slate-400 text-[10px]"
    }, "Giá từ"), /*#__PURE__*/React.createElement("div", {
      className: "font-extrabold text-teal-800 text-sm"
    }, minPrice < 1000000 ? `${Math.round(minPrice / 1000)}k` : `${(minPrice / 1000000).toFixed(1)}tr`))), /*#__PURE__*/React.createElement("div", {
      className: "space-y-1.5 pt-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] font-bold text-slate-400 uppercase tracking-wider"
    }, "Loại phòng:"), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap gap-1.5"
    }, pTypes.length === 0 ? /*#__PURE__*/React.createElement("span", {
      className: "text-xs text-slate-400 italic"
    }, "Chưa có loại phòng nào") : pTypes.map(pt => {
      const countInType = pRooms.filter(r => r.roomTypeId === pt.id).length;
      return /*#__PURE__*/React.createElement("span", {
        key: pt.id,
        className: "px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-[11px] font-semibold flex items-center gap-1"
      }, /*#__PURE__*/React.createElement("span", null, pt.name), /*#__PURE__*/React.createElement("span", {
        className: "w-4 h-4 rounded-full bg-teal-100 text-teal-800 text-[9px] font-extrabold flex items-center justify-center"
      }, countInType));
    })))), /*#__PURE__*/React.createElement("div", {
      className: "pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1.5"
    }, /*#__PURE__*/React.createElement("span", null, "🕒"), /*#__PURE__*/React.createElement("span", null, "Nhận: ", /*#__PURE__*/React.createElement("b", null, p.checkIn || '14:00'), " · Trả: ", /*#__PURE__*/React.createElement("b", null, p.checkOut || '12:00'))), p.phone && /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1 text-slate-500 font-semibold"
    }, /*#__PURE__*/React.createElement("span", null, "📞"), /*#__PURE__*/React.createElement("span", null, p.phone))));
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-400 text-right pt-2 font-medium"
  }, "Hiển thị ", filteredProperties.length, " / ", properties.length, " cơ sở"), showModal && /*#__PURE__*/React.createElement(PropertyFormModal, {
    property: editingProperty,
    onClose: () => {
      setShowModal(false);
      setEditingProperty(null);
    },
    onSaveSuccess: () => {
      setShowModal(false);
      setEditingProperty(null);
      onRefresh();
      showToast(editingProperty ? 'Đã cập nhật cơ sở thành công!' : 'Đã thêm cơ sở mới thành công!');
    },
    showToast: showToast
  }), deletingProperty && /*#__PURE__*/React.createElement(DeletePropertyModal, {
    property: deletingProperty,
    data: data,
    onClose: () => setDeletingProperty(null),
    onDeleteSuccess: () => {
      setDeletingProperty(null);
      onRefresh();
      showToast(`Đã xoá cơ sở "${deletingProperty.name}" thành công!`);
    },
    showToast: showToast
  }), managingRoomsProperty && /*#__PURE__*/React.createElement(ManageRoomsModal, {
    property: managingRoomsProperty,
    data: data,
    onClose: () => setManagingRoomsProperty(null),
    onRefresh: onRefresh,
    showToast: showToast
  }));
}

// ==========================================
// MODAL: THÊM / SỬA CƠ SỞ (ADD / EDIT PROPERTY)
// ==========================================
function PropertyFormModal({
  property,
  onClose,
  onSaveSuccess,
  showToast
}) {
  const isEdit = !!property;
  const [name, setName] = useState(property?.name || '');
  const [type, setType] = useState(property?.type || 'Homestay');
  const [address, setAddress] = useState(property?.address || '');
  const [phone, setPhone] = useState(property?.phone || '');
  const [checkIn, setCheckIn] = useState(property?.checkIn || '14:00');
  const [checkOut, setCheckOut] = useState(property?.checkOut || '12:00');
  const [priceFrom, setPriceFrom] = useState(property?.priceFrom || 500000);

  // Quick room init (only on Add new)
  const [initRooms, setInitRooms] = useState(!isEdit);
  const [rtName, setRtName] = useState('Phòng Tiêu Chuẩn');
  const [rtCapacity, setRtCapacity] = useState(2);
  const [rtPriceWeekday, setRtPriceWeekday] = useState(500000);
  const [rtPriceWeekend, setRtPriceWeekend] = useState(700000);
  const [roomsCount, setRoomsCount] = useState(3);
  const [saving, setSaving] = useState(false);
  const handleSubmit = async e => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Vui lòng nhập tên cơ sở', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        type,
        address: address.trim(),
        phone: phone.trim(),
        checkIn,
        checkOut,
        priceFrom: Number(priceFrom) || 0
      };
      if (!isEdit && initRooms && rtName.trim()) {
        payload.initialRoomType = {
          name: rtName.trim(),
          capacity: Number(rtCapacity) || 2,
          priceWeekday: Number(rtPriceWeekday) || 0,
          priceWeekend: Number(rtPriceWeekend) || 0,
          roomsCount: Number(roomsCount) || 1
        };
      }
      const url = isEdit ? `/api/properties/${property.id}` : '/api/properties';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await authFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (res.ok) {
        onSaveSuccess();
      } else {
        showToast(json.error || 'Có lỗi xảy ra', 'error');
      }
    } catch (err) {
      showToast('Lỗi kết nối: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-teal-50 to-white"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-base shadow-sm"
  }, isEdit ? '✏️' : '🏨'), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "font-extrabold text-base text-slate-900"
  }, isEdit ? 'Chỉnh sửa thông tin cơ sở' : 'Thêm cơ sở lưu trú mới'), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-400"
  }, isEdit ? `Mã cơ sở: ${property.id}` : 'Khai báo khách sạn, homestay, villa nghỉ dưỡng'))), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 font-bold transition"
  }, "✕")), /*#__PURE__*/React.createElement("form", {
    onSubmit: handleSubmit,
    className: "p-6 space-y-4 max-h-[80vh] overflow-y-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sm:col-span-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-slate-700 mb-1"
  }, "Tên cơ sở ", /*#__PURE__*/React.createElement("span", {
    className: "text-rose-500"
  }, "*")), /*#__PURE__*/React.createElement("input", {
    type: "text",
    required: true,
    placeholder: "VD: Homestay Sương Mai, Villa Biển An Bàng...",
    value: name,
    onChange: e => setName(e.target.value),
    className: "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-slate-700 mb-1"
  }, "Loại hình lưu trú"), /*#__PURE__*/React.createElement("select", {
    value: type,
    onChange: e => setType(e.target.value),
    className: "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 bg-white"
  }, /*#__PURE__*/React.createElement("option", {
    value: "Homestay"
  }, "Homestay"), /*#__PURE__*/React.createElement("option", {
    value: "Khách sạn"
  }, "Khách sạn"), /*#__PURE__*/React.createElement("option", {
    value: "Villa"
  }, "Villa biệt thự"), /*#__PURE__*/React.createElement("option", {
    value: "Resort"
  }, "Resort nghỉ dưỡng"), /*#__PURE__*/React.createElement("option", {
    value: "Căn hộ"
  }, "Căn hộ / Condotel"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-slate-700 mb-1"
  }, "Số điện thoại liên hệ"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "VD: 0912345678",
    value: phone,
    onChange: e => setPhone(e.target.value),
    className: "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20"
  })), /*#__PURE__*/React.createElement("div", {
    className: "sm:col-span-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-slate-700 mb-1"
  }, "Địa chỉ chi tiết"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "VD: 15 Hoàng Hoa Thám, P.10, TP. Đà Lạt",
    value: address,
    onChange: e => setAddress(e.target.value),
    className: "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-slate-700 mb-1"
  }, "Giờ nhận phòng"), /*#__PURE__*/React.createElement("input", {
    type: "time",
    value: checkIn,
    onChange: e => setCheckIn(e.target.value),
    className: "w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-slate-700 mb-1"
  }, "Giờ trả phòng"), /*#__PURE__*/React.createElement("input", {
    type: "time",
    value: checkOut,
    onChange: e => setCheckOut(e.target.value),
    className: "w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20"
  })), /*#__PURE__*/React.createElement("div", {
    className: "sm:col-span-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-slate-700 mb-1"
  }, "Giá khởi điểm từ (VNĐ/đêm)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "0",
    step: "50000",
    value: priceFrom,
    onChange: e => setPriceFrom(e.target.value),
    className: "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20"
  }))), !isEdit && /*#__PURE__*/React.createElement("div", {
    className: "mt-4 p-4 rounded-2xl bg-teal-50/60 border border-teal-100 space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2 cursor-pointer"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: initRooms,
    onChange: e => setInitRooms(e.target.checked),
    className: "rounded text-teal-600 focus:ring-teal-500"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-extrabold text-teal-900"
  }, "⚡ Khởi tạo nhanh loại phòng & danh sách phòng ban đầu"))), initRooms && /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3 pt-2 text-xs"
  }, /*#__PURE__*/React.createElement("div", {
    className: "col-span-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-bold text-teal-800"
  }, "Tên loại phòng"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: rtName,
    onChange: e => setRtName(e.target.value),
    placeholder: "VD: Phòng Tiêu Chuẩn / Standard",
    className: "w-full mt-1 px-3 py-2 rounded-lg bg-white border border-teal-200 text-xs font-semibold"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-bold text-teal-800"
  }, "Giá ngày thường"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: rtPriceWeekday,
    onChange: e => setRtPriceWeekday(e.target.value),
    className: "w-full mt-1 px-3 py-2 rounded-lg bg-white border border-teal-200 text-xs font-semibold"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-bold text-teal-800"
  }, "Giá cuối tuần"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: rtPriceWeekend,
    onChange: e => setRtPriceWeekend(e.target.value),
    className: "w-full mt-1 px-3 py-2 rounded-lg bg-white border border-teal-200 text-xs font-semibold"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-bold text-teal-800"
  }, "Sức chứa (khách)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "1",
    max: "20",
    value: rtCapacity,
    onChange: e => setRtCapacity(e.target.value),
    className: "w-full mt-1 px-3 py-2 rounded-lg bg-white border border-teal-200 text-xs font-semibold"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-bold text-teal-800"
  }, "Số phòng tự tạo"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "1",
    max: "20",
    value: roomsCount,
    onChange: e => setRoomsCount(e.target.value),
    className: "w-full mt-1 px-3 py-2 rounded-lg bg-white border border-teal-200 text-xs font-semibold"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-teal-600 block mt-0.5"
  }, "Tạo tự động: 101, 102...")))), /*#__PURE__*/React.createElement("div", {
    className: "pt-4 border-t border-slate-100 flex items-center justify-end gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClose,
    className: "px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
  }, "Hủy bỏ"), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    disabled: saving,
    className: "px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-md shadow-teal-700/20 disabled:opacity-50 flex items-center gap-2"
  }, saving ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"
  }), /*#__PURE__*/React.createElement("span", null, "Đang lưu...")) : /*#__PURE__*/React.createElement("span", null, "💾 ", isEdit ? 'Lưu thay đổi' : 'Tạo cơ sở'))))));
}

// ==========================================
// MODAL: XÁC NHẬN XOÁ CƠ SỞ (DELETE PROPERTY)
// ==========================================
function DeletePropertyModal({
  property,
  data,
  onClose,
  onDeleteSuccess,
  showToast
}) {
  const [deleting, setDeleting] = useState(false);
  const [forceConfirmed, setForceConfirmed] = useState(false);
  const pRooms = (data?.rooms || []).filter(r => r.propertyId === property.id);
  const activeBookings = (data?.bookings || []).filter(b => b.propertyId === property.id && !['cancelled', 'checked_out'].includes(b.status));
  const hasActiveBookings = activeBookings.length > 0;
  const handleDelete = async () => {
    if (hasActiveBookings && !forceConfirmed) {
      showToast('Vui lòng tích xác nhận xoá ép buộc các đơn đang hoạt động!', 'error');
      return;
    }
    setDeleting(true);
    try {
      const url = `/api/properties/${property.id}${forceConfirmed ? '?force=true' : ''}`;
      const res = await authFetch(url, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (res.ok) {
        onDeleteSuccess();
      } else {
        showToast(json.error || 'Không thể xoá cơ sở', 'error');
      }
    } catch (err) {
      showToast('Lỗi kết nối: ' + err.message, 'error');
    } finally {
      setDeleting(false);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center text-2xl mx-auto shadow-sm"
  }, "⚠️"), /*#__PURE__*/React.createElement("div", {
    className: "text-center"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-extrabold text-lg text-slate-900"
  }, "Xác nhận xoá cơ sở"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-500 mt-1"
  }, "Bạn có chắc chắn muốn xoá cơ sở ", /*#__PURE__*/React.createElement("b", {
    className: "text-slate-800"
  }, property.name), "?")), /*#__PURE__*/React.createElement("div", {
    className: "p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1.5 text-slate-600"
  }, /*#__PURE__*/React.createElement("div", null, "📍 ", /*#__PURE__*/React.createElement("b", null, "Địa chỉ:"), " ", property.address || 'Không có'), /*#__PURE__*/React.createElement("div", null, "🛏️ ", /*#__PURE__*/React.createElement("b", null, "Phòng trực thuộc:"), " ", pRooms.length, " phòng sẽ bị xoá cùng cơ sở này.")), hasActiveBookings ? /*#__PURE__*/React.createElement("div", {
    className: "p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs space-y-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-bold text-rose-800 flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", null, "🚨"), " Cảnh báo: Đang có ", activeBookings.length, " đơn đặt phòng hoạt động!"), /*#__PURE__*/React.createElement("p", {
    className: "text-rose-700 text-[11px]"
  }, "Cơ sở này đang có các đơn khách đang ở hoặc đã xác nhận đặt phòng. Nếu tiếp tục, toàn bộ dữ liệu này sẽ bị huỷ bỏ hoàn toàn."), /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2 cursor-pointer pt-1"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: forceConfirmed,
    onChange: e => setForceConfirmed(e.target.checked),
    className: "rounded text-rose-600 focus:ring-rose-500"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-bold text-rose-900"
  }, "Tôi hiểu và đồng ý xoá ép buộc cơ sở này"))) : null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 pt-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClose,
    className: "flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50"
  }, "Hủy bỏ"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    disabled: deleting || hasActiveBookings && !forceConfirmed,
    onClick: handleDelete,
    className: "flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
  }, deleting ? /*#__PURE__*/React.createElement("span", null, "Đang xoá...") : /*#__PURE__*/React.createElement("span", null, "🗑️ Xoá vĩnh viễn")))));
}

// ==========================================
// MODAL: QUẢN LÝ PHÒNG & BẢNG GIÁ (MANAGE ROOMS)
// ==========================================
function ManageRoomsModal({
  property,
  data,
  onClose,
  onRefresh,
  showToast
}) {
  const [activeTab, setActiveTab] = useState('rooms');
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [showAddType, setShowAddType] = useState(false);

  // New Room State
  const [roomName, setRoomName] = useState('');
  const [roomTypeId, setRoomTypeId] = useState('');
  const [roomFloor, setRoomFloor] = useState(1);

  // New Room Type State
  const [typeName, setTypeName] = useState('');
  const [typeCapacity, setTypeCapacity] = useState(2);
  const [typePriceWeekday, setTypePriceWeekday] = useState(500000);
  const [typePriceWeekend, setTypePriceWeekend] = useState(700000);
  const pRooms = (data?.rooms || []).filter(r => r.propertyId === property.id);
  const pTypes = (data?.roomTypes || []).filter(rt => rt.propertyId === property.id);
  useEffect(() => {
    if (pTypes.length > 0 && !roomTypeId) {
      setRoomTypeId(pTypes[0].id);
    }
  }, [pTypes]);

  // Add Room
  const handleAddRoom = async e => {
    e.preventDefault();
    if (!roomName.trim() || !roomTypeId) {
      showToast('Vui lòng nhập tên phòng và chọn loại phòng', 'error');
      return;
    }
    try {
      const res = await authFetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: roomName.trim(),
          propertyId: property.id,
          roomTypeId,
          floor: Number(roomFloor) || 1
        })
      });
      const json = await res.json();
      if (res.ok) {
        showToast(`Đã thêm phòng ${roomName}!`);
        setRoomName('');
        setShowAddRoom(false);
        onRefresh();
      } else {
        showToast(json.error || 'Lỗi thêm phòng', 'error');
      }
    } catch (err) {
      showToast('Lỗi: ' + err.message, 'error');
    }
  };

  // Delete Room
  const handleDeleteRoom = async (roomId, rName) => {
    if (!confirm(`Bạn có chắc muốn xoá phòng "${rName}"?`)) return;
    try {
      const res = await authFetch(`/api/rooms/${roomId}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (res.ok) {
        showToast(`Đã xoá phòng ${rName}!`);
        onRefresh();
      } else {
        showToast(json.error || 'Lỗi xoá phòng', 'error');
      }
    } catch (err) {
      showToast('Lỗi: ' + err.message, 'error');
    }
  };

  // Add Room Type
  const handleAddType = async e => {
    e.preventDefault();
    if (!typeName.trim()) {
      showToast('Vui lòng nhập tên loại phòng', 'error');
      return;
    }
    try {
      const res = await authFetch('/api/room-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: typeName.trim(),
          propertyId: property.id,
          capacity: Number(typeCapacity) || 2,
          priceWeekday: Number(typePriceWeekday) || 0,
          priceWeekend: Number(typePriceWeekend) || 0
        })
      });
      const json = await res.json();
      if (res.ok) {
        showToast(`Đã thêm loại phòng ${typeName}!`);
        setTypeName('');
        setShowAddType(false);
        onRefresh();
      } else {
        showToast(json.error || 'Lỗi thêm loại phòng', 'error');
      }
    } catch (err) {
      showToast('Lỗi: ' + err.message, 'error');
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-teal-50 to-white"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-base shadow-sm"
  }, "🛏️"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "font-extrabold text-base text-slate-900"
  }, "Quản lý phòng: ", property.name), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-400"
  }, pRooms.length, " phòng · ", pTypes.length, " loại phòng"))), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 font-bold transition"
  }, "✕")), /*#__PURE__*/React.createElement("div", {
    className: "px-6 pt-3 border-b border-slate-100 flex gap-4 text-xs font-bold"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setActiveTab('rooms'),
    className: `pb-2.5 border-b-2 transition ${activeTab === 'rooms' ? 'border-teal-700 text-teal-800' : 'border-transparent text-slate-400 hover:text-slate-700'}`
  }, "Danh sách phòng (", pRooms.length, ")"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setActiveTab('types'),
    className: `pb-2.5 border-b-2 transition ${activeTab === 'types' ? 'border-teal-700 text-teal-800' : 'border-transparent text-slate-400 hover:text-slate-700'}`
  }, "Loại phòng & Bảng giá (", pTypes.length, ")")), /*#__PURE__*/React.createElement("div", {
    className: "p-6 max-h-[70vh] overflow-y-auto space-y-4"
  }, activeTab === 'rooms' && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-slate-700"
  }, "Các phòng đang hoạt động:"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowAddRoom(!showAddRoom),
    className: "px-3 py-1.5 rounded-lg bg-teal-700 text-white font-bold text-xs flex items-center gap-1"
  }, showAddRoom ? '✕ Đóng form' : '➕ Thêm phòng')), showAddRoom && /*#__PURE__*/React.createElement("form", {
    onSubmit: handleAddRoom,
    className: "p-3.5 mb-4 rounded-2xl bg-teal-50/70 border border-teal-100 grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-teal-900 block mb-1"
  }, "Số / Tên phòng"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    required: true,
    placeholder: "VD: 101, 202, VIP1",
    value: roomName,
    onChange: e => setRoomName(e.target.value),
    className: "w-full px-2.5 py-1.5 rounded-lg bg-white border border-teal-200 text-xs font-semibold"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-teal-900 block mb-1"
  }, "Loại phòng"), /*#__PURE__*/React.createElement("select", {
    value: roomTypeId,
    onChange: e => setRoomTypeId(e.target.value),
    className: "w-full px-2.5 py-1.5 rounded-lg bg-white border border-teal-200 text-xs font-semibold"
  }, pTypes.map(t => /*#__PURE__*/React.createElement("option", {
    key: t.id,
    value: t.id
  }, t.name)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-teal-900 block mb-1"
  }, "Tầng"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: roomFloor,
    onChange: e => setRoomFloor(e.target.value),
    className: "w-full px-2.5 py-1.5 rounded-lg bg-white border border-teal-200 text-xs font-semibold"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-end"
  }, /*#__PURE__*/React.createElement("button", {
    type: "submit",
    className: "w-full py-1.5 rounded-lg bg-teal-800 text-white font-bold text-xs"
  }, "💾 Lưu phòng"))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5"
  }, pRooms.map(r => {
    const rType = pTypes.find(t => t.id === r.roomTypeId);
    return /*#__PURE__*/React.createElement("div", {
      key: r.id,
      className: "p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "font-extrabold text-sm text-slate-800"
    }, r.name), /*#__PURE__*/React.createElement("div", {
      className: "text-[10px] text-slate-400 truncate max-w-[100px]"
    }, rType?.name || 'Phòng')), /*#__PURE__*/React.createElement("button", {
      onClick: () => handleDeleteRoom(r.id, r.name),
      className: "w-6 h-6 rounded-lg hover:bg-rose-100 text-slate-300 hover:text-rose-600 flex items-center justify-center transition text-xs",
      title: "Xoá phòng"
    }, "🗑️"));
  }))), activeTab === 'types' && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-slate-700"
  }, "Các loại phòng & bảng giá:"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowAddType(!showAddType),
    className: "px-3 py-1.5 rounded-lg bg-teal-700 text-white font-bold text-xs flex items-center gap-1"
  }, showAddType ? '✕ Đóng form' : '➕ Thêm loại phòng')), showAddType && /*#__PURE__*/React.createElement("form", {
    onSubmit: handleAddType,
    className: "p-3.5 mb-4 rounded-2xl bg-teal-50/70 border border-teal-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs"
  }, /*#__PURE__*/React.createElement("div", {
    className: "col-span-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-teal-900 block mb-1"
  }, "Tên loại phòng"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    required: true,
    placeholder: "VD: Deluxe Ban Công View Núi",
    value: typeName,
    onChange: e => setTypeName(e.target.value),
    className: "w-full px-2.5 py-1.5 rounded-lg bg-white border border-teal-200 text-xs font-semibold"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-teal-900 block mb-1"
  }, "Giá ngày thường"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: typePriceWeekday,
    onChange: e => setTypePriceWeekday(e.target.value),
    className: "w-full px-2.5 py-1.5 rounded-lg bg-white border border-teal-200 text-xs font-semibold"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-teal-900 block mb-1"
  }, "Giá cuối tuần"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: typePriceWeekend,
    onChange: e => setTypePriceWeekend(e.target.value),
    className: "w-full px-2.5 py-1.5 rounded-lg bg-white border border-teal-200 text-xs font-semibold"
  })), /*#__PURE__*/React.createElement("div", {
    className: "col-span-2 sm:col-span-4 flex justify-end"
  }, /*#__PURE__*/React.createElement("button", {
    type: "submit",
    className: "px-4 py-1.5 rounded-lg bg-teal-800 text-white font-bold text-xs"
  }, "💾 Lưu loại phòng"))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, pTypes.map(t => /*#__PURE__*/React.createElement("div", {
    key: t.id,
    className: "p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "font-extrabold text-sm text-slate-800"
  }, t.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-slate-400 mt-0.5"
  }, "Sức chứa: ", /*#__PURE__*/React.createElement("b", null, t.capacity || 2, " khách"))), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-teal-700 font-extrabold"
  }, formatVND(t.priceWeekday), " ", /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-slate-400 font-normal"
  }, "/ đêm thường")), /*#__PURE__*/React.createElement("div", {
    className: "text-amber-600 font-bold text-[11px]"
  }, formatVND(t.priceWeekend), " ", /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-slate-400 font-normal"
  }, "/ cuối tuần")))))))), /*#__PURE__*/React.createElement("div", {
    className: "px-6 py-3 border-t border-slate-100 flex justify-end bg-slate-50"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClose,
    className: "px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs"
  }, "Đóng"))));
}

// ==========================================
// ==========================================
// SCREEN 9: USERS (NGƯỜI DÙNG & PHÂN QUYỀN)
// ==========================================
function UsersScreen({
  data,
  onOpenNewUser,
  onEditUser,
  onRefresh,
  showToast
}) {
  const users = data?.users || [];
  const [filterRole, setFilterRole] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const filteredUsers = useMemo(() => {
    let list = users;
    if (filterRole !== 'all') {
      list = list.filter(u => u.role === filterRole);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(u => u.name && u.name.toLowerCase().includes(q) || u.username && u.username.toLowerCase().includes(q) || u.email && u.email.toLowerCase().includes(q) || u.phone && u.phone.includes(q));
    }
    return list;
  }, [users, filterRole, searchQuery]);
  const getInitials = name => {
    if (!name) return 'TV';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };
  const getAvatarColor = idx => {
    const colors = ['bg-rose-600', 'bg-teal-600', 'bg-blue-600', 'bg-amber-600', 'bg-purple-600', 'bg-emerald-600'];
    return colors[idx % colors.length];
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center justify-between gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "font-extrabold text-xl text-slate-900"
  }, "Người dùng"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400"
  }, "Tài khoản, vai trò, phạm vi cơ sở và ma trận quyền")), /*#__PURE__*/React.createElement("button", {
    onClick: onOpenNewUser,
    className: "px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-md shadow-teal-700/20 flex items-center gap-1.5 transition active:scale-95"
  }, /*#__PURE__*/React.createElement("span", null, "➕ Thêm người dùng"))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-3"
  }, /*#__PURE__*/React.createElement("select", {
    value: filterRole,
    onChange: e => setFilterRole(e.target.value),
    className: "px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 shadow-sm"
  }, /*#__PURE__*/React.createElement("option", {
    value: "all"
  }, "Tất cả vai trò"), /*#__PURE__*/React.createElement("option", {
    value: "admin"
  }, "Quản trị viên"), /*#__PURE__*/React.createElement("option", {
    value: "user"
  }, "Người dùng")), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-w-[220px] relative"
  }, /*#__PURE__*/React.createElement("span", {
    className: "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs"
  }, "🔍"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Tìm tên, tài khoản, email...",
    value: searchQuery,
    onChange: e => setSearchQuery(e.target.value),
    className: "w-full pl-9 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 shadow-sm"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full text-xs text-left border-collapse"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    className: "border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]"
  }, /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2"
  }, "Họ tên"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2"
  }, "Tài khoản"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2"
  }, "Vai trò"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2"
  }, "Phạm vi cơ sở"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2"
  }, "Quyền"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2"
  }, "Điện thoại"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2 text-center"
  }, "Trạng thái"), /*#__PURE__*/React.createElement("th", {
    className: "py-3 px-2 text-right"
  }))), /*#__PURE__*/React.createElement("tbody", {
    className: "divide-y divide-slate-100 font-medium"
  }, filteredUsers.map((u, idx) => /*#__PURE__*/React.createElement("tr", {
    key: u.id,
    onClick: () => onEditUser && onEditUser(u),
    className: "hover:bg-slate-50/70 transition cursor-pointer"
  }, /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 flex items-center gap-2.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: `w-8 h-8 rounded-full ${getAvatarColor(idx)} text-white font-extrabold text-[11px] flex items-center justify-center shrink-0 shadow-sm`
  }, getInitials(u.name)), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-slate-900"
  }, u.name)), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 font-mono font-bold text-slate-700"
  }, u.username), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2"
  }, u.role === 'admin' ? /*#__PURE__*/React.createElement("span", {
    className: "px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-extrabold text-[10px] inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("span", null, "👤"), " ", u.roleLabel || 'Quản trị viên') : /*#__PURE__*/React.createElement("span", {
    className: "px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px]"
  }, u.roleLabel || 'Người dùng')), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 font-semibold text-slate-600"
  }, u.propertyScopeLabel || 'Tất cả'), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-slate-600 max-w-xs truncate text-[11px]"
  }, u.permissionsSummary || 'Theo ma trận quyền'), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 font-mono text-slate-500"
  }, u.phone || '09xxxxxxxx'), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-center"
  }, /*#__PURE__*/React.createElement("span", {
    className: "px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]"
  }, u.status === 'inactive' ? 'Tạm khoá' : 'Hoạt động')), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right relative",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onEditUser && onEditUser(u),
    className: "w-7 h-7 rounded-xl hover:bg-slate-100 text-slate-400 font-bold inline-flex items-center justify-center"
  }, "⋮"))))))), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", null, "Hiển thị 1–", filteredUsers.length, " / ", filteredUsers.length)));
}

// ==========================================
// SCREEN 10: SETTINGS (CÀI ĐẶT) - IMAGE 2
// ==========================================
function SettingsScreen({
  data,
  onRefresh,
  showToast
}) {
  const [settings, setSettings] = useState(data?.settings || {});
  const [saving, setSaving] = useState(false);
  const [categoryTab, setCategoryTab] = useState('payment_methods');
  const handleSave = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await authFetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        showToast('✅ Đã lưu cài đặt hệ thống thành công!');
        onRefresh();
      }
    } catch (e) {
      showToast('Lỗi: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };
  const toggleWeekendNight = dayCode => {
    const cur = settings.weekendNights || ['fri', 'sat'];
    if (cur.includes(dayCode)) {
      setSettings({
        ...settings,
        weekendNights: cur.filter(d => d !== dayCode)
      });
    } else {
      setSettings({
        ...settings,
        weekendNights: [...cur, dayCode]
      });
    }
  };
  const paymentMethodsList = [{
    name: 'Tiền mặt',
    note: '',
    count: 76
  }, {
    name: 'Chuyển khoản',
    note: '',
    count: 97
  }, {
    name: 'Thẻ POS',
    note: '',
    count: 60
  }, {
    name: 'Ví MoMo',
    note: '',
    count: 52
  }, {
    name: 'OTA thu hộ',
    note: '',
    count: 277
  }];
  const sourcesList = [{
    name: 'Điện thoại / Zalo',
    note: 'Đặt trực tiếp',
    count: 98
  }, {
    name: 'Booking.com',
    note: 'Kênh OTA quốc tế',
    count: 72
  }, {
    name: 'Agoda',
    note: 'Kênh OTA châu Á',
    count: 70
  }, {
    name: 'Airbnb',
    note: 'Homestay & Căn hộ',
    count: 46
  }, {
    name: 'Khách vãng lai',
    note: 'Walk-in',
    count: 30
  }];
  const servicesList = [{
    name: 'Phụ thu nhận sớm / trả muộn',
    note: 'Theo giờ',
    count: 42
  }, {
    name: 'Thêm giường phụ',
    note: 'Extra bed / đêm',
    count: 18
  }, {
    name: 'Thuê xe máy',
    note: 'Xe ga / số',
    count: 35
  }, {
    name: 'Ăn sáng',
    note: 'Buffet / set',
    count: 54
  }, {
    name: 'Xe đưa đón sân bay',
    note: '4-7 chỗ',
    count: 22
  }, {
    name: 'Giặt là',
    note: 'Theo kg',
    count: 38
  }, {
    name: 'Minibar',
    note: 'Nước & snack',
    count: 65
  }];
  return /*#__PURE__*/React.createElement("form", {
    onSubmit: handleSave,
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "font-extrabold text-xl text-slate-900"
  }, "Cài đặt"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400"
  }, "Thông tin đơn vị, thông số vận hành và danh mục dùng chung")), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    disabled: saving,
    className: "px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-md shadow-teal-700/20 transition active:scale-95 flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", null, "💾"), /*#__PURE__*/React.createElement("span", null, saving ? 'Đang lưu...' : 'Lưu cài đặt'))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 lg:grid-cols-2 gap-6 items-start"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-extrabold text-sm text-slate-800 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "🏨 Thông tin đơn vị")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-bold text-slate-600 block mb-1"
  }, "Tên trên menu (ngắn)"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: settings.appName || 'GSHEETS HOME',
    onChange: e => setSettings({
      ...settings,
      appName: e.target.value
    }),
    className: "w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-bold text-slate-600 block mb-1"
  }, "Khẩu hiệu"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: settings.slogan || 'Homestay | Nghỉ Dưỡng',
    onChange: e => setSettings({
      ...settings,
      slogan: e.target.value
    }),
    className: "w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-bold text-slate-600 block mb-1"
  }, "Tên đơn vị (in trên phiếu, báo cáo)"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: settings.legalName || 'GSHEETS HOME',
    onChange: e => setSettings({
      ...settings,
      legalName: e.target.value
    }),
    className: "w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center mb-1"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-bold text-slate-600"
  }, "Logo công ty (link ảnh hoặc link chia sẻ Google Drive)"), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-slate-400"
  }, "Xem trước")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: settings.logoUrl || 'https://cdn-icons-png.flaticon.com/512/2038/2038136.png',
    onChange: e => setSettings({
      ...settings,
      logoUrl: e.target.value
    }),
    className: "w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
  }), /*#__PURE__*/React.createElement("div", {
    className: "w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center p-1 bg-white shrink-0 shadow-sm"
  }, /*#__PURE__*/React.createElement("img", {
    src: settings.logoUrl || 'https://cdn-icons-png.flaticon.com/512/2038/2038136.png',
    alt: "Logo",
    className: "w-full h-full object-contain"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-bold text-slate-600 block mb-1"
  }, "Điện thoại"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: settings.phone || '09xxxxxxxx',
    onChange: e => setSettings({
      ...settings,
      phone: e.target.value
    }),
    className: "w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-bold text-slate-600 block mb-1"
  }, "Địa chỉ"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: settings.address || '',
    placeholder: "Nhập địa chỉ...",
    onChange: e => setSettings({
      ...settings,
      address: e.target.value
    }),
    className: "w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-bold text-slate-600 block mb-1"
  }, "Ảnh banner trang Tổng quan (link, tuỳ chọn)"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: settings.bannerUrl || 'https://ezcloud.vn/wp-content/uploads/2019/03/thiet-ke-homestay-don-gian.webp',
    onChange: e => setSettings({
      ...settings,
      bannerUrl: e.target.value
    }),
    className: "w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
  })), /*#__PURE__*/React.createElement("div", {
    className: "pt-4 border-t border-slate-100 space-y-4"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-extrabold text-sm text-slate-800 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "⚙️ Thông số vận hành")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-bold text-slate-600 block mb-1"
  }, "Giờ nhận phòng mặc định"), /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: settings.defaultCheckInTime || '02:00 CH',
    onChange: e => setSettings({
      ...settings,
      defaultCheckInTime: e.target.value
    }),
    className: "w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 pr-8"
  }), /*#__PURE__*/React.createElement("span", {
    className: "absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 text-xs"
  }, "🕒"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-bold text-slate-600 block mb-1"
  }, "Giờ trả phòng mặc định"), /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: settings.defaultCheckOutTime || '12:00 CH',
    onChange: e => setSettings({
      ...settings,
      defaultCheckOutTime: e.target.value
    }),
    className: "w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 pr-8"
  }), /*#__PURE__*/React.createElement("span", {
    className: "absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 text-xs"
  }, "🕒")))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-bold text-slate-600 block mb-2"
  }, "Đêm tính giá cuối tuần:"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, [{
    id: 'mon',
    label: 'Đêm Thứ hai'
  }, {
    id: 'tue',
    label: 'Đêm Thứ ba'
  }, {
    id: 'wed',
    label: 'Đêm Thứ tư'
  }, {
    id: 'thu',
    label: 'Đêm Thứ năm'
  }, {
    id: 'fri',
    label: 'Đêm Thứ sáu'
  }, {
    id: 'sat',
    label: 'Đêm Thứ bảy'
  }, {
    id: 'sun',
    label: 'Đêm Chủ nhật'
  }].map(d => {
    const isChecked = (settings.weekendNights || ['fri', 'sat']).includes(d.id);
    return /*#__PURE__*/React.createElement("button", {
      type: "button",
      key: d.id,
      onClick: () => toggleWeekendNight(d.id),
      className: `px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${isChecked ? 'bg-teal-700 text-white border-teal-700 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200'}`
    }, /*#__PURE__*/React.createElement("span", null, isChecked ? '✓' : ''), /*#__PURE__*/React.createElement("span", null, d.label));
  })), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-slate-400 mt-2 block"
  }, "Mặc định Đêm Thứ sáu và Thứ bảy dùng \"Giá cuối tuần\" của loại phòng.")), /*#__PURE__*/React.createElement("div", {
    className: "pt-2 flex justify-end"
  }, /*#__PURE__*/React.createElement("button", {
    type: "submit",
    disabled: saving,
    className: "px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-md shadow-teal-700/20 transition flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", null, "💾"), /*#__PURE__*/React.createElement("span", null, "Lưu cài đặt"))))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-slate-400 font-bold"
  }, ":::"), /*#__PURE__*/React.createElement("h4", {
    className: "font-extrabold text-sm text-slate-900"
  }, "Danh mục")), /*#__PURE__*/React.createElement("div", {
    className: "flex border-b border-slate-200 text-xs font-bold"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setCategoryTab('sources'),
    className: `pb-2.5 px-3.5 transition border-b-2 ${categoryTab === 'sources' ? 'border-teal-700 text-teal-800 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'}`
  }, "Nguồn đặt"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setCategoryTab('services'),
    className: `pb-2.5 px-3.5 transition border-b-2 ${categoryTab === 'services' ? 'border-teal-700 text-teal-800 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'}`
  }, "Dịch vụ"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setCategoryTab('payment_methods'),
    className: `pb-2.5 px-3.5 transition border-b-2 ${categoryTab === 'payment_methods' ? 'border-teal-700 text-teal-800 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'}`
  }, "Phương thức thanh toán")), /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full text-xs text-left border-collapse"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    className: "border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]"
  }, /*#__PURE__*/React.createElement("th", {
    className: "py-2.5 px-2"
  }, "Tên"), /*#__PURE__*/React.createElement("th", {
    className: "py-2.5 px-2"
  }, "Ghi chú"), /*#__PURE__*/React.createElement("th", {
    className: "py-2.5 px-2 text-right"
  }, "Số đơn dùng"), /*#__PURE__*/React.createElement("th", {
    className: "py-2.5 px-2 text-right"
  }))), /*#__PURE__*/React.createElement("tbody", {
    className: "divide-y divide-slate-100 font-medium text-slate-700"
  }, (categoryTab === 'payment_methods' ? paymentMethodsList : categoryTab === 'sources' ? sourcesList : servicesList).map((item, idx) => /*#__PURE__*/React.createElement("tr", {
    key: idx,
    className: "hover:bg-slate-50/60"
  }, /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 font-bold text-slate-900"
  }, item.name), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-slate-400"
  }, item.note), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right font-mono font-bold text-slate-600"
  }, item.count), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "w-7 h-7 rounded-xl hover:bg-slate-100 text-slate-400 font-bold inline-flex items-center justify-center"
  }, "⋮"))))))), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", null, "Hiển thị 1–", categoryTab === 'payment_methods' ? paymentMethodsList.length : categoryTab === 'sources' ? sourcesList.length : servicesList.length, " / ", categoryTab === 'payment_methods' ? paymentMethodsList.length : categoryTab === 'sources' ? sourcesList.length : servicesList.length)))));
}

// SCREEN 11: GUIDE (HƯỚNG DẪN SỬ DỤNG)
// ==========================================
function GuideScreen({
  onNavigate
}) {
  const [activeSection, setActiveSection] = useState('quick_start');
  const menuItems = [{
    id: 'quick_start',
    label: 'Bắt đầu nhanh',
    icon: '🚀'
  }, {
    id: 'calendar',
    label: 'Lịch phòng',
    icon: '📅'
  }, {
    id: 'booking',
    label: 'Đặt phòng',
    icon: '📝'
  }, {
    id: 'group_booking',
    label: 'Đặt nhiều phòng (đoàn)',
    icon: '👥'
  }, {
    id: 'checkin_checkout',
    label: 'Nhận / trả phòng',
    icon: '🔑'
  }, {
    id: 'payments',
    label: 'Thu tiền',
    icon: '💵'
  }, {
    id: 'housekeeping',
    label: 'Buồng phòng',
    icon: '🧹'
  }, {
    id: 'customers',
    label: 'Khách hàng',
    icon: '👤'
  }, {
    id: 'properties',
    label: 'Cơ sở & phòng',
    icon: '🏢'
  }, {
    id: 'reports',
    label: 'Tổng quan & Báo cáo',
    icon: '📊'
  }, {
    id: 'permissions',
    label: 'Phân quyền',
    icon: '🔒'
  }, {
    id: 'settings',
    label: 'Dữ liệu & cài đặt',
    icon: '⚙️'
  }, {
    id: 'shortcuts',
    label: 'Phím tắt',
    icon: '⌨️'
  }, {
    id: 'faq',
    label: 'Câu hỏi thường gặp',
    icon: '❓'
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "font-extrabold text-2xl text-slate-900"
  }, "Hướng dẫn sử dụng"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400 mt-1"
  }, "Các thao tác chính của phần mềm quản lý đặt phòng khách sạn & homestay")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 lg:grid-cols-4 gap-6 items-start"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-4 border border-slate-200/80 shadow-sm space-y-2 sticky top-6"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] font-extrabold uppercase text-slate-400 px-3 tracking-wider"
  }, "Nội dung"), /*#__PURE__*/React.createElement("nav", {
    className: "space-y-1"
  }, menuItems.map(item => /*#__PURE__*/React.createElement("button", {
    key: item.id,
    onClick: () => setActiveSection(item.id),
    className: `w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition text-left ${activeSection === item.id ? 'bg-teal-50 text-teal-800 shadow-sm font-extrabold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm"
  }, item.icon), /*#__PURE__*/React.createElement("span", {
    className: "truncate"
  }, item.label))))), /*#__PURE__*/React.createElement("div", {
    className: "lg:col-span-3 space-y-6"
  }, (activeSection === 'quick_start' || activeSection === 'all') && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-5"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-extrabold text-base text-slate-900 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "🚀 Bắt đầu nhanh")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex flex-col justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "w-7 h-7 rounded-full bg-teal-700 text-white font-extrabold text-xs flex items-center justify-center mb-3 shadow-sm"
  }, "1"), /*#__PURE__*/React.createElement("h5", {
    className: "font-bold text-xs text-slate-900 mb-1"
  }, "Khai báo cơ sở"), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-500 leading-relaxed"
  }, "Vào ", /*#__PURE__*/React.createElement("b", null, "Cơ sở & phòng"), " → ", /*#__PURE__*/React.createElement("b", null, "Thêm cơ sở"), ": nhập loại phòng, giá ngày thường / cuối tuần và danh sách phòng."))), /*#__PURE__*/React.createElement("div", {
    className: "p-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex flex-col justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "w-7 h-7 rounded-full bg-teal-700 text-white font-extrabold text-xs flex items-center justify-center mb-3 shadow-sm"
  }, "2"), /*#__PURE__*/React.createElement("h5", {
    className: "font-bold text-xs text-slate-900 mb-1"
  }, "Danh mục"), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-500 leading-relaxed"
  }, "Vào ", /*#__PURE__*/React.createElement("b", null, "Cài đặt → Danh mục"), " để sửa Nguồn đặt, Dịch vụ (kèm đơn giá) và Phương thức thanh toán."))), /*#__PURE__*/React.createElement("div", {
    className: "p-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex flex-col justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "w-7 h-7 rounded-full bg-teal-700 text-white font-extrabold text-xs flex items-center justify-center mb-3 shadow-sm"
  }, "3"), /*#__PURE__*/React.createElement("h5", {
    className: "font-bold text-xs text-slate-900 mb-1"
  }, "Đặt phòng"), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-500 leading-relaxed"
  }, "Mở ", /*#__PURE__*/React.createElement("b", null, "Lịch phòng"), ": kéo chuột trên dòng phòng qua các ngày khách ở → điền khách, tiền tự tính."))), /*#__PURE__*/React.createElement("div", {
    className: "p-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex flex-col justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "w-7 h-7 rounded-full bg-teal-700 text-white font-extrabold text-xs flex items-center justify-center mb-3 shadow-sm"
  }, "4"), /*#__PURE__*/React.createElement("h5", {
    className: "font-bold text-xs text-slate-900 mb-1"
  }, "Vận hành"), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-500 leading-relaxed"
  }, "Hằng ngày xem ", /*#__PURE__*/React.createElement("b", null, "Tổng quan"), ": nhận phòng, trả phòng, thu tiền và xử lý mục ", /*#__PURE__*/React.createElement("b", null, "Cần chú ý"), "."))))), (activeSection === 'calendar' || activeSection === 'all' || activeSection === 'quick_start') && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-4"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-extrabold text-base text-slate-900 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "📅 Lịch phòng")), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 leading-relaxed"
  }, "Mỗi dòng là 1 phòng, mỗi cột là 1 ngày. Thanh màu là 1 đơn, bắt đầu từ giữa ngày nhận và kết thúc ở giữa ngày trả (đúng giờ nhận – trả phòng thực tế)."), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2.5 text-xs text-slate-700 pt-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-2.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-emerald-600 font-bold shrink-0 mt-0.5"
  }, "✓"), /*#__PURE__*/React.createElement("span", null, "Màu thanh: ", /*#__PURE__*/React.createElement("b", null, "vàng"), " Giữ chỗ · ", /*#__PURE__*/React.createElement("b", null, "xanh dương"), " Đã xác nhận · ", /*#__PURE__*/React.createElement("b", null, "xanh lá"), " Đang ở · ", /*#__PURE__*/React.createElement("b", null, "xám"), " Đã trả phòng; ", /*#__PURE__*/React.createElement("b", null, "chấm đỏ góc phải"), " = đơn còn nợ tiền.")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-2.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-emerald-600 font-bold shrink-0 mt-0.5"
  }, "✓"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, "Kéo chuột (hoặc chạm)"), " trên vùng trống của 1 phòng để chọn các đêm → mở ngay form ", /*#__PURE__*/React.createElement("b", null, "Đặt phòng mới"), " với phòng và ngày đã điền sẵn.")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-2.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-emerald-600 font-bold shrink-0 mt-0.5"
  }, "✓"), /*#__PURE__*/React.createElement("span", null, "Bấm vào thanh màu để xem chi tiết đơn, thu tiền, nhận / trả phòng và in phiếu xác nhận đặt phòng.")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-2.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-emerald-600 font-bold shrink-0 mt-0.5"
  }, "✓"), /*#__PURE__*/React.createElement("span", null, "Dùng ", /*#__PURE__*/React.createElement("b", null, "‹ Hôm nay ›"), " để di chuyển, nút ngày để nhảy tới ngày bất kỳ, chọn ", /*#__PURE__*/React.createElement("b", null, "7 / 14 / 30 ngày"), " để đổi độ rộng.")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-2.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-emerald-600 font-bold shrink-0 mt-0.5"
  }, "✓"), /*#__PURE__*/React.createElement("span", null, "Dòng tên cơ sở hiển thị số phòng còn trống từng ngày; ô có biểu tượng cấm là đã kín phòng. Phòng đang bảo trì có nền gạch chéo và không cho đặt."))), /*#__PURE__*/React.createElement("div", {
    className: "p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2 mt-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-base shrink-0"
  }, "💡"), /*#__PURE__*/React.createElement("span", null, "Ở ", /*#__PURE__*/React.createElement("b", null, "Tất cả cơ sở"), " cho tick nhiều cơ sở cùng lúc; trong ", /*#__PURE__*/React.createElement("b", null, "Lọc thêm"), " có lọc Loại phòng và Trạng thái đơn (muốn xem lại đơn đã huỷ thì tick \"Đã huỷ\")."))), (activeSection === 'booking' || activeSection === 'all' || activeSection === 'quick_start') && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-4"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-extrabold text-base text-slate-900 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "📝 Đặt phòng")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2.5 text-xs text-slate-700"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-2.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-emerald-600 font-bold shrink-0 mt-0.5"
  }, "✓"), /*#__PURE__*/React.createElement("span", null, "Bấm ", /*#__PURE__*/React.createElement("b", null, "Thêm đặt phòng"), " (hoặc nút + trên điện thoại). Chọn Cơ sở, Phòng (phòng đã có khách trong khoảng ngày sẽ ghi \"ĐÃ CÓ KHÁCH\"), Nhận phòng, Trả phòng.")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-2.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-emerald-600 font-bold shrink-0 mt-0.5"
  }, "✓"), /*#__PURE__*/React.createElement("span", null, "Tiền phòng tự tính theo từng đêm: đêm thường dùng giá ngày thường, đêm cuối tuần dùng giá cuối tuần. Có thể sửa tay; bấm ", /*#__PURE__*/React.createElement("b", null, "Tính lại"), " để quay về giá tự động.")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-2.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-emerald-600 font-bold shrink-0 mt-0.5"
  }, "✓"), /*#__PURE__*/React.createElement("span", null, "Chưa có khách trong danh sách → bấm nút ", /*#__PURE__*/React.createElement("b", null, "+"), " cạnh ô Khách hàng để thêm nhanh số điện thoại và CCCD.")))), (activeSection === 'group_booking' || activeSection === 'all') && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-3"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-extrabold text-base text-slate-900 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "👥 Đặt nhiều phòng (đoàn)")), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 leading-relaxed"
  }, "Dành cho khách đoàn, công ty hoặc gia đình đi tour đông người. Nhập 1 người đại diện đoàn, chọn nhiều phòng cùng lúc với cấu hình số người và phụ thu riêng biệt."), /*#__PURE__*/React.createElement("div", {
    className: "p-3.5 rounded-2xl bg-teal-50 border border-teal-200 text-xs text-teal-900"
  }, "Tất cả các phòng trong đoàn được quản lý theo mã chung (ví dụ GD2611-001) và có thể thanh toán gộp hoặc từng phòng linh hoạt.")), (activeSection === 'checkin_checkout' || activeSection === 'all') && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-3"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-extrabold text-base text-slate-900 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "🔑 Nhận / trả phòng")), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 leading-relaxed"
  }, "Thao tác 1 chạm từ màn hình ", /*#__PURE__*/React.createElement("b", null, "Tổng quan"), ", ", /*#__PURE__*/React.createElement("b", null, "Lịch phòng"), " hoặc danh sách ", /*#__PURE__*/React.createElement("b", null, "Đặt phòng"), ":"), /*#__PURE__*/React.createElement("ul", {
    className: "list-disc list-inside text-xs text-slate-700 space-y-1.5"
  }, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("b", null, "Nhận phòng:"), " Chuyển đơn sang trạng thái \"Đang ở\", tự cập nhật phòng sang \"Đang ở\" trong Buồng phòng."), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("b", null, "Trả phòng:"), " Tự động kiểm tra công nợ còn lại; nếu khách chưa trả hết tiền sẽ cảnh báo để lễ tân thu đủ tiền trước khi bấm xác nhận."))), (activeSection === 'payments' || activeSection === 'all') && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-3"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-extrabold text-base text-slate-900 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "💵 Thu tiền & Sổ quỹ")), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 leading-relaxed"
  }, "Quản lý toàn bộ giao dịch đặt cọc, thanh toán khi trả phòng, thanh toán qua OTA và hoàn tiền:"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-bold text-slate-800"
  }, "Đặt cọc"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-slate-500 mt-1"
  }, "Giữ chỗ trước khi khách đến")), /*#__PURE__*/React.createElement("div", {
    className: "p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-bold text-slate-800"
  }, "Thanh toán"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-slate-500 mt-1"
  }, "Thu nốt tiền phòng & dịch vụ")), /*#__PURE__*/React.createElement("div", {
    className: "p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-bold text-slate-800"
  }, "Hoàn tiền"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-slate-500 mt-1"
  }, "Hoàn cọc khi huỷ đơn hợp lệ")))), (activeSection === 'housekeeping' || activeSection === 'all') && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-3"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-extrabold text-base text-slate-900 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "🧹 Buồng phòng")), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 leading-relaxed"
  }, "Theo dõi tình trạng sạch / bẩn / bảo trì theo thời gian thực. Bấm vào bất kỳ thẻ phòng nào để đổi trạng thái nhanh:"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2 pt-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "px-2.5 py-1 rounded-xl bg-sky-100 text-sky-800 text-xs font-bold"
  }, "Đang ở"), /*#__PURE__*/React.createElement("span", {
    className: "px-2.5 py-1 rounded-xl bg-rose-100 text-rose-800 text-xs font-bold"
  }, "Đến hạn trả"), /*#__PURE__*/React.createElement("span", {
    className: "px-2.5 py-1 rounded-xl bg-purple-100 text-purple-800 text-xs font-bold"
  }, "Khách đến hôm nay"), /*#__PURE__*/React.createElement("span", {
    className: "px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold"
  }, "Trống – sẵn sàng"), /*#__PURE__*/React.createElement("span", {
    className: "px-2.5 py-1 rounded-xl bg-amber-100 text-amber-800 text-xs font-bold"
  }, "Trống – chưa dọn"), /*#__PURE__*/React.createElement("span", {
    className: "px-2.5 py-1 rounded-xl bg-slate-200 text-slate-800 text-xs font-bold"
  }, "Bảo trì"))), (activeSection === 'permissions' || activeSection === 'all') && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-3"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-extrabold text-base text-slate-900 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "🔒 Phân quyền người dùng & Bảo mật")), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 leading-relaxed"
  }, "Hệ thống ma trận quyền 4 chiều (Xem, Thêm, Sửa, Xoá) cho từng nhân viên, bảo mật bằng phiên làm việc có chữ ký token và giới hạn phạm vi cơ sở."), /*#__PURE__*/React.createElement("div", {
    className: "p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700"
  }, "4 cấu hình mẫu sẵn dùng: ", /*#__PURE__*/React.createElement("b", null, "Chỉ xem"), " · ", /*#__PURE__*/React.createElement("b", null, "Lễ tân"), " · ", /*#__PURE__*/React.createElement("b", null, "Kế toán"), " · ", /*#__PURE__*/React.createElement("b", null, "Toàn quyền"), ".")), (activeSection === 'settings' || activeSection === 'all') && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-3"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-extrabold text-base text-slate-900 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "⚙️ Dữ liệu & Đồng bộ Google Sheets")), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 leading-relaxed"
  }, "Hệ thống tự động đồng bộ hóa toàn bộ 8 phân hệ chức năng vào Google Spreadsheet liên kết. Bạn có thể mở trực tiếp bảng tính hoặc tải file Excel bất cứ lúc nào.")), (activeSection === 'shortcuts' || activeSection === 'all') && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-3"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-extrabold text-base text-slate-900 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "⌨️ Phím tắt thao tác nhanh")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3 text-xs"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-3 rounded-2xl bg-slate-50 border border-slate-200 flex justify-between items-center"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-slate-600"
  }, "Tìm kiếm nhanh"), /*#__PURE__*/React.createElement("kbd", {
    className: "px-2 py-1 rounded bg-white border border-slate-300 font-mono font-bold text-slate-800"
  }, "Ctrl + K")), /*#__PURE__*/React.createElement("div", {
    className: "p-3 rounded-2xl bg-slate-50 border border-slate-200 flex justify-between items-center"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-slate-600"
  }, "Đóng cửa sổ"), /*#__PURE__*/React.createElement("kbd", {
    className: "px-2 py-1 rounded bg-white border border-slate-300 font-mono font-bold text-slate-800"
  }, "Esc")))), (activeSection === 'faq' || activeSection === 'all') && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-4"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-extrabold text-base text-slate-900 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "❓ Câu hỏi thường gặp")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3 text-xs"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-4 rounded-2xl bg-slate-50 border border-slate-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-bold text-slate-900 mb-1"
  }, "Hỏi: Làm sao huỷ phòng và hoàn cọc cho khách?"), /*#__PURE__*/React.createElement("div", {
    className: "text-slate-600 leading-relaxed"
  }, "Đáp: Mở đơn đặt phòng → bấm \"Huỷ đơn\" → hệ thống cho phép bạn chọn hoàn toàn bộ, một phần tiền cọc hoặc giữ cọc tính vào doanh thu phát sinh.")), /*#__PURE__*/React.createElement("div", {
    className: "p-4 rounded-2xl bg-slate-50 border border-slate-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-bold text-slate-900 mb-1"
  }, "Hỏi: Giá cuối tuần áp dụng vào những đêm nào?"), /*#__PURE__*/React.createElement("div", {
    className: "text-slate-600 leading-relaxed"
  }, "Đáp: Vào Cài đặt → Thông số vận hành → chọn các đêm được tính là cuối tuần (mặc định là đêm Thứ sáu và đêm Thứ bảy).")))))));
}

// MODAL: NEW SINGLE BOOKING
// ==========================================
function NewBookingModal({
  data,
  initialData,
  onClose,
  onSuccess
}) {
  const [propertyId, setPropertyId] = useState(initialData?.propertyId || data?.properties[0]?.id || '');
  const [roomId, setRoomId] = useState(initialData?.roomId || '');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [checkInDate, setCheckInDate] = useState(initialData?.checkInDate || '2026-11-13');
  const [checkOutDate, setCheckOutDate] = useState(initialData?.checkOutDate || '2026-11-15');
  const [guestsCount, setGuestsCount] = useState(2);
  const [source, setSource] = useState('direct');
  const [status, setStatus] = useState('confirmed');
  const [deposit, setDeposit] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const currentRoom = (data?.rooms || []).find(r => r.id === roomId);
  const currentRoomType = (data?.roomTypes || []).find(rt => rt.id === currentRoom?.roomTypeId);
  const propRooms = (data?.rooms || []).filter(r => r.propertyId === propertyId);
  useEffect(() => {
    if (!roomId && propRooms.length) {
      setRoomId(propRooms[0].id);
    }
  }, [propertyId]);
  const computedRates = useMemo(() => {
    if (!currentRoomType || !checkInDate || !checkOutDate) return [];
    const weekendNights = data?.settings?.weekendNights || ['fri', 'sat'];
    const start = new Date(checkInDate);
    const end = new Date(checkOutDate);
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const dayCodes = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const rates = [];
    let cur = new Date(start);
    while (cur < end) {
      const code = dayCodes[cur.getDay()];
      const isWeekend = weekendNights.includes(code);
      const rate = isWeekend ? currentRoomType.priceWeekend || currentRoomType.priceWeekday : currentRoomType.priceWeekday;
      rates.push({
        date: cur.toISOString().split('T')[0],
        dayName: dayNames[cur.getDay()],
        isWeekend,
        rate
      });
      cur.setDate(cur.getDate() + 1);
    }
    return rates;
  }, [currentRoomType, checkInDate, checkOutDate, data]);
  const roomTotal = computedRates.reduce((s, r) => s + r.rate, 0);
  const handleSubmit = async e => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Vui lòng nhập tên và số điện thoại khách');
      return;
    }
    setSubmitting(true);
    try {
      const res = await authFetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          propertyId,
          roomId,
          customerName,
          customerPhone,
          checkInDate,
          checkOutDate,
          guestsCount: Number(guestsCount),
          source,
          status,
          deposit: Number(deposit) || 0,
          paymentMethod,
          notes
        })
      });
      const json = await res.json();
      if (res.ok) {
        onSuccess();
      } else {
        alert('Lỗi: ' + json.error);
      }
    } catch (err) {
      alert('Lỗi kết nối: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between pb-3 border-b border-slate-100"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-extrabold text-lg text-slate-900 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "➕ Tạo Đặt Phòng Mới")), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "p-1 rounded-xl hover:bg-slate-100 text-slate-400"
  }, "✕")), /*#__PURE__*/React.createElement("form", {
    onSubmit: handleSubmit,
    className: "space-y-4 text-xs"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "font-bold text-slate-700 block mb-1"
  }, "Cơ sở"), /*#__PURE__*/React.createElement("select", {
    value: propertyId,
    onChange: e => setPropertyId(e.target.value),
    className: "w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
  }, (data?.properties || []).map(p => /*#__PURE__*/React.createElement("option", {
    key: p.id,
    value: p.id
  }, p.name)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "font-bold text-slate-700 block mb-1"
  }, "Chọn phòng"), /*#__PURE__*/React.createElement("select", {
    value: roomId,
    onChange: e => setRoomId(e.target.value),
    className: "w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
  }, propRooms.map(r => /*#__PURE__*/React.createElement("option", {
    key: r.id,
    value: r.id
  }, r.name, " (", r.floor, ")"))))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "font-bold text-slate-700 block mb-1"
  }, "Ngày nhận phòng"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: checkInDate,
    onChange: e => setCheckInDate(e.target.value),
    className: "w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "font-bold text-slate-700 block mb-1"
  }, "Ngày trả phòng"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: checkOutDate,
    onChange: e => setCheckOutDate(e.target.value),
    className: "w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "p-3.5 rounded-2xl bg-teal-50/70 border border-teal-100 space-y-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center font-bold text-teal-900"
  }, /*#__PURE__*/React.createElement("span", null, "Bảng phân bổ giá ", computedRates.length, " đêm (", currentRoomType?.name, "):"), /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-black"
  }, formatVND(roomTotal))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1"
  }, computedRates.map(r => /*#__PURE__*/React.createElement("div", {
    key: r.date,
    className: "flex justify-between text-[11px] text-teal-800"
  }, /*#__PURE__*/React.createElement("span", null, r.date, " (", r.dayName, ") · ", r.isWeekend ? '🌙 Cuối tuần' : 'Ngày thường'), /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, formatVND(r.rate)))))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "font-bold text-slate-700 block mb-1"
  }, "Tên khách hàng *"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    required: true,
    placeholder: "VD: Nguyễn Văn A",
    value: customerName,
    onChange: e => setCustomerName(e.target.value),
    className: "w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "font-bold text-slate-700 block mb-1"
  }, "Số điện thoại *"), /*#__PURE__*/React.createElement("input", {
    type: "tel",
    required: true,
    placeholder: "09xxxxxxxx",
    value: customerPhone,
    onChange: e => setCustomerPhone(e.target.value),
    className: "w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "font-bold text-slate-700 block mb-1"
  }, "Nguồn đặt"), /*#__PURE__*/React.createElement("select", {
    value: source,
    onChange: e => setSource(e.target.value),
    className: "w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
  }, (data?.categories?.bookingSources || []).map(s => /*#__PURE__*/React.createElement("option", {
    key: s.id,
    value: s.id
  }, s.name)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "font-bold text-slate-700 block mb-1"
  }, "Trạng thái đơn"), /*#__PURE__*/React.createElement("select", {
    value: status,
    onChange: e => setStatus(e.target.value),
    className: "w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
  }, /*#__PURE__*/React.createElement("option", {
    value: "confirmed"
  }, "Đã xác nhận"), /*#__PURE__*/React.createElement("option", {
    value: "hold"
  }, "Giữ chỗ"), /*#__PURE__*/React.createElement("option", {
    value: "in_house"
  }, "Đang ở (Check-in luôn)")))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "font-bold text-slate-700 block mb-1"
  }, "Tiền đặt cọc (VNĐ)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: deposit,
    onChange: e => setDeposit(e.target.value),
    placeholder: "0",
    className: "w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "font-bold text-slate-700 block mb-1"
  }, "Phương thức thanh toán cọc"), /*#__PURE__*/React.createElement("select", {
    value: paymentMethod,
    onChange: e => setPaymentMethod(e.target.value),
    className: "w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
  }, (data?.categories?.paymentMethods || []).map(m => /*#__PURE__*/React.createElement("option", {
    key: m.id,
    value: m.id
  }, m.name))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "font-bold text-slate-700 block mb-1"
  }, "Ghi chú"), /*#__PURE__*/React.createElement("textarea", {
    value: notes,
    onChange: e => setNotes(e.target.value),
    placeholder: "Yêu cầu thêm của khách...",
    rows: "2",
    className: "w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-end gap-2 pt-3 border-t border-slate-100"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClose,
    className: "px-4 py-2.5 rounded-xl bg-slate-100 font-bold text-slate-600 hover:bg-slate-200"
  }, "Hủy"), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    disabled: submitting,
    className: "px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold shadow-md shadow-teal-700/20"
  }, submitting ? 'Đang tạo...' : '🚀 Xác Nhận Đặt Phòng')))));
}

// ==========================================
// MODAL: GROUP BOOKING
// ==========================================
function GroupBookingModal({
  data,
  onClose,
  onSuccess
}) {
  const [groupName, setGroupName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [checkInDate, setCheckInDate] = useState('2026-11-13');
  const [checkOutDate, setCheckOutDate] = useState('2026-11-16');
  const [selectedRoomIds, setSelectedRoomIds] = useState([]);
  const [depositTotal, setDepositTotal] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('transfer');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const toggleRoom = rId => {
    if (selectedRoomIds.includes(rId)) {
      setSelectedRoomIds(selectedRoomIds.filter(id => id !== rId));
    } else {
      setSelectedRoomIds([...selectedRoomIds, rId]);
    }
  };
  const handleSubmit = async e => {
    e.preventDefault();
    if (!selectedRoomIds.length) {
      alert('Vui lòng chọn ít nhất 1 phòng');
      return;
    }
    setSubmitting(true);
    try {
      const res = await authFetch('/api/bookings/group', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          groupName,
          customerName,
          customerPhone,
          checkInDate,
          checkOutDate,
          rooms: selectedRoomIds.map(id => ({
            roomId: id
          })),
          depositTotal: Number(depositTotal) || 0,
          paymentMethod,
          notes
        })
      });
      if (res.ok) {
        onSuccess();
      } else {
        const err = await res.json();
        alert('Lỗi: ' + err.error);
      }
    } catch (e) {
      alert('Lỗi kết nối: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between pb-3 border-b border-slate-100"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-extrabold text-lg text-slate-900 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "👥 Đặt Nhiều Phòng (Đoàn Khách)")), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "p-1 rounded-xl hover:bg-slate-100 text-slate-400"
  }, "✕")), /*#__PURE__*/React.createElement("form", {
    onSubmit: handleSubmit,
    className: "space-y-4 text-xs"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "font-bold text-slate-700 block mb-1"
  }, "Tên đoàn khách *"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    required: true,
    placeholder: "VD: Đoàn cty FPT...",
    value: groupName,
    onChange: e => setGroupName(e.target.value),
    className: "w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "font-bold text-slate-700 block mb-1"
  }, "Người đại diện *"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    required: true,
    placeholder: "Họ tên trưởng đoàn",
    value: customerName,
    onChange: e => setCustomerName(e.target.value),
    className: "w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "font-bold text-slate-700 block mb-1"
  }, "Số điện thoại *"), /*#__PURE__*/React.createElement("input", {
    type: "tel",
    required: true,
    placeholder: "09xxxxxxxx",
    value: customerPhone,
    onChange: e => setCustomerPhone(e.target.value),
    className: "w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "font-bold text-slate-700 block mb-1"
  }, "Ngày nhận phòng"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: checkInDate,
    onChange: e => setCheckInDate(e.target.value),
    className: "w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "font-bold text-slate-700 block mb-1"
  }, "Ngày trả phòng"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: checkOutDate,
    onChange: e => setCheckOutDate(e.target.value),
    className: "w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "font-bold text-slate-700 block mb-1"
  }, "Chọn các phòng cho đoàn (", selectedRoomIds.length, " phòng đã chọn):"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 rounded-2xl bg-slate-50 border border-slate-200"
  }, (data?.rooms || []).map(r => {
    const prop = (data?.properties || []).find(p => p.id === r.propertyId);
    const isSelected = selectedRoomIds.includes(r.id);
    return /*#__PURE__*/React.createElement("button", {
      type: "button",
      key: r.id,
      onClick: () => toggleRoom(r.id),
      className: `p-2 rounded-xl border text-left transition flex items-center justify-between ${isSelected ? 'bg-teal-700 text-white border-teal-700 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:border-teal-400'}`
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "font-bold text-xs"
    }, r.name), /*#__PURE__*/React.createElement("div", {
      className: "text-[10px] opacity-75 truncate"
    }, prop?.name)), /*#__PURE__*/React.createElement("span", null, isSelected ? '✓' : '＋'));
  }))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3 pt-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "font-bold text-slate-700 block mb-1"
  }, "Tổng tiền cọc gộp cả đoàn (VNĐ)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: depositTotal,
    onChange: e => setDepositTotal(e.target.value),
    placeholder: "0",
    className: "w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "font-bold text-slate-700 block mb-1"
  }, "Hình thức thanh toán cọc"), /*#__PURE__*/React.createElement("select", {
    value: paymentMethod,
    onChange: e => setPaymentMethod(e.target.value),
    className: "w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
  }, (data?.categories?.paymentMethods || []).map(m => /*#__PURE__*/React.createElement("option", {
    key: m.id,
    value: m.id
  }, m.name))))), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-end gap-2 pt-3 border-t border-slate-100"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClose,
    className: "px-4 py-2.5 rounded-xl bg-slate-100 font-bold text-slate-600"
  }, "Hủy"), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    disabled: submitting,
    className: "px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold shadow-md shadow-teal-700/20"
  }, submitting ? 'Đang tạo đoàn...' : '🚀 Tạo Đơn Đoàn')))));
}

// ==========================================
// MODAL: BOOKING DETAIL & QUICK ACTION
// ==========================================
function BookingDetailModal({
  booking,
  data,
  onClose,
  onCheckIn,
  onCheckOut,
  onPrintVoucher,
  onAddPayment
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between pb-3 border-b border-slate-100"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "font-mono text-xs font-bold text-teal-700"
  }, booking.id), /*#__PURE__*/React.createElement("h3", {
    className: "font-extrabold text-lg text-slate-900"
  }, booking.customerName)), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "p-1 rounded-xl hover:bg-slate-100 text-slate-400"
  }, "✕")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3 text-xs"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-slate-400 block"
  }, "Phòng:"), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-slate-800"
  }, booking.roomName, " (", booking.roomTypeName, ")")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-slate-400 block"
  }, "Thời gian:"), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-slate-800"
  }, booking.checkInDate, " → ", booking.checkOutDate, " (", booking.nights, " đêm)")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-slate-400 block"
  }, "Số điện thoại:"), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-slate-800"
  }, booking.customerPhone)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-slate-400 block"
  }, "Nguồn đặt:"), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-slate-800"
  }, booking.sourceName))), /*#__PURE__*/React.createElement("div", {
    className: "p-3 rounded-2xl bg-teal-50 border border-teal-100 space-y-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between"
  }, /*#__PURE__*/React.createElement("span", null, "Tổng tiền phòng & DV:"), /*#__PURE__*/React.createElement("b", null, formatVND(booking.grandTotal))), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between text-teal-800"
  }, /*#__PURE__*/React.createElement("span", null, "Đã thanh toán:"), /*#__PURE__*/React.createElement("b", null, formatVND(booking.paid))), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between text-rose-600 font-extrabold text-sm border-t border-teal-200/50 pt-1"
  }, /*#__PURE__*/React.createElement("span", null, "Còn phải thu:"), /*#__PURE__*/React.createElement("span", null, formatVND(booking.balance)))), booking.notes && /*#__PURE__*/React.createElement("div", {
    className: "text-slate-500 italic p-2 bg-slate-50 rounded-xl"
  }, "Ghi chú: ", booking.notes)), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2 pt-3 border-t border-slate-100 justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, booking.status === 'confirmed' && /*#__PURE__*/React.createElement("button", {
    onClick: onCheckIn,
    className: "px-4 py-2 rounded-xl bg-teal-700 text-white font-bold text-xs"
  }, "Nhận phòng"), booking.status === 'in_house' && /*#__PURE__*/React.createElement("button", {
    onClick: onCheckOut,
    className: "px-4 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs"
  }, "Trả phòng"), /*#__PURE__*/React.createElement("button", {
    onClick: onAddPayment,
    className: "px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs"
  }, "💵 Thu tiền")), /*#__PURE__*/React.createElement("button", {
    onClick: onPrintVoucher,
    className: "px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", null, "🖨️ In phiếu xác nhận")))));
}

// ==========================================
// MODAL: VOUCHER MODAL
// ==========================================
function VoucherModal({
  booking,
  data,
  onClose
}) {
  const handlePrint = () => {
    window.open(`/api/bookings/${booking.id}/voucher`, '_blank');
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between pb-3 border-b border-slate-100"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-extrabold text-base text-slate-900"
  }, "Phiếu Xác Nhận Đặt Phòng"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "p-1 rounded-xl hover:bg-slate-100 text-slate-400"
  }, "✕")), /*#__PURE__*/React.createElement("div", {
    className: "p-4 rounded-2xl border border-teal-200 bg-teal-50/40 space-y-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-teal-900"
  }, data?.settings?.legalName || 'GSHEETS HOME'), /*#__PURE__*/React.createElement("span", {
    className: "px-2 py-0.5 rounded bg-teal-700 text-white font-mono font-bold text-[10px]"
  }, booking.id)), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-500"
  }, data?.settings?.address), /*#__PURE__*/React.createElement("div", {
    className: "border-t border-teal-200/50 pt-2 space-y-1"
  }, /*#__PURE__*/React.createElement("div", null, "Khách hàng: ", /*#__PURE__*/React.createElement("b", null, booking.customerName), " (", booking.customerPhone, ")"), /*#__PURE__*/React.createElement("div", null, "Phòng: ", /*#__PURE__*/React.createElement("b", null, booking.roomName), " (", booking.roomTypeName, ")"), /*#__PURE__*/React.createElement("div", null, "Lưu trú: ", /*#__PURE__*/React.createElement("b", null, booking.checkInDate), " đến ", /*#__PURE__*/React.createElement("b", null, booking.checkOutDate), " (", booking.nights, " đêm)"), /*#__PURE__*/React.createElement("div", null, "Tổng tiền: ", /*#__PURE__*/React.createElement("b", null, formatVND(booking.grandTotal)), " (Đã cọc: ", formatVND(booking.paid), ")"))), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-end gap-2 pt-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "px-4 py-2 rounded-xl bg-slate-100 font-bold text-slate-600"
  }, "Đóng"), /*#__PURE__*/React.createElement("button", {
    onClick: handlePrint,
    className: "px-5 py-2 rounded-xl bg-teal-700 text-white font-bold shadow-md shadow-teal-700/20 flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", null, "🖨️ Mở Bản In / PDF")))));
}

// ==========================================
// MODAL: PAYMENT MODAL
// ==========================================
function PaymentModal({
  data,
  initialBooking,
  onClose,
  onSuccess
}) {
  const [bookingId, setBookingId] = useState(initialBooking?.id || '');
  const [amount, setAmount] = useState(initialBooking ? initialBooking.balance : 0);
  const [type, setType] = useState('payment');
  const [method, setMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async e => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await authFetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bookingId,
          amount: Number(amount),
          type,
          method,
          notes
        })
      });
      if (res.ok) {
        onSuccess();
      } else {
        alert('Lỗi tạo phiếu thu');
      }
    } catch (e) {
      alert('Lỗi kết nối: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between pb-3 border-b border-slate-100"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-extrabold text-base text-slate-900"
  }, "💵 Lập Phiếu Thu / Chi Tiền"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "p-1 rounded-xl hover:bg-slate-100 text-slate-400"
  }, "✕")), /*#__PURE__*/React.createElement("form", {
    onSubmit: handleSubmit,
    className: "space-y-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "font-bold text-slate-700 block mb-1"
  }, "Mã đặt phòng liên quan"), /*#__PURE__*/React.createElement("select", {
    value: bookingId,
    onChange: e => {
      setBookingId(e.target.value);
      const b = (data?.bookings || []).find(x => x.id === e.target.value);
      if (b) setAmount(b.balance);
    },
    className: "w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Thu ngoài / Không gắn đơn"), (data?.bookings || []).map(b => /*#__PURE__*/React.createElement("option", {
    key: b.id,
    value: b.id
  }, b.id, " - ", b.customerName, " (", b.roomName, ")")))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "font-bold text-slate-700 block mb-1"
  }, "Loại giao dịch"), /*#__PURE__*/React.createElement("select", {
    value: type,
    onChange: e => setType(e.target.value),
    className: "w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
  }, /*#__PURE__*/React.createElement("option", {
    value: "payment"
  }, "Thanh toán"), /*#__PURE__*/React.createElement("option", {
    value: "deposit"
  }, "Đặt cọc"), /*#__PURE__*/React.createElement("option", {
    value: "refund"
  }, "Hoàn tiền"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "font-bold text-slate-700 block mb-1"
  }, "Phương thức"), /*#__PURE__*/React.createElement("select", {
    value: method,
    onChange: e => setMethod(e.target.value),
    className: "w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
  }, (data?.categories?.paymentMethods || []).map(m => /*#__PURE__*/React.createElement("option", {
    key: m.id,
    value: m.id
  }, m.name))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "font-bold text-slate-700 block mb-1"
  }, "Số tiền (VNĐ) *"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    required: true,
    value: amount,
    onChange: e => setAmount(e.target.value),
    className: "w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-black text-sm text-teal-800"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "font-bold text-slate-700 block mb-1"
  }, "Ghi chú"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: notes,
    onChange: e => setNotes(e.target.value),
    placeholder: "Lý do thu / chuyển khoản số...",
    className: "w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-end gap-2 pt-3 border-t border-slate-100"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClose,
    className: "px-4 py-2 rounded-xl bg-slate-100 font-bold text-slate-600"
  }, "Hủy"), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    disabled: submitting,
    className: "px-5 py-2 rounded-xl bg-teal-700 text-white font-bold shadow-md"
  }, submitting ? 'Đang lưu...' : 'Lưu Phiếu')))));
}

// ==========================================
// MODAL: CUSTOMER MODAL
// ==========================================
function CustomerModal({
  onClose,
  onSuccess
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [idCard, setIdCard] = useState('');
  const [tier, setTier] = useState('regular');
  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async e => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await authFetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          phone,
          email,
          idCard,
          tier
        })
      });
      if (res.ok) onSuccess();
    } catch (e) {
      alert('Lỗi: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between pb-3 border-b border-slate-100"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-extrabold text-base text-slate-900"
  }, "👤 Thêm Hồ Sơ Khách Hàng"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "p-1 rounded-xl hover:bg-slate-100 text-slate-400"
  }, "✕")), /*#__PURE__*/React.createElement("form", {
    onSubmit: handleSubmit,
    className: "space-y-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "font-bold text-slate-700 block mb-1"
  }, "Họ và tên *"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    required: true,
    value: name,
    onChange: e => setName(e.target.value),
    className: "w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
  })), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "font-bold text-slate-700 block mb-1"
  }, "Số điện thoại *"), /*#__PURE__*/React.createElement("input", {
    type: "tel",
    required: true,
    value: phone,
    onChange: e => setPhone(e.target.value),
    className: "w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "font-bold text-slate-700 block mb-1"
  }, "CCCD / Hộ chiếu"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: idCard,
    onChange: e => setIdCard(e.target.value),
    className: "w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "font-bold text-slate-700 block mb-1"
  }, "Email"), /*#__PURE__*/React.createElement("input", {
    type: "email",
    value: email,
    onChange: e => setEmail(e.target.value),
    className: "w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "font-bold text-slate-700 block mb-1"
  }, "Hạng thành viên"), /*#__PURE__*/React.createElement("select", {
    value: tier,
    onChange: e => setTier(e.target.value),
    className: "w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
  }, /*#__PURE__*/React.createElement("option", {
    value: "regular"
  }, "Thường"), /*#__PURE__*/React.createElement("option", {
    value: "loyal"
  }, "Thân thiết"), /*#__PURE__*/React.createElement("option", {
    value: "vip"
  }, "👑 VIP")))), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-end gap-2 pt-3 border-t border-slate-100"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClose,
    className: "px-4 py-2 rounded-xl bg-slate-100 font-bold text-slate-600"
  }, "Hủy"), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    disabled: submitting,
    className: "px-5 py-2 rounded-xl bg-teal-700 text-white font-bold shadow-md"
  }, "Lưu Khách Hàng")))));
}

// ==========================================
// MODAL: USER & PERMISSION MATRIX MODAL
// ==========================================
// ==========================================
// MODAL: USER & PERMISSION MATRIX (IMAGE 3)
// ==========================================
function UserModal({
  data,
  initialUser,
  onClose,
  onSuccess
}) {
  const isEditing = !!initialUser;
  const [name, setName] = useState(initialUser?.name || '');
  const [username, setUsername] = useState(initialUser?.username || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState(initialUser?.phone || '');
  const [email, setEmail] = useState(initialUser?.email || '');
  const [role, setRole] = useState(initialUser?.role || 'user');
  const [roleLabel, setRoleLabel] = useState(initialUser?.roleLabel || (initialUser?.role === 'admin' ? 'Quản trị viên' : 'Người dùng'));
  const [isActive, setIsActive] = useState(initialUser?.status !== 'inactive');

  // Selected property scope
  const properties = data?.properties || [];
  const [selectedProps, setSelectedProps] = useState(() => {
    if (!initialUser || !initialUser.propertyScope || initialUser.propertyScope === 'all') return [];
    return Array.isArray(initialUser.propertyScope) ? initialUser.propertyScope : [initialUser.propertyScope];
  });

  // Default permission structure
  const defaultPerms = {
    booking: {
      view: true,
      add: true,
      edit: true,
      delete: false
    },
    payment: {
      view: true,
      add: true,
      edit: false,
      delete: false
    },
    housekeeping: {
      view: true,
      add: false,
      edit: true,
      delete: false
    },
    customer: {
      view: true,
      add: true,
      edit: true,
      delete: false
    },
    reports: {
      view: false,
      add: false,
      edit: false,
      delete: false
    },
    property: {
      view: true,
      add: false,
      edit: false,
      delete: false
    },
    settings: {
      view: false,
      add: false,
      edit: false,
      delete: false
    }
  };
  const [permissions, setPermissions] = useState(initialUser?.permissions || defaultPerms);
  const [submitting, setSubmitting] = useState(false);
  const functionsList = [{
    id: 'booking',
    label: 'Đặt phòng & lịch phòng'
  }, {
    id: 'payment',
    label: 'Thu tiền'
  }, {
    id: 'housekeeping',
    label: 'Buồng phòng'
  }, {
    id: 'customer',
    label: 'Khách hàng'
  }, {
    id: 'reports',
    label: 'Báo cáo kinh doanh'
  }, {
    id: 'property',
    label: 'Cơ sở & phòng'
  }, {
    id: 'settings',
    label: 'Cài đặt hệ thống'
  }];

  // Preset helper
  const applyPreset = preset => {
    if (preset === 'view_only') {
      setRole('user');
      setRoleLabel('Người dùng');
      const p = {};
      functionsList.forEach(f => {
        p[f.id] = {
          view: true,
          add: false,
          edit: false,
          delete: false
        };
      });
      setPermissions(p);
    } else if (preset === 'letan') {
      setRole('user');
      setRoleLabel('Lễ tân');
      setPermissions({
        booking: {
          view: true,
          add: true,
          edit: true,
          delete: false
        },
        payment: {
          view: true,
          add: true,
          edit: false,
          delete: false
        },
        housekeeping: {
          view: true,
          add: false,
          edit: true,
          delete: false
        },
        customer: {
          view: true,
          add: true,
          edit: true,
          delete: false
        },
        reports: {
          view: false,
          add: false,
          edit: false,
          delete: false
        },
        property: {
          view: true,
          add: false,
          edit: false,
          delete: false
        },
        settings: {
          view: false,
          add: false,
          edit: false,
          delete: false
        }
      });
    } else if (preset === 'ketoan') {
      setRole('user');
      setRoleLabel('Kế toán');
      setPermissions({
        booking: {
          view: true,
          add: false,
          edit: false,
          delete: false
        },
        payment: {
          view: true,
          add: true,
          edit: true,
          delete: true
        },
        housekeeping: {
          view: false,
          add: false,
          edit: false,
          delete: false
        },
        customer: {
          view: true,
          add: false,
          edit: false,
          delete: false
        },
        reports: {
          view: true,
          add: false,
          edit: false,
          delete: false
        },
        property: {
          view: true,
          add: false,
          edit: false,
          delete: false
        },
        settings: {
          view: false,
          add: false,
          edit: false,
          delete: false
        }
      });
    } else if (preset === 'all') {
      setRole('admin');
      setRoleLabel('Quản trị viên');
      const p = {};
      functionsList.forEach(f => {
        p[f.id] = {
          view: true,
          add: true,
          edit: true,
          delete: true
        };
      });
      setPermissions(p);
    }
  };
  const togglePerm = (funcId, action) => {
    const cur = permissions[funcId] || {
      view: false,
      add: false,
      edit: false,
      delete: false
    };
    const newVal = !cur[action];
    const updated = {
      ...cur,
      [action]: newVal
    };
    // Ticking add, edit or delete automatically enables view
    if (newVal && (action === 'add' || action === 'edit' || action === 'delete')) {
      updated.view = true;
    }
    // Unticking view automatically removes add, edit and delete
    if (!newVal && action === 'view') {
      updated.add = false;
      updated.edit = false;
      updated.delete = false;
    }
    setPermissions({
      ...permissions,
      [funcId]: updated
    });
  };
  const toggleColumn = action => {
    const allChecked = functionsList.every(f => permissions[f.id]?.[action]);
    const nextVal = !allChecked;
    const newPerms = {
      ...permissions
    };
    functionsList.forEach(f => {
      const cur = newPerms[f.id] || {
        view: false,
        add: false,
        edit: false,
        delete: false
      };
      const updated = {
        ...cur,
        [action]: nextVal
      };
      if (nextVal && (action === 'add' || action === 'edit' || action === 'delete')) {
        updated.view = true;
      }
      if (!nextVal && action === 'view') {
        updated.add = false;
        updated.edit = false;
        updated.delete = false;
      }
      newPerms[f.id] = updated;
    });
    setPermissions(newPerms);
  };
  const toggleProperty = propId => {
    if (selectedProps.includes(propId)) {
      setSelectedProps(selectedProps.filter(id => id !== propId));
    } else {
      setSelectedProps([...selectedProps, propId]);
    }
  };
  const handleSubmit = async e => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const propertyScope = selectedProps.length === 0 ? 'all' : selectedProps.length === 1 ? selectedProps[0] : selectedProps;
      let propertyScopeLabel = 'Tất cả';
      if (selectedProps.length === 1) {
        const p = properties.find(x => x.id === selectedProps[0]);
        if (p) propertyScopeLabel = p.name;
      } else if (selectedProps.length > 1) {
        propertyScopeLabel = `${selectedProps.length} cơ sở`;
      }
      const summaryParts = [];
      if (permissions.booking?.view) summaryParts.push('Đặt (V' + (permissions.booking.add ? 'A' : '') + (permissions.booking.edit ? 'E' : '') + ')');
      if (permissions.payment?.view) summaryParts.push('Thu (V' + (permissions.payment.add ? 'A' : '') + (permissions.payment.edit ? 'E' : '') + (permissions.payment.delete ? 'D' : '') + ')');
      if (permissions.housekeeping?.view) summaryParts.push('Buồng (V' + (permissions.housekeeping.edit ? 'E' : '') + ')');
      if (permissions.customer?.view) summaryParts.push('Khách (V' + (permissions.customer.add ? 'A' : '') + ')');
      if (permissions.reports?.view) summaryParts.push('Báo (V)');
      const permissionsSummary = role === 'admin' ? 'Toàn quyền' : summaryParts.join(', ') || 'Chỉ xem';
      const payload = {
        name,
        username,
        phone,
        email,
        role,
        roleLabel,
        status: isActive ? 'active' : 'inactive',
        propertyScope,
        propertyScopeLabel,
        permissionsSummary,
        permissions
      };
      if (password.trim()) {
        payload.password = password.trim();
      }
      const url = isEditing ? `/api/users/${initialUser.id}` : '/api/users';
      const method = isEditing ? 'PUT' : 'POST';
      const res = await authFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json();
        alert('Lỗi: ' + (data.error || 'Không thể lưu người dùng'));
      }
    } catch (e) {
      alert('Lỗi kết nối: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-5 text-xs my-8 border border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between pb-3 border-b border-slate-100"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-extrabold text-base text-slate-900 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "👤"), /*#__PURE__*/React.createElement("span", null, isEditing ? 'Sửa người dùng' : 'Thêm người dùng')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClose,
    className: "w-8 h-8 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center font-bold"
  }, "✕")), /*#__PURE__*/React.createElement("form", {
    onSubmit: handleSubmit,
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "font-bold text-slate-700 block mb-1"
  }, "Họ tên *"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    required: true,
    value: name,
    onChange: e => setName(e.target.value),
    placeholder: "Nguyễn Thị Lan",
    className: "w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "font-bold text-slate-700 block mb-1"
  }, "Tài khoản đăng nhập *"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    required: true,
    disabled: isEditing && initialUser?.username === 'admin',
    value: username,
    onChange: e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '')),
    placeholder: "letan",
    className: "w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:bg-slate-100 disabled:text-slate-400"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-slate-400 mt-1 block"
  }, "Chữ không dấu, số, dấu . _ -"))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-3 gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "font-bold text-slate-700 block mb-1"
  }, "Email"), /*#__PURE__*/React.createElement("input", {
    type: "email",
    value: email,
    onChange: e => setEmail(e.target.value),
    placeholder: "khach14@email.com",
    className: "w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "font-bold text-slate-700 block mb-1"
  }, "Điện thoại"), /*#__PURE__*/React.createElement("input", {
    type: "tel",
    value: phone,
    onChange: e => setPhone(e.target.value),
    placeholder: "09xxxxxxxx",
    className: "w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/20"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "font-bold text-slate-700 block mb-1"
  }, "Vai trò *"), /*#__PURE__*/React.createElement("select", {
    value: role,
    onChange: e => {
      const newRole = e.target.value;
      setRole(newRole);
      setRoleLabel(newRole === 'admin' ? 'Quản trị viên' : 'Người dùng');
      if (newRole === 'admin') applyPreset('all');
    },
    className: "w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20"
  }, /*#__PURE__*/React.createElement("option", {
    value: "user"
  }, "Người dùng"), /*#__PURE__*/React.createElement("option", {
    value: "admin"
  }, "Quản trị viên")))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 gap-3 items-center"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "font-bold text-slate-700 block mb-1"
  }, "Mật khẩu mới"), /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("input", {
    type: showPassword ? 'text' : 'password',
    value: password,
    onChange: e => setPassword(e.target.value),
    placeholder: isEditing ? '••••••••' : 'Nhập mật khẩu...',
    className: "w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/20 pr-10"
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setShowPassword(!showPassword),
    className: "absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 text-xs font-bold"
  }, showPassword ? '🙈' : '👁️')), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-slate-400 mt-1 block"
  }, "Để trống nếu không đổi")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "font-bold text-slate-700 block mb-1"
  }, "Trạng thái"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 pt-1"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setIsActive(!isActive),
    className: `relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isActive ? 'bg-teal-700' : 'bg-slate-300'}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isActive ? 'translate-x-5' : 'translate-x-0'}`
  })), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-slate-700"
  }, "Cho phép đăng nhập")))), /*#__PURE__*/React.createElement("div", {
    className: "pt-2 border-t border-slate-100"
  }, /*#__PURE__*/React.createElement("label", {
    className: "font-bold text-slate-700 block mb-1.5"
  }, "Phạm vi cơ sở ", /*#__PURE__*/React.createElement("span", {
    className: "text-slate-400 font-normal"
  }, "(không chọn = tất cả)")), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2.5"
  }, properties.map(p => {
    const isChecked = selectedProps.includes(p.id);
    return /*#__PURE__*/React.createElement("label", {
      key: p.id,
      className: `flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition ${isChecked ? 'bg-teal-50 text-teal-900 border-teal-600' : 'bg-slate-50 text-slate-600 border-slate-200'}`
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: isChecked,
      onChange: () => toggleProperty(p.id),
      className: "w-4 h-4 rounded text-teal-700 focus:ring-teal-500"
    }), /*#__PURE__*/React.createElement("span", null, p.name));
  }))), /*#__PURE__*/React.createElement("div", {
    className: "pt-2 border-t border-slate-100 space-y-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center justify-between gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-slate-700"
  }, "Ma trận quyền"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => applyPreset('view_only'),
    className: "px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition"
  }, "Chỉ xem"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => applyPreset('letan'),
    className: "px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition"
  }, "Lễ tân"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => applyPreset('ketoan'),
    className: "px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition"
  }, "Kế toán"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => applyPreset('all'),
    className: "px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition"
  }, "Toàn quyền"))), /*#__PURE__*/React.createElement("div", {
    className: "border border-slate-200 rounded-2xl overflow-hidden shadow-sm"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full text-xs text-left border-collapse"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    className: "bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[11px]"
  }, /*#__PURE__*/React.createElement("th", {
    className: "py-2.5 px-3"
  }, "Chức năng"), /*#__PURE__*/React.createElement("th", {
    className: "py-2.5 px-3 text-center cursor-pointer hover:bg-slate-100",
    onClick: () => toggleColumn('view'),
    title: "Bấm để chọn/bỏ chọn cả cột"
  }, "Xem ⇕"), /*#__PURE__*/React.createElement("th", {
    className: "py-2.5 px-3 text-center cursor-pointer hover:bg-slate-100",
    onClick: () => toggleColumn('add'),
    title: "Bấm để chọn/bỏ chọn cả cột"
  }, "Thêm ⇕"), /*#__PURE__*/React.createElement("th", {
    className: "py-2.5 px-3 text-center cursor-pointer hover:bg-slate-100",
    onClick: () => toggleColumn('edit'),
    title: "Bấm để chọn/bỏ chọn cả cột"
  }, "Sửa ⇕"), /*#__PURE__*/React.createElement("th", {
    className: "py-2.5 px-3 text-center cursor-pointer hover:bg-slate-100",
    onClick: () => toggleColumn('delete'),
    title: "Bấm để chọn/bỏ chọn cả cột"
  }, "Xoá ⇕"))), /*#__PURE__*/React.createElement("tbody", {
    className: "divide-y divide-slate-100 font-medium"
  }, functionsList.map(func => {
    const cur = permissions[func.id] || {
      view: false,
      add: false,
      edit: false,
      delete: false
    };
    return /*#__PURE__*/React.createElement("tr", {
      key: func.id,
      className: "hover:bg-slate-50/50"
    }, /*#__PURE__*/React.createElement("td", {
      className: "py-2 px-3 font-semibold text-slate-800"
    }, func.label), /*#__PURE__*/React.createElement("td", {
      className: "py-2 px-3 text-center"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: !!cur.view,
      onChange: () => togglePerm(func.id, 'view'),
      className: "w-4 h-4 rounded text-teal-700 focus:ring-teal-500"
    })), /*#__PURE__*/React.createElement("td", {
      className: "py-2 px-3 text-center"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: !!cur.add,
      onChange: () => togglePerm(func.id, 'add'),
      className: "w-4 h-4 rounded text-teal-700 focus:ring-teal-500"
    })), /*#__PURE__*/React.createElement("td", {
      className: "py-2 px-3 text-center"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: !!cur.edit,
      onChange: () => togglePerm(func.id, 'edit'),
      className: "w-4 h-4 rounded text-teal-700 focus:ring-teal-500"
    })), /*#__PURE__*/React.createElement("td", {
      className: "py-2 px-3 text-center"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: !!cur.delete,
      onChange: () => togglePerm(func.id, 'delete'),
      className: "w-4 h-4 rounded text-teal-700 focus:ring-teal-500"
    })));
  })))), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-slate-400 block"
  }, "Tick Thêm / Sửa / Xoá sẽ tự bật Xem. Bấm tiêu đề cột để chọn cả cột.")), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-end gap-2.5 pt-4 border-t border-slate-100"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClose,
    className: "px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-600 transition"
  }, "Đóng"), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    disabled: submitting,
    className: "px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold shadow-md shadow-teal-700/20 transition flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", null, "💾"), /*#__PURE__*/React.createElement("span", null, submitting ? 'Đang lưu...' : 'Lưu'))))));
}

// Render React App
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(/*#__PURE__*/React.createElement(App, null));