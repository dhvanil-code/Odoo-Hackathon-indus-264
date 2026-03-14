document.addEventListener('DOMContentLoaded', async () => {
    setPageTitle('Products');
    await loadProducts();
    await loadCategories();
    await loadLocations(); // for initial stock setup

    document.getElementById('productForm').addEventListener('submit', saveProduct);
});

let categories = [];
let locations = [];

async function loadProducts() {
    const res = await fetchApi('/api/products');
    const tbody = document.getElementById('products-table-body');
    if (res.success && res.data.length > 0) {
        let html = '';
        res.data.forEach(p => {
            html += `
                <tr>
                    <td><strong>${p.sku}</strong></td>
                    <td>${p.name}</td>
                    <td><span class="badge bg-light text-dark">${p.category_name || 'Uncategorized'}</span></td>
                    <td>
                        <span class="badge ${p.current_stock <= p.reorder_point ? 'bg-danger' : 'bg-success'}">
                            ${p.current_stock}
                        </span>
                    </td>
                    <td>${p.reorder_point}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick='editProduct(${JSON.stringify(p).replace(/'/g, "&#39;")})'><i class="bi bi-pencil"></i></button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteProduct(${p.id})"><i class="bi bi-trash"></i></button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    } else {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No products found.</td></tr>';
    }
}

async function loadCategories() {
    const res = await fetchApi('/api/products/categories');
    if (res.success) {
        categories = res.data;
        const select = document.getElementById('category_id');
        res.data.forEach(c => {
            select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        });
    }
}

async function loadLocations() {
    const res = await fetchApi('/api/locations');
    if (res.success) {
        locations = res.data;
        const select = document.getElementById('initial_location_id');
        res.data.forEach(l => {
            select.innerHTML += `<option value="${l.id}">${l.warehouse_name} - ${l.code}</option>`;
        });
    }
}

function openCreateModal() {
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    document.getElementById('modalTitle').innerText = 'Add New Product';
    
    // Reset labels for Create mode
    document.getElementById('stockLabel').innerText = 'Initial Stock';
    document.getElementById('locationLabel').innerText = 'Initial Location';
    document.getElementById('stockHint').innerText = 'Set the starting inventory level and location.';
}

function editProduct(product) {
    document.getElementById('productId').value = product.id;
    document.getElementById('sku').value = product.sku;
    document.getElementById('name').value = product.name;
    document.getElementById('category_id').value = product.category_id || '';
    document.getElementById('unit').value = product.unit;
    document.getElementById('reorder_point').value = product.reorder_point;
    
    document.getElementById('modalTitle').innerText = 'Edit Product';
    
    // Update labels for Edit mode (Stock Adjustment)
    document.getElementById('stockLabel').innerText = 'Adjust Stock (+/-)';
    document.getElementById('locationLabel').innerText = 'Adjustment Location';
    document.getElementById('stockHint').innerText = 'Enter positive to add, negative to remove stock.';
    document.getElementById('initial_stock').value = 0; 
    document.getElementById('initial_location_id').value = ''; // Ensure location is re-selected for adjustment
    
    const modal = new bootstrap.Modal(document.getElementById('productModal'));
    modal.show();
}

async function saveProduct(e) {
    e.preventDefault();
    const id = document.getElementById('productId').value;
    const isEdit = !!id;

    const body = {
        sku: document.getElementById('sku').value,
        name: document.getElementById('name').value,
        category_id: document.getElementById('category_id').value,
        unit: document.getElementById('unit').value,
        reorder_point: document.getElementById('reorder_point').value
    };

    const stockVal = document.getElementById('initial_stock').value;
    const locId = document.getElementById('initial_location_id').value;

    if (!isEdit) {
        body.initial_stock = stockVal;
        body.initial_location_id = locId;
    } else {
        // Validation for adjustments
        if (parseInt(stockVal) !== 0 && !locId) {
            showToast('Please select a location for stock adjustment', 'warning');
            return;
        }
        body.adjustment_stock = stockVal;
        body.adjustment_location_id = locId;
    }

    const res = await fetchApi(isEdit ? `/api/products/${id}` : '/api/products', {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify(body)
    });

    if (res.success) {
        showToast(res.message, 'success');
        const modalEl = document.getElementById('productModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if(modal) modal.hide();
        loadProducts();
    } else {
        showToast(res.message || 'Error saving product', 'danger');
    }
}

let pendingDeleteId = null;

function deleteProduct(id) {
    pendingDeleteId = id;
    document.getElementById('forceDeleteCheck').checked = false; // Reset checkbox
    const modal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
    modal.show();
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
        if (!pendingDeleteId) return;
        const force = document.getElementById('forceDeleteCheck').checked;
        const modal = bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal'));
        if (modal) modal.hide();
        
        const res = await fetchApi(`/api/products/${pendingDeleteId}?force=${force}`, { method: 'DELETE' });
        pendingDeleteId = null;
        if (res.success) {
            showToast(res.message, 'success');
            loadProducts();
        } else {
            showToast(res.message || 'Cannot delete product', 'danger');
        }
    });
});
