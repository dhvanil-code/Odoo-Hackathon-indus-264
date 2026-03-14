document.addEventListener('DOMContentLoaded', async () => {
    setPageTitle('Internal Transfers');
    await loadProductsAndLocations();
    await loadTransfers();
    document.getElementById('transferForm').addEventListener('submit', saveTransfer);
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

async function loadTransfers() {
    const res = await fetchApi('/api/operations/transfers');
    const tbody = document.getElementById('transfers-table-body');
    if (res.success && res.data.length > 0) {
        let html = '';
        res.data.forEach(r => {
            let badge = r.status === 'draft' ? 'bg-secondary' : 'bg-info';
            let btn = r.status === 'draft' ? `<button class="btn btn-sm btn-success" onclick="validateTransfer(${r.id})"><i class="bi bi-check-lg"></i> Validate</button>` : '';
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
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No transfers found.</td></tr>';
    }
}

function openCreateModal() {
    document.getElementById('transferForm').reset();
    document.getElementById('itemsContainer').innerHTML = '';
    addItemRow();
}

function addItemRow() {
    const container = document.getElementById('itemsContainer');
    const template = document.getElementById('itemRowTemplate').content.cloneNode(true);
    
    const pSelect = template.querySelector('.product-select');
    pSelect.innerHTML = '<option value="">Product...</option>' + 
        productsList.map(p => `<option value="${p.id}">${p.sku} - ${p.name}</option>`).join('');
        
    const sSelect = template.querySelector('.source-select');
    const dSelect = template.querySelector('.dest-select');
    const locOptions = '<option value="">Location...</option>' + 
        locationsList.map(l => `<option value="${l.id}">${l.warehouse_name} - ${l.code}</option>`).join('');
    
    sSelect.innerHTML = locOptions;
    dSelect.innerHTML = locOptions;
        
    container.appendChild(template);
}

async function saveTransfer(e) {
    e.preventDefault();
    
    const reference = document.getElementById('reference').value;
    const items = [];
    let valid = true;
    
    document.querySelectorAll('.item-row').forEach(row => {
        const pId = row.querySelector('.product-select').value;
        const sId = row.querySelector('.source-select').value;
        const dId = row.querySelector('.dest-select').value;
        const qty = row.querySelector('.item-qty').value;
        
        if(sId === dId) {
            showToast('Source and Destination cannot be the same', 'warning');
            valid = false;
        }

        if(pId && sId && dId && qty) {
            items.push({ product_id: pId, source_location_id: sId, dest_location_id: dId, quantity: parseInt(qty) });
        }
    });

    if(!valid) return;
    if(items.length === 0) {
        return showToast('Please add at least one valid item', 'warning');
    }

    const res = await fetchApi('/api/operations/transfers', {
        method: 'POST',
        body: JSON.stringify({ reference, items })
    });

    if (res.success) {
        showToast('Transfer created as DRAFT', 'success');
        const modal = bootstrap.Modal.getInstance(document.getElementById('transferModal'));
        if(modal) modal.hide();
        loadTransfers();
    } else {
        showToast(res.message || 'Error creating transfer', 'danger');
    }
}

async function validateTransfer(id) {
    if(confirm('Are you sure you want to validate this transfer?')) {
        const res = await fetchApi(`/api/operations/transfers/${id}/validate`, { method: 'POST' });
        if(res.success) {
            showToast('Transfer validated successfully', 'success');
            loadTransfers();
        } else {
            showToast(res.message || 'Validation failed', 'danger');
        }
    }
}
