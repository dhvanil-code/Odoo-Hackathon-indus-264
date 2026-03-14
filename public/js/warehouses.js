document.addEventListener('DOMContentLoaded', async () => {
    setPageTitle('Warehouses');
    await loadWarehouses();
    document.getElementById('warehouseForm').addEventListener('submit', saveWarehouse);
});

async function loadWarehouses() {
    const res = await fetchApi('/api/warehouses');
    const tbody = document.getElementById('warehouses-table-body');
    if (res.success && res.data.length > 0) {
        let html = '';
        res.data.forEach(w => {
            html += `
                <tr>
                    <td><strong>${w.code}</strong></td>
                    <td>${w.name}</td>
                    <td>${w.address || '-'}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick='editWarehouse(${JSON.stringify(w).replace(/'/g, "&#39;")})'><i class="bi bi-pencil"></i></button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteWarehouse(${w.id})"><i class="bi bi-trash"></i></button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    } else {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No warehouses found.</td></tr>';
    }
}

function openCreateModal() {
    document.getElementById('warehouseForm').reset();
    document.getElementById('warehouseId').value = '';
    document.getElementById('modalTitle').innerText = 'Add Warehouse';
}

function editWarehouse(w) {
    document.getElementById('warehouseId').value = w.id;
    document.getElementById('code').value = w.code;
    document.getElementById('name').value = w.name;
    document.getElementById('address').value = w.address || '';
    
    document.getElementById('modalTitle').innerText = 'Edit Warehouse';
    const modal = new bootstrap.Modal(document.getElementById('warehouseModal'));
    modal.show();
}

async function saveWarehouse(e) {
    e.preventDefault();
    const id = document.getElementById('warehouseId').value;
    const isEdit = !!id;

    const body = {
        code: document.getElementById('code').value,
        name: document.getElementById('name').value,
        address: document.getElementById('address').value
    };

    const res = await fetchApi(isEdit ? `/api/warehouses/${id}` : '/api/warehouses', {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify(body)
    });

    if (res.success) {
        showToast(res.message, 'success');
        const modalEl = document.getElementById('warehouseModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if(modal) modal.hide();
        loadWarehouses();
    } else {
        showToast(res.message || 'Error saving warehouse', 'danger');
    }
}

let pendingDeleteId = null;

function deleteWarehouse(id) {
    pendingDeleteId = id;
    const modal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
    modal.show();
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
        if (!pendingDeleteId) return;
        const modal = bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal'));
        if (modal) modal.hide();
        const res = await fetchApi(`/api/warehouses/${pendingDeleteId}`, { method: 'DELETE' });
        pendingDeleteId = null;
        if (res.success) {
            showToast('Warehouse deleted successfully', 'success');
            loadWarehouses();
        } else {
            showToast(res.message || 'Cannot delete warehouse', 'danger');
        }
    });
});
