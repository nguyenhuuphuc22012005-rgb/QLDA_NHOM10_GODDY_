/**
 * Module: Quản Lý Khách Hàng Doanh Nghiệp (B2B)
 */
async function loadClients() {
  try {
    const res = await fetch('/api/clients');
    const data = await res.json();
    globalClients = data.clients || [];
    renderClientsTable(globalClients);
  } catch (err) {
    console.error('Lỗi tải danh sách khách hàng:', err);
  }
}

function renderClientsTable(clients) {
  const tbody = document.getElementById('clientsTableBody');
  if (!tbody) return;

  tbody.innerHTML = '';
  if (!clients || clients.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-3">Không có khách hàng nào.</td></tr>';
    return;
  }
  clients.forEach(c => {
    const limit = parseFloat(c.creditLimit || 100000000);
    tbody.innerHTML += `
      <tr>
        <td>
          <strong>${c.companyName}</strong><br>
          <small class="text-muted">${c.address || 'Chưa cập nhật'}</small>
        </td>
        <td><code>${c.taxCode}</code></td>
        <td>${c.contactPerson || '-'}</td>
        <td>
          <small>${c.contactEmail || '-'}</small><br>
          <small class="text-muted">${c.contactPhone || ''}</small>
        </td>
        <td><span class="badge bg-secondary">Net ${c.paymentTermDays} ngày</span></td>
        <td>
          <strong class="text-primary">${formatMoney(limit)}</strong>
        </td>
        <td>
          <button class="btn btn-sm btn-outline-primary me-1" onclick="openModalEditClient(${c.id})" title="Chỉnh sửa thông tin & Hạn mức nợ">
            <i class="fa-solid fa-pen-to-square me-1"></i>Sửa
          </button>
        </td>
      </tr>
    `;
  });
}

function filterClientsTable() {
  const inputEl = document.getElementById('clientSearchInput');
  const q = inputEl ? inputEl.value.toLowerCase() : '';
  const filtered = globalClients.filter(c =>
    (c.companyName && c.companyName.toLowerCase().includes(q)) ||
    (c.taxCode && c.taxCode.toLowerCase().includes(q)) ||
    (c.contactPerson && c.contactPerson.toLowerCase().includes(q))
  );
  renderClientsTable(filtered);
}

function openModalAddClient() {
  const form = document.getElementById('formAddClient');
  if (form) form.reset();
  const modalEl = document.getElementById('modalAddClient');
  if (modalEl) {
    new bootstrap.Modal(modalEl).show();
  } else {
    alert('Không tìm thấy hộp thoại thêm khách hàng!');
  }
}

async function submitAddClient(e) {
  e.preventDefault();
  const getVal = id => {
    const el = document.getElementById(id);
    return el ? el.value : '';
  };

  const body = {
    companyName: getVal('newClientName'),
    taxCode: getVal('newClientTaxCode'),
    paymentTermDays: getVal('newClientNetDays'),
    address: getVal('newClientAddress'),
    contactPerson: getVal('newClientContactPerson'),
    contactPhone: getVal('newClientContactPhone'),
    contactEmail: getVal('newClientContactEmail'),
    creditLimit: getVal('newClientCreditLimit') || 100000000
  };

  try {
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.success) {
      const modalEl = document.getElementById('modalAddClient');
      if (modalEl) {
        const modalInst = bootstrap.Modal.getInstance(modalEl);
        if (modalInst) modalInst.hide();
      }
      alert('Thêm khách hàng doanh nghiệp thành công!');
      loadClients();
    } else {
      alert(data.message || 'Có lỗi xảy ra!');
    }
  } catch (err) {
    alert('Lỗi kết nối máy chủ!');
  }
}

function openModalEditClient(id) {
  const client = globalClients.find(c => c.id === id);
  if (!client) return alert('Không tìm thấy dữ liệu khách hàng!');

  const setVal = (fieldId, val) => {
    const el = document.getElementById(fieldId);
    if (el) el.value = val || '';
  };

  setVal('editClientId', client.id);
  setVal('editClientName', client.companyName);
  setVal('editClientTaxCode', client.taxCode);
  setVal('editClientAddress', client.address);
  setVal('editClientContactPerson', client.contactPerson);
  setVal('editClientContactPhone', client.contactPhone);
  setVal('editClientContactEmail', client.contactEmail);
  setVal('editClientNetDays', client.paymentTermDays || 30);
  setVal('editClientCreditLimit', client.creditLimit || 100000000);
  setVal('editClientStatus', client.status || 'Active');

  const modalEl = document.getElementById('modalEditClient');
  if (modalEl) {
    new bootstrap.Modal(modalEl).show();
  }
}

async function submitEditClient(e) {
  e.preventDefault();
  const getVal = id => {
    const el = document.getElementById(id);
    return el ? el.value : '';
  };

  const id = getVal('editClientId');
  const body = {
    companyName: getVal('editClientName'),
    address: getVal('editClientAddress'),
    contactPerson: getVal('editClientContactPerson'),
    contactPhone: getVal('editClientContactPhone'),
    contactEmail: getVal('editClientContactEmail'),
    paymentTermDays: getVal('editClientNetDays'),
    creditLimit: getVal('editClientCreditLimit'),
    status: getVal('editClientStatus')
  };

  try {
    const res = await fetch(`/api/clients/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.success) {
      const modalEl = document.getElementById('modalEditClient');
      if (modalEl) {
        const modalInst = bootstrap.Modal.getInstance(modalEl);
        if (modalInst) modalInst.hide();
      }
      alert('Cập nhật thông tin khách hàng thành công!');
      loadClients();
    } else {
      alert(data.message || 'Cập nhật thất bại!');
    }
  } catch (err) {
    alert('Lỗi kết nối máy chủ!');
  }
}

function exportClientsCSV() {
  if (!globalClients.length) return alert('Không có dữ liệu!');
  let csv = 'ID,Doanh Nghiệp,Mã Số Thuế,Địa Chỉ,Người Liên Hệ,Email,Điện Thoại,NetDays,CreditLimit\n';
  globalClients.forEach(c => {
    csv += `"${c.id}","${c.companyName}","${c.taxCode}","${c.address || ''}","${c.contactPerson || ''}","${c.contactEmail || ''}","${c.contactPhone || ''}","${c.paymentTermDays}","${c.creditLimit || 100000000}"\n`;
  });
  downloadCSV(csv, 'Danh_Sach_Khach_Hang_B2B.csv');
}