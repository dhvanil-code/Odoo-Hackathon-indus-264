document.addEventListener('DOMContentLoaded', async () => {
    setPageTitle('Delivery Orders (Outgoing)');
    await loadProductsAndLocations();
    await loadDeliveries();
    document.getElementById('deliveryForm').addEventListener('submit', saveDelivery);
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

async function loadDeliveries() {
    const res = await fetchApi('/api/operations/deliveries');
    const tbody = document.getElementById('deliveries-table-body');
    if (res.success && res.data.length > 0) {
        let html = '';
        res.data.forEach(r => {
            let badge = r.status === 'draft' ? 'bg-secondary' : 'bg-success';
            let btn = r.status === 'draft' ? `<button class="btn btn-sm btn-success" onclick="validateDelivery(${r.id})"><i class="bi bi-check-lg"></i> Validate</button>` : '';
            html += `
                <tr>
                    <td>${formatDate(r.date)}</td>
                    <td><strong>${r.reference}</strong></td>
                    <td><span class="badge ${badge}">${r.status.toUpperCase()}</span></td>
                    <td>${btn}</td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    } else {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No deliveries found.</td></tr>';
    }
}

function openCreateModal() {
    document.getElementById('deliveryForm').reset();
    document.getElementById('itemsContainer').innerHTML = '';
    addItemRow();
}

function addItemRow() {
    const container = document.getElementById('itemsContainer');
    const template = document.getElementById('itemRowTemplate').content.cloneNode(true);
    
    const pSelect = template.querySelector('.product-select');
    pSelect.innerHTML = '<option value="">Select Product...</option>' + 
        productsList.map(p => `<option value="${p.id}">${p.sku} - ${p.name}</option>`).join('');
        
    const lSelect = template.querySelector('.location-select');
    lSelect.innerHTML = '<option value="">Source Location...</option>' + 
        locationsList.map(l => `<option value="${l.id}">${l.warehouse_name} - ${l.code}</option>`).join('');
        
    container.appendChild(template);
}

async function saveDelivery(e) {
    e.preventDefault();
    
    const reference = document.getElementById('reference').value;
    const items = [];
    
    document.querySelectorAll('.item-row').forEach(row => {
        const pId = row.querySelector('.product-select').value;
        const lId = row.querySelector('.location-select').value;
        const qty = row.querySelector('.item-qty').value;
        if(pId && lId && qty) {
            items.push({ product_id: pId, location_id: lId, quantity: parseInt(qty) });
        }
    });

    if(items.length === 0) {
        return showToast('Please add at least one valid item', 'warning');
    }

    const res = await fetchApi('/api/operations/deliveries', {
        method: 'POST',
        body: JSON.stringify({ reference, items })
    });

    if (res.success) {
        showToast('Delivery created as DRAFT', 'success');
        const modal = bootstrap.Modal.getInstance(document.getElementById('deliveryModal'));
        if(modal) modal.hide();
        loadDeliveries();
    } else {
        showToast(res.message || 'Error creating delivery', 'danger');
    }
}

async function validateDelivery(id) {
    if(confirm('Are you sure you want to validate this delivery? Stock will be decreased.')) {
        const res = await fetchApi(`/api/operations/deliveries/${id}/validate`, { method: 'POST' });
        if(res.success) {
            showToast('Delivery validated successfully', 'success');
            loadDeliveries();
        } else {
            showToast(res.message || 'Validation failed', 'danger');
        }
    }
}
