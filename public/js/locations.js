document.addEventListener('DOMContentLoaded', async () => {
    setPageTitle('Locations');
    await loadWarehouses();
    await loadLocations();
    document.getElementById('locationForm').addEventListener('submit', saveLocation);
});

async function loadWarehouses() {
    const res = await fetchApi('/api/warehouses');
    const select = document.getElementById('warehouse_id');
    if (res.success && res.data.length > 0) {
        res.data.forEach(w => {
            select.innerHTML += `<option value="${w.id}">${w.name}</option>`;
        });
    }
}

async function loadLocations() {
    const res = await fetchApi('/api/locations');
    const tbody = document.getElementById('locations-table-body');
    if (res.success && res.data.length > 0) {
        let html = '';
        res.data.forEach(l => {
            html += `
                <tr>
                    <td><strong>${l.code}</strong></td>
                    <td><span class="badge bg-light text-dark">${l.warehouse_name}</span></td>
                    <td>${l.description || '-'}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick='editLocation(${JSON.stringify(l).replace(/'/g, "&#39;")})'><i class="bi bi-pencil"></i></button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteLocation(${l.id})"><i class="bi bi-trash"></i></button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    } else {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No locations found.</td></tr>';
    }
}

function openCreateModal() {
    document.getElementById('locationForm').reset();
    document.getElementById('locationId').value = '';
    document.getElementById('modalTitle').innerText = 'Add Location';
}

function editLocation(l) {
    document.getElementById('locationId').value = l.id;
    document.getElementById('code').value = l.code;
    document.getElementById('warehouse_id').value = l.warehouse_id;
    document.getElementById('description').value = l.description || '';
    
    document.getElementById('modalTitle').innerText = 'Edit Location';
    const modal = new bootstrap.Modal(document.getElementById('locationModal'));
    modal.show();
}

async function saveLocation(e) {
    e.preventDefault();
    const id = document.getElementById('locationId').value;
    const isEdit = !!id;

    const body = {
        code: document.getElementById('code').value,
        warehouse_id: document.getElementById('warehouse_id').value,
        description: document.getElementById('description').value
    };

    const res = await fetchApi(isEdit ? `/api/locations/${id}` : '/api/locations', {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify(body)
    });

    if (res.success) {
        showToast(res.message, 'success');
        const modalEl = document.getElementById('locationModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if(modal) modal.hide();
        loadLocations();
    } else {
        showToast(res.message || 'Error saving location', 'danger');
    }
}

let pendingDeleteId = null;

function deleteLocation(id) {
    pendingDeleteId = id;
    const modal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
    modal.show();
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
        if (!pendingDeleteId) return;
        const modal = bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal'));
        if (modal) modal.hide();
        const res = await fetchApi(`/api/locations/${pendingDeleteId}`, { method: 'DELETE' });
        pendingDeleteId = null;
        if (res.success) {
            showToast('Location deleted successfully', 'success');
            loadLocations();
        } else {
            showToast(res.message || 'Cannot delete location', 'danger');
        }
    });
});
