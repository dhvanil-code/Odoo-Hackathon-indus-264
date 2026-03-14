document.addEventListener('DOMContentLoaded', async () => {
    setPageTitle('Dashboard');

    const res = await fetchApi('/api/dashboard');
    if (res.success) {
        document.getElementById('t-products').innerText = res.kpis.totalProducts;
        document.getElementById('t-lowstock').innerText = res.kpis.lowStock;
        document.getElementById('t-receipts').innerText = res.kpis.pendingReceipts;
        document.getElementById('t-deliveries').innerText = res.kpis.pendingDeliveries;
        
        renderMovements(res.recentMovements);
    } else {
        showToast('Failed to load dashboard data', 'danger');
    }
});

function renderMovements(movements) {
    const tbody = document.getElementById('movements-table-body');
    if (movements.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No recent movements found.</td></tr>';
        return;
    }

    let html = '';
    movements.forEach(m => {
        let badgeType = 'bg-secondary';
        if(m.movement_type === 'receipt') badgeType = 'bg-success';
        if(m.movement_type === 'delivery') badgeType = 'bg-danger';
        if(m.movement_type === 'transfer') badgeType = 'bg-info';
        if(m.movement_type === 'adjustment') badgeType = 'bg-warning';

        html += `
            <tr>
                <td>${formatDate(m.timestamp)}</td>
                <td><strong>${m.document_reference || '-'}</strong></td>
                <td><span class="badge ${badgeType}">${m.movement_type.toUpperCase()}</span></td>
                <td>${m.product_name} <br><small class="text-muted">${m.sku}</small></td>
                <td>${m.quantity}</td>
                <td>${m.status}</td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}
