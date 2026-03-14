document.addEventListener('DOMContentLoaded', () => {
    // Check auth on all pages except auth pages
    const path = window.location.pathname;
    const isAuthPage = ['/login', '/signup', '/reset-password'].includes(path) || path === '/';
    
    let user = null;
    if (!isAuthPage) {
        user = requireAuth();
    }

    if (user && !document.getElementById('sidebar')) {
        renderLayout(user);
    }
});

function renderLayout(user) {
    const activePath = window.location.pathname;
    
    // Create Wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'wrapper';

    // Sidebar
    const sidebar = document.createElement('nav');
    sidebar.id = 'sidebar';
    sidebar.innerHTML = `
        <div class="sidebar-header">
            IMS Admin
        </div>
        <ul class="list-unstyled components">
            <li class="${activePath === '/dashboard' ? 'active' : ''}">
                <a href="/dashboard"><i class="bi bi-speedometer2"></i> Dashboard</a>
            </li>
            <li class="${activePath === '/products' ? 'active' : ''}">
                <a href="/products"><i class="bi bi-box-seam"></i> Products</a>
            </li>
            
            <li>
                <a href="#operationsSubmenu" data-bs-toggle="collapse" aria-expanded="false" class="dropdown-toggle">
                    <i class="bi bi-arrow-left-right"></i> Operations
                </a>
                <ul class="collapse list-unstyled show" id="operationsSubmenu">
                    <li class="${activePath === '/receipts' ? 'active' : ''}"><a href="/receipts" class="ps-5">Receipts</a></li>
                    <li class="${activePath === '/deliveries' ? 'active' : ''}"><a href="/deliveries" class="ps-5">Delivery Orders</a></li>
                    <li class="${activePath === '/transfers' ? 'active' : ''}"><a href="/transfers" class="ps-5">Internal Transfers</a></li>
                    <li class="${activePath === '/adjustments' ? 'active' : ''}"><a href="/adjustments" class="ps-5">Adjustments</a></li>
                    <li class="${activePath === '/history' ? 'active' : ''}"><a href="/history" class="ps-5">Move History</a></li>
                </ul>
            </li>

            <li>
                <a href="#settingsSubmenu" data-bs-toggle="collapse" aria-expanded="false" class="dropdown-toggle">
                    <i class="bi bi-gear"></i> Settings
                </a>
                <ul class="collapse list-unstyled show" id="settingsSubmenu">
                    <li class="${activePath === '/warehouses' ? 'active' : ''}"><a href="/warehouses" class="ps-5">Warehouses</a></li>
                    <li class="${activePath === '/locations' ? 'active' : ''}"><a href="/locations" class="ps-5">Locations</a></li>
                </ul>
            </li>
        </ul>
    `;

    // Content Area
    const content = document.createElement('div');
    content.id = 'content';
    content.className = 'animate-slide-up';
    
    // Top Navbar
    const topnav = document.createElement('nav');
    topnav.className = 'top-navbar';
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const themeIcon = currentTheme === 'dark' ? 'bi-sun' : 'bi-moon-stars';
    
    topnav.innerHTML = `
        <div class="d-flex align-items-center">
            <button type="button" id="sidebarCollapse" class="btn btn-outline-primary d-md-none me-3">
                <i class="bi bi-list"></i>
            </button>
            <h5 class="mb-0 d-none d-md-block text-muted" id="pageTitle">Inventory Management System</h5>
        </div>
        <div class="d-flex align-items-center">
            <div id="themeToggle" class="nav-pill me-3" title="Toggle Theme">
                <i class="bi ${themeIcon}"></i>
            </div>
            <div class="dropdown">
                <div class="nav-pill dropdown-toggle" id="dropdownUser" data-bs-toggle="dropdown" aria-expanded="false" title="${user.name}">
                    <i class="bi bi-person-circle me-2"></i>
                    <span class="d-none d-sm-inline fw-semibold">${user.name}</span>
                </div>
                <ul class="dropdown-menu dropdown-menu-end shadow border-0" aria-labelledby="dropdownUser">
                    <li class="px-3 py-2 border-bottom">
                        <div class="fw-bold">${user.name}</div>
                        <small class="text-muted">${user.email || 'Administrator'}</small>
                    </li>
                    <li><a class="dropdown-item mt-2" href="/profile"><i class="bi bi-person me-2"></i> Profile</a></li>
                    <li><a class="dropdown-item" href="/settings"><i class="bi bi-gear me-2"></i> Settings</a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item text-danger" href="#" id="logoutBtn"><i class="bi bi-box-arrow-right me-2"></i> Sign out</a></li>
                </ul>
            </div>
        </div>
    `;

    // Move existing body content into content area (safe collection)
    const existingContent = document.createElement('div');
    existingContent.className = 'container-fluid px-4 py-3';
    
    const nodesToMove = Array.from(document.body.childNodes);
    nodesToMove.forEach(node => {
        existingContent.appendChild(node);
    });
    
    content.appendChild(topnav);
    content.appendChild(existingContent);

    wrapper.appendChild(sidebar);
    wrapper.appendChild(content);
    document.body.appendChild(wrapper);

    // Sidebar Toggle
    const sidebarCollapse = document.getElementById('sidebarCollapse');
    if (sidebarCollapse) {
        sidebarCollapse.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            content.classList.toggle('active');
        });
    }

    // Theme Toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const target = current === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-theme', target);
            localStorage.setItem('theme', target);
            
            // Update icon
            const icon = themeToggle.querySelector('i');
            icon.classList.remove('bi-sun', 'bi-moon-stars');
            icon.classList.add(target === 'dark' ? 'bi-sun' : 'bi-moon-stars');
        });
    }

    // Logout logic
    document.getElementById('logoutBtn').addEventListener('click', async (e) => {
        e.preventDefault();
        await fetchApi('/api/auth/logout');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    });
}

function setPageTitle(title) {
    const el = document.getElementById('pageTitle');
    if (el) el.innerText = title;
    document.title = title + ' - IMS';
}
