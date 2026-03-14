// Fetch Wrapper
async function fetchApi(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    // Auto-attach token if in localStorage (fallback since we use cookies, but good practice)
    const token = localStorage.getItem('token');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(url, { ...options, headers });
        const result = await response.json();
        
        if (response.status === 401) {
            // Unauthorized, clear and redirect
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if(window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
                window.location.href = '/login';
            }
        }

        return result;
    } catch (error) {
        console.error('API Error:', error);
        return { success: false, message: 'Network error or system unreachable' };
    }
}

// Toast Notifications
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.right = '20px';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0 show animate-slide-up`;
    toast.role = 'alert';
    toast.style.marginBottom = '10px';
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body fw-medium">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close" onclick="this.parentElement.parentElement.remove()"></button>
        </div>
    `;

    container.appendChild(toast);
    
    // Auto remove after 3s
    setTimeout(() => {
        if(toast.parentElement) toast.remove();
    }, 3000);
}

// Global Auth Check
function requireAuth() {
    const user = localStorage.getItem('user');
    if (!user) {
        window.location.href = '/login';
    }
    return JSON.parse(user);
}

// Formatting
function formatDate(dateStr) {
    if(!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
}
