document.addEventListener('DOMContentLoaded', async () => {
    setPageTitle('Inventory Adjustments');
    await loadProductsAndLocations();
    await loadAdjustments();
    document.getElementById('adjustmentForm').addEventListener('submit', saveAdjustment);
});

let productsList = [];
let locationsList = [];

async function loadProductsAndLocations() {
    const [pRes, lRes] = await Promise.all([
        fetchApi('/api/products'),
        fetchApi('/api/locations')
    ]);
    if (pRes.success) productsList = pRes.data;
    if (lRes.success) locationsList = lRes.data;
}

async function loadAdjustments() {
    const res = await fetchApi('/api/operations/adjustments');
    const tbody = document.getElementById('adjustments-table-body');
    if (res.success && res.data.length > 0) {
        let html = '';
        res.data.forEach(r => {
            let badge = r.status === 'draft' ? 'bg-secondary' : 'bg-warning text-dark';
            let btn = r.status === 'draft' ? `<button class="btn btn-sm btn-success" onclick="validateAdjustment(${r.id})"><i class="bi bi-check-lg"></i> Validate</button>` : '';
            html += `
                <tr>
                    <td>${formatDate(r.date)}</td>
                    <td><strong>${r.reference}</strong></td>
                    <td>${r.reason}</td>
                    <td><span class="badge ${badge}">${r.status.toUpperCase()}</span></td>
                    <td>${btn}</td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    } else {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No adjustments found.</td></tr>';
    }
}

function openCreateModal() {
    document.getElementById('adjustmentForm').reset();
    document.getElementById('itemsContainer').innerHTML = '';
    addItemRow();
}

function addItemRow() {
    const container = document.getElementById('itemsContainer');
    const template = document.getElementById('itemRowTemplate').content.cloneNode(true);
    
    const pSelect = template.querySelector('.product-select');
    pSelect.innerHTML = '<option value="">Product...</option>' + 
        productsList.map(p => `<option value="${p.id}">${p.sku} - ${p.name}</option>`).join('');
        
    const lSelect = template.querySelector('.location-select');
    lSelect.innerHTML = '<option value="">Location...</option>' + 
        locationsList.map(l => `<option value="${l.id}">${l.warehouse_name} - ${l.code}</option>`).join('');
        
    container.appendChild(template);
}

async function saveAdjustment(e) {
    e.preventDefault();
    
    const reference = document.getElementById('reference').value;
    const reason = document.getElementById('reason').value;
    const items = [];
    
    document.querySelectorAll('.item-row').forEach(row => {
        const pId = row.querySelector('.product-select').value;
        const lId = row.querySelector('.location-select').value;
        const counted = parseInt(row.querySelector('.item-counted-qty').value || 0);
        const system = parseInt(row.querySelector('.item-system-qty').value || 0);
        
        if(pId && lId) {
            items.push({ 
                product_id: pId, 
                location_id: lId, 
                counted_quantity: counted, 
                system_quantity: system,
                difference: counted - system
            });
        }
    });

    if(items.length === 0) {
        return showToast('Please add at least one valid item', 'warning');
    }

    const res = await fetchApi('/api/operations/adjustments', {
        method: 'POST',
        body: JSON.stringify({ reference, reason, items })
    });

    if (res.success) {
        showToast('Adjustment created as DRAFT', 'success');
        const modal = bootstrap.Modal.getInstance(document.getElementById('adjustmentModal'));
        if(modal) modal.hide();
        loadAdjustments();
    } else {
        showToast(res.message || 'Error creating adjustment', 'danger');
    }
}

async function validateAdjustment(id) {
    if(confirm('Are you sure you want to validate this adjustment? Stock will be updated.')) {
        const res = await fetchApi(`/api/operations/adjustments/${id}/validate`, { method: 'POST' });
        if(res.success) {
            showToast('Adjustment validated successfully', 'success');
            loadAdjustments();
        } else {
            showToast(res.message || 'Validation failed', 'danger');
        }
    }
}
