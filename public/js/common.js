/**
 * Module: Common Global State, Navigation & Utilities
 * TASK-051: RBAC UI - Tự động ẩn/hiện menu theo Role
 */

let currentUserRole = 'admin';
let currentClientId = 1;
let currentToken = localStorage.getItem('goddy_token') || null;
let currentUser = null;

try {
  const savedUser = localStorage.getItem('goddy_user');
  if (savedUser) currentUser = JSON.parse(savedUser);
} catch (e) {
  console.warn('Không thể đọc goddy_user từ localStorage', e);
}

let globalClients = [];
let revenueChartInstance = null;
let industryChartInstance = null;


// ============================================================
// PAGE MAPPING
// ============================================================

const PAGE_URL_MAP = {
  'dashboard': 'index.html',
  'clients': 'clients.html',
  'recruitment': 'recruitment.html',
  'invoices': 'invoices.html',
  'debt': 'debt.html',
  'audit': 'audit.html',
  'client-portal': 'client-portal.html'
};


// ============================================================
// TAB TITLES
// ============================================================

const TAB_TITLES = {
  'dashboard': 'Dashboard Dữ Liệu Tuyển Dụng & Tài Chính',
  'clients': 'Quản Lý Khách Hàng Doanh Nghiệp (B2B)',
  'recruitment': 'Quản Lý Deal Tuyển Dụng & Thời Hạn Bảo Hành',
  'invoices': 'Quản Lý Hóa Đơn Dịch Vụ Tuyển Dụng',
  'debt': 'Báo Cáo Công Nợ & Phân Tích Tuổi Nợ (Aging Report)',
  'audit': 'Nhật Ký Thao Tác Hệ Thống (Audit Trail)'
};


// ============================================================
// TASK-051: ROLE-BASED MENU PERMISSIONS
// ============================================================

const ROLE_MENU_PERMISSIONS = {

  // Admin: toàn quyền
  admin: [
    'dashboard',
    'clients',
    'recruitment',
    'invoices',
    'debt',
    'audit'
  ],

  // Kế toán
  accountant: [
    'dashboard',
    'clients',
    'invoices',
    'debt'
  ],

  // Recruiter
  recruiter: [
    'dashboard',
    'clients',
    'recruitment'
  ],

  // Client sử dụng Client Portal riêng
  client: [
    'client-portal'
  ]
};


/**
 * Lấy tabKey từ onclick của sidebar.
 *
 * Ví dụ:
 * onclick="switchTab('dashboard')"
 * => dashboard
 */
function getSidebarTabKey(item) {

  if (!item) return null;

  const onclickValue = item.getAttribute('onclick') || '';

  const match = onclickValue.match(
    /switchTab\s*\(\s*['"]([^'"]+)['"]/
  );

  return match ? match[1] : null;
}


/**
 * TASK-051
 *
 * Tự động ẩn/hiện menu dựa trên Role.
 */
function applyRoleMenuPermissions(role) {

  const allowedMenus =
    ROLE_MENU_PERMISSIONS[role] ||
    ROLE_MENU_PERMISSIONS.admin;

  const sidebarMenuInternal =
    document.getElementById('sidebarMenuInternal');

  if (!sidebarMenuInternal) return;

  const menuItems =
    sidebarMenuInternal.querySelectorAll('.sidebar-item');

  menuItems.forEach(item => {

    const tabKey = getSidebarTabKey(item);

    /*
     * Nếu item không có switchTab thì giữ nguyên.
     * Ví dụ các button chức năng khác của sidebar.
     */
    if (!tabKey) {
      item.style.display = '';
      return;
    }

    if (allowedMenus.includes(tabKey)) {
      item.style.display = '';
    } else {
      item.style.display = 'none';
    }
  });
}


/**
 * Kiểm tra Role có quyền truy cập tab hay không.
 */
function hasMenuPermission(role, tabKey) {

  const allowedMenus =
    ROLE_MENU_PERMISSIONS[role] ||
    ROLE_MENU_PERMISSIONS.admin;

  return allowedMenus.includes(tabKey);
}


/**
 * Chặn truy cập tab nếu Role không có quyền.
 */
function checkRolePermission(tabKey) {

  if (currentUserRole === 'client') {
    return tabKey === 'client-portal';
  }

  if (!hasMenuPermission(currentUserRole, tabKey)) {

    console.warn(
      'RBAC: Role "' +
      currentUserRole +
      '" không có quyền truy cập "' +
      tabKey +
      '"'
    );

    return false;
  }

  return true;
}


// ============================================================
// NAVIGATION
// ============================================================

function switchTab(tabKey) {

  // TASK-051: kiểm tra quyền trước khi chuyển tab
  if (!checkRolePermission(tabKey)) {

    alert(
      'Bạn không có quyền truy cập chức năng này.'
    );

    return;
  }


  if (currentUserRole === 'client') {

    if (tabKey !== 'client-portal') {
      switchUserRole('admin');
    }

    return;
  }


  const targetSection =
    document.getElementById('section-' + tabKey);


  // Nếu trang hiện tại không chứa section
  // thì chuyển sang HTML standalone tương ứng
  if (!targetSection) {

    if (PAGE_URL_MAP[tabKey]) {

      window.location.href =
        PAGE_URL_MAP[tabKey];

      return;
    }
  }


  // SPA section navigation
  const sections = [
    'dashboard',
    'clients',
    'recruitment',
    'invoices',
    'debt',
    'audit',
    'client-portal'
  ];


  sections.forEach(s => {

    const el =
      document.getElementById('section-' + s);

    if (el) {

      el.style.display =
        (s === tabKey) ? 'block' : 'none';
    }
  });


  // Active sidebar
  document
    .querySelectorAll(
      '#sidebarMenuInternal .sidebar-item'
    )
    .forEach(item => {

      item.classList.remove('active');

    });


  const activeItem =
    Array.from(
      document.querySelectorAll(
        '#sidebarMenuInternal .sidebar-item'
      )
    ).find(el =>
      el.getAttribute('onclick')?.includes(tabKey)
    );


  if (activeItem) {
    activeItem.classList.add('active');
  }


  // Page title
  const headerEl =
    document.getElementById('pageHeaderTitle');


  if (headerEl) {

    headerEl.textContent =
      TAB_TITLES[tabKey] ||
      'GODDY RECRUIT';
  }


  // Load module data
  if (
    tabKey === 'dashboard' &&
    typeof loadDashboard === 'function'
  ) {
    loadDashboard();
  }

  if (
    tabKey === 'clients' &&
    typeof loadClients === 'function'
  ) {
    loadClients();
  }

  if (
    tabKey === 'recruitment' &&
    typeof loadPlacements === 'function'
  ) {
    loadPlacements();
  }

  if (
    tabKey === 'invoices' &&
    typeof loadInvoices === 'function'
  ) {
    loadInvoices();
  }

  if (
    tabKey === 'debt' &&
    typeof loadDebt === 'function'
  ) {
    loadDebt();
  }

  if (
    tabKey === 'audit' &&
    typeof loadAudit === 'function'
  ) {
    loadAudit();
  }
}


// ============================================================
// RELOAD CURRENT TAB
// ============================================================

function reloadCurrentTab() {

  if (currentUserRole === 'client') {

    if (
      typeof loadClientPortal === 'function'
    ) {

      loadClientPortal(currentClientId);
    }

  } else {

    const activeItem =
      document.querySelector(
        '#sidebarMenuInternal .sidebar-item.active'
      );


    if (activeItem) {

      activeItem.click();

    } else {

      window.location.reload();
    }
  }
}


// ============================================================
// UTILITIES
// ============================================================

function formatMoney(amount) {

  return (
    (parseFloat(amount) || 0)
      .toLocaleString('vi-VN')
    + ' đ'
  );
}


function downloadCSV(csv, filename) {

  const blob = new Blob(
    ["\uFEFF" + csv],
    {
      type: 'text/csv;charset=utf-8;'
    }
  );

  const url =
    URL.createObjectURL(blob);

  const a =
    document.createElement('a');

  a.href = url;
  a.download = filename;

  a.click();

  URL.revokeObjectURL(url);
}


// ============================================================
// CLIENT PORTAL & ROLE SWITCHER
// ============================================================

function switchUserRole(
  role,
  clientId = 1
) {

  currentUserRole = role;
  currentClientId = clientId;


  const roleBadge =
    document.getElementById('roleBadge');

  const navRoleTitle =
    document.getElementById('navRoleTitle');

  const sidebarMenuInternal =
    document.getElementById(
      'sidebarMenuInternal'
    );

  const sidebarMenuClient =
    document.getElementById(
      'sidebarMenuClient'
    );

  const sidebarFooterInternal =
    document.getElementById(
      'sidebarFooterInternal'
    );

  const sidebarFooterClient =
    document.getElementById(
      'sidebarFooterClient'
    );

  const sidebarLogoIcon =
    document.getElementById(
      'sidebarLogoIcon'
    );

  const sidebarMainTitle =
    document.getElementById(
      'sidebarMainTitle'
    );

  const sidebarSubTitle =
    document.getElementById(
      'sidebarSubTitle'
    );


  // ==========================================================
  // CLIENT
  // ==========================================================

  if (role === 'client') {

    const portalSection =
      document.getElementById(
        'section-client-portal'
      );


    // Nếu không có Client Portal
    // thì chuyển sang trang riêng
    if (!portalSection) {

      window.location.href =
        'client-portal.html?role=client&clientId=' +
        clientId;

      return;
    }


    if (sidebarMenuInternal) {
      sidebarMenuInternal.style.display =
        'none';
    }


    if (sidebarMenuClient) {
      sidebarMenuClient.style.display =
        'block';
    }


    if (sidebarFooterInternal) {
      sidebarFooterInternal.style.display =
        'none';
    }


    if (sidebarFooterClient) {
      sidebarFooterClient.style.display =
        'block';
    }


    if (sidebarLogoIcon) {

      sidebarLogoIcon.innerHTML =
        '<i class="fa-solid fa-building"></i>';
    }


    if (sidebarMainTitle) {

      sidebarMainTitle.textContent =
        'CỔNG KHÁCH HÀNG';
    }


    if (roleBadge) {

      roleBadge.className =
        'badge bg-primary rounded-pill px-2 py-1';

      roleBadge.textContent =
        'Khách hàng B2B';
    }


    const clientNames = {

      1: 'FPT Software (Trần Thu Hà)',

      2: 'VNG Corporation (Nguyễn Hoàng Long)',

      3: 'Shopee Việt Nam (Lê Thùy Dương)'
    };


    const cName =
      clientNames[clientId] ||
      'Doanh Nghiệp Đối Tác';


    if (navRoleTitle) {

      navRoleTitle.textContent =
        cName;
    }


    if (sidebarSubTitle) {

      sidebarSubTitle.textContent =
        cName
          .split('(')[0]
          .trim();
    }


    // Ẩn toàn bộ section nội bộ
    const sections = [
      'dashboard',
      'clients',
      'recruitment',
      'invoices',
      'debt',
      'audit'
    ];


    sections.forEach(s => {

      const el =
        document.getElementById(
          'section-' + s
        );

      if (el) {
        el.style.display = 'none';
      }
    });


    portalSection.style.display =
      'block';


    const headerTitle =
      document.getElementById(
        'pageHeaderTitle'
      );


    if (headerTitle) {

      headerTitle.textContent =
        'Cổng Thông Tin Doanh Nghiệp - ' +
        (
          sidebarSubTitle
            ? sidebarSubTitle.textContent
            : ''
        );
    }


    if (
      typeof switchClientSubTab ===
      'function'
    ) {

      switchClientSubTab('invoices');
    }


    if (
      typeof loadClientPortal ===
      'function'
    ) {

      loadClientPortal(clientId);
    }


    return;
  }


  // ==========================================================
  // INTERNAL ROLE
  // ==========================================================

  const dashboardSection =
    document.getElementById(
      'section-dashboard'
    );


  // Nếu đang ở client-portal.html
  if (
    !dashboardSection &&
    window.location.pathname.includes(
      'client-portal'
    )
  ) {

    window.location.href =
      'index.html?role=' + role;

    return;
  }


  if (sidebarMenuInternal) {

    sidebarMenuInternal.style.display =
      'block';
  }


  if (sidebarMenuClient) {

    sidebarMenuClient.style.display =
      'none';
  }


  if (sidebarFooterInternal) {

    sidebarFooterInternal.style.display =
      'block';
  }


  if (sidebarFooterClient) {

    sidebarFooterClient.style.display =
      'none';
  }


  if (sidebarLogoIcon) {

    sidebarLogoIcon.innerHTML =
      '<i class="fa-solid fa-chart-pie"></i>';
  }


  if (sidebarMainTitle) {

    sidebarMainTitle.textContent =
      'GODDY RECRUIT';
  }


  if (sidebarSubTitle) {

    sidebarSubTitle.textContent =
      'Quản Lý Công Nợ B2B';
  }


  const clientPortalSection =
    document.getElementById(
      'section-client-portal'
    );


  if (clientPortalSection) {

    clientPortalSection.style.display =
      'none';
  }


  // ==========================================================
  // ROLE BADGE
  // ==========================================================

  if (role === 'admin') {

    if (roleBadge) {

      roleBadge.className =
        'badge bg-danger rounded-pill px-2 py-1';

      roleBadge.textContent =
        'Admin';
    }


    if (navRoleTitle) {

      navRoleTitle.textContent =
        'Huỳnh Nguyễn Vĩnh Phúc';
    }

  }

  else if (role === 'accountant') {

    if (roleBadge) {

      roleBadge.className =
        'badge bg-success rounded-pill px-2 py-1';

      roleBadge.textContent =
        'Kế toán';
    }


    if (navRoleTitle) {

      navRoleTitle.textContent =
        'Phạm Sơn (Kế toán trưởng)';
    }

  }

  else if (role === 'recruiter') {

    if (roleBadge) {

      roleBadge.className =
        'badge bg-warning text-dark rounded-pill px-2 py-1';

      roleBadge.textContent =
        'Recruiter';
    }


    if (navRoleTitle) {

      navRoleTitle.textContent =
        'Nguyễn Văn Minh (Senior)';
    }
  }


  // ==========================================================
  // TASK-051
  // APPLY RBAC MENU
  // ==========================================================

  applyRoleMenuPermissions(role);


  // Hiển thị Dashboard
  if (dashboardSection) {

    switchTab('dashboard');
  }
}


// ============================================================
// LOGIN MODAL
// ============================================================

function openLoginModal() {

  const modalEl =
    document.getElementById(
      'modalLogin'
    );


  if (modalEl) {

    new bootstrap.Modal(
      modalEl
    ).show();

  } else {

    alert(
      'Không tìm thấy hộp thoại đăng nhập!'
    );
  }
}


function quickFillLogin(
  username,
  password
) {

  const u =
    document.getElementById(
      'loginUsername'
    );

  const p =
    document.getElementById(
      'loginPassword'
    );


  if (u) {
    u.value = username;
  }


  if (p) {
    p.value = password;
  }
}


// ============================================================
// SUBMIT LOGIN
// ============================================================

async function submitLogin(e) {

  e.preventDefault();


  const usernameInput =
    document.getElementById(
      'loginUsername'
    );

  const passwordInput =
    document.getElementById(
      'loginPassword'
    );


  if (
    !usernameInput ||
    !passwordInput
  ) {
    return;
  }


  const username =
    usernameInput.value.trim();

  const password =
    passwordInput.value;


  try {

    const res =
      await fetch(
        '/api/auth/login',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body: JSON.stringify({
            username: username,
            password: password
          })
        }
      );


    const data =
      await res.json();


    if (data.success) {

      // Lưu JWT
      if (data.token) {

        localStorage.setItem(
          'goddy_token',
          data.token
        );

        currentToken =
          data.token;
      }


      // Lưu User
      if (data.user) {

        localStorage.setItem(
          'goddy_user',
          JSON.stringify(
            data.user
          )
        );

        currentUser =
          data.user;
      }


      const modalEl =
        document.getElementById(
          'modalLogin'
        );


      if (modalEl) {

        const modalInstance =
          bootstrap.Modal.getInstance(
            modalEl
          );


        if (modalInstance) {

          modalInstance.hide();
        }
      }


      alert(
        'Đăng nhập thành công với vai trò: ' +
        (
          data.user.role || ''
        ).toUpperCase()
      );


      if (
        data.user.role ===
        'client'
      ) {

        switchUserRole(
          'client',
          data.user.clientId || 1
        );

      } else {

        switchUserRole(
          data.user.role
        );
      }


    } else {

      alert(
        data.message ||
        'Đăng nhập thất bại!'
      );
    }


  } catch (err) {

    console.error(
      'Login error:',
      err
    );

    alert(
      'Lỗi kết nối máy chủ!'
    );
  }
}


// ============================================================
// INITIALIZE
// ============================================================

document.addEventListener(
  'DOMContentLoaded',
  () => {

    const urlParams =
      new URLSearchParams(
        window.location.search
      );


    const roleParam =
      urlParams.get('role');


    const clientParam =
      parseInt(
        urlParams.get('clientId')
      ) || 1;


    if (
      roleParam ===
      'client'
    ) {

      switchUserRole(
        'client',
        clientParam
      );

    }

    else if (
      roleParam ===
        'accountant' ||
      roleParam ===
        'ketoan'
    ) {

      switchUserRole(
        'accountant'
      );

    }

    else if (
      roleParam ===
      'recruiter'
    ) {

      switchUserRole(
        'recruiter'
      );

    }

    else {

      // Mặc định Admin
      currentUserRole =
        'admin';


      // TASK-051:
      // Áp dụng RBAC ngay khi load trang
      applyRoleMenuPermissions(
        'admin'
      );


      // Chỉ tự động load Dashboard
      // nếu trang có section dashboard
      if (
        document.getElementById(
          'section-dashboard'
        ) &&
        typeof loadDashboard ===
          'function'
      ) {

        loadDashboard();
      }
    }
  }
);