document.addEventListener('DOMContentLoaded', async () => {
    setPageTitle('Receipts (Incoming)');
    await loadProductsAndLocations();
    await loadReceipts();
    document.getElementById('receiptForm').addEventListener('submit', saveReceipt);
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

async function loadReceipts() {
    const res = await fetchApi('/api/operations/receipts');
    const tbody = document.getElementById('receipts-table-body');
    if (res.success && res.data.length > 0) {
        let html = '';
        res.data.forEach(r => {
            let badge = r.status === 'draft' ? 'bg-secondary' : 'bg-success';
            let btn = r.status === 'draft' ? `<button class="btn btn-sm btn-success" onclick="validateReceipt(${r.id})"><i class="bi bi-check-lg"></i> Validate</button>` : '';
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
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No receipts found.</td></tr>';
    }
}

function openCreateModal() {
    document.getElementById('receiptForm').reset();
    document.getElementById('itemsContainer').innerHTML = '';
    addItemRow();
}

function addItemRow() {
    const container = document.getElementById('itemsContainer');
    const template = document.getElementById('itemRowTemplate').content.cloneNode(true);
    
    // Populate selects
    const pSelect = template.querySelector('.product-select');
    pSelect.innerHTML = '<option value="">Select Product...</option>' + 
        productsList.map(p => `<option value="${p.id}">${p.sku} - ${p.name}</option>`).join('');
        
    const lSelect = template.querySelector('.location-select');
    lSelect.innerHTML = '<option value="">Dest Location...</option>' + 
        locationsList.map(l => `<option value="${l.id}">${l.warehouse_name} - ${l.code}</option>`).join('');
        
    container.appendChild(template);
}

async function saveReceipt(e) {
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

    const res = await fetchApi('/api/operations/receipts', {
        method: 'POST',
        body: JSON.stringify({ reference, items })
    });

    if (res.success) {
        showToast('Receipt created as DRAFT', 'success');
        const modal = bootstrap.Modal.getInstance(document.getElementById('receiptModal'));
        if(modal) modal.hide();
        loadReceipts();
    } else {
        showToast(res.message || 'Error creating receipt', 'danger');
    }
}

async function validateReceipt(id) {
    if(confirm('Are you sure you want to validate this receipt? Stock will be increased.')) {
        const res = await fetchApi(`/api/operations/receipts/${id}/validate`, { method: 'POST' });
        if(res.success) {
            showToast('Receipt validated successfully', 'success');
            loadReceipts();
        } else {
            showToast(res.message || 'Validation failed', 'danger');
        }
    }
}
