document.addEventListener('DOMContentLoaded', async () => {
    setPageTitle('Move History');
    await loadHistory();
});

async function loadHistory() {
    const res = await fetchApi('/api/operations/movements');
    const tbody = document.getElementById('history-table-body');
    if (res.success && res.data.length > 0) {
        let html = '';
        res.data.forEach(m => {
            let badgeType = 'bg-secondary';
            if(m.movement_type === 'receipt') badgeType = 'bg-success';
            if(m.movement_type === 'delivery') badgeType = 'bg-danger';
            if(m.movement_type === 'transfer') badgeType = 'bg-info';
            if(m.movement_type === 'adjustment') badgeType = 'bg-warning text-dark';

            html += `
                <tr>
                    <td>${formatDate(m.timestamp)}</td>
                    <td><span class="badge ${badgeType}">${m.movement_type.toUpperCase()}</span></td>
                    <td><strong>${m.document_reference || '-'}</strong></td>
                    <td>${m.product_name} <br><small class="text-muted">${m.sku}</small></td>
                    <td><span class="badge bg-light text-dark">${m.source_code || '-'}</span></td>
                    <td><span class="badge bg-light text-dark">${m.dest_code || '-'}</span></td>
                    <td><strong>${m.quantity}</strong></td>
                    <td>${m.user_name || '-'}</td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    } else {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No history found.</td></tr>';
    }
}
