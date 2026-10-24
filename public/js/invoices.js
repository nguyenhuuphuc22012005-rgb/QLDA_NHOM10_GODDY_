/**
 * Module: Quáº£n LÃ½ HÃ³a ÄÆ¡n Dá»‹ch Vá»¥ Tuyá»ƒn Dá»¥ng (Invoices)
 */
async function loadInvoices() {
  const statusEl = document.getElementById('invoiceFilterStatus');
  const status = statusEl ? statusEl.value : 'All';

  const url = (status && status !== 'All' && status !== 'Overdue')
    ? `/api/invoices?status=${encodeURIComponent(status)}`
    : '/api/invoices';

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const tbody = document.getElementById('invoicesTableBody');
    if (!tbody) return;

    if (!Array.isArray(data.invoices)) {
      throw new Error('Du lieu API khong hop le.');
    }

    let invoices = data.invoices;

    if (status === 'Overdue') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      invoices = invoices.filter(inv => {
        const remaining = Number(
          inv.remainingAmount ??
          (Number(inv.totalAmount || 0) - Number(inv.paidAmount || 0))
        );

        if (remaining <= 0 || !inv.dueDate) return false;

        const dateText = String(inv.dueDate).slice(0, 10);
        const parts = dateText.split('-');
        if (parts.length !== 3) return false;

        const dueDate = new Date(
          Number(parts[0]),
          Number(parts[1]) - 1,
          Number(parts[2])
        );

        if (Number.isNaN(dueDate.getTime())) return false;
        dueDate.setHours(0, 0, 0, 0);

        return dueDate < today;
      });
    }

    tbody.innerHTML = '';

    if (invoices.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="8" class="text-center text-muted py-3">Khong co hoa don nao phu hop.</td></tr>';
      return;
    }

    invoices.forEach(inv => {
      let badgeClass = 'badge-sent';
      let statusLabel = 'Da gui';

      if (inv.status === 'Paid') {
        badgeClass = 'badge-paid';
        statusLabel = 'Da tat toan';
      } else if (inv.status === 'Partial') {
        badgeClass = 'badge-partial';
        statusLabel = 'Tra mot phan';
      } else if (inv.status === 'Overdue') {
        badgeClass = 'badge-overdue';
        statusLabel = 'Qua han';
      }

      if (status === 'Overdue') {
        badgeClass = 'badge-overdue';
        statusLabel = 'Qua han';
      }

      const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[c]));

      tbody.innerHTML += `
        <tr>
          <td><strong>${escape(inv.invoiceCode || '-')}</strong></td>
          <td>${escape(inv.Client ? inv.Client.companyName : '-')}</td>
          <td class="fw-bold">${formatMoney(inv.totalAmount)}</td>
          <td class="text-success">${formatMoney(inv.paidAmount)}</td>
          <td class="text-danger fw-bold">${formatMoney(inv.remainingAmount)}</td>
          <td>${escape(inv.dueDate || '-')}</td>
          <td><span class="status-badge ${badgeClass}">${statusLabel}</span></td>
          <td>
            <button class="btn btn-sm btn-outline-primary" onclick="viewInvoiceDetail(${Number(inv.id)})">
              <i class="fa-solid fa-file-lines me-1"></i>Xem &amp; In
            </button>
          </td>
        </tr>
      `;
    });
  } catch (err) {
    console.error('Loi tai danh sach hoa don:', err);
    const tbody = document.getElementById('invoicesTableBody');
    if (tbody) {
      tbody.innerHTML =
        '<tr><td colspan="8" class="text-center text-danger py-3">Khong tai duoc danh sach hoa don.</td></tr>';
    }
  }
}

async function viewInvoiceDetail(invoiceId) {
  try {
    const res = await fetch(`/api/invoices/${invoiceId}`);
    const data = await res.json();
    if (!data.success || !data.invoice) return alert('KhÃ´ng tÃ¬m tháº¥y thÃ´ng tin hÃ³a Ä‘Æ¡n!');
    const inv = data.invoice;

    const setTxt = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setTxt('invDetailCode', inv.invoiceCode);
    setTxt('invDetailIssueDate', inv.issueDate);
    setTxt('invDetailDueDate', inv.dueDate);
    setTxt('invDetailClientName', inv.Client ? inv.Client.companyName : '-');
    setTxt('invDetailTaxCode', inv.Client ? inv.Client.taxCode : '-');
    setTxt('invDetailAddress', inv.Client ? inv.Client.address : '-');

    const candidateName = inv.Placement?.Candidate?.fullName || 'á»¨ng viÃªn';
    const jobTitle = inv.Placement?.Job?.title || 'ChuyÃªn viÃªn';
    setTxt('invDetailPlacementInfo', `${candidateName} - ${jobTitle}`);

    setTxt('invDetailSubtotal', formatMoney(inv.subtotal));
    setTxt('invDetailSubtotalFoot', formatMoney(inv.subtotal));
    setTxt('invDetailVat', formatMoney(inv.vatAmount));
    setTxt('invDetailTotal', formatMoney(inv.totalAmount));
    setTxt('invDetailPaid', formatMoney(inv.paidAmount));
    setTxt('invDetailRemaining', formatMoney(inv.remainingAmount));

    let badgeClass = 'badge-sent';
    if (inv.status === 'Paid') badgeClass = 'badge-paid';
    if (inv.status === 'Partial') badgeClass = 'badge-partial';
    if (inv.status === 'Overdue') badgeClass = 'badge-overdue';

    const statusBadgeEl = document.getElementById('invDetailStatusBadge');
    if (statusBadgeEl) {
      statusBadgeEl.innerHTML = `<span class="status-badge ${badgeClass}">${inv.status}</span>`;
    }

    const modalEl = document.getElementById('modalInvoiceDetail');
    if (modalEl) {
      new bootstrap.Modal(modalEl).show();
    } else {
      alert('Chi tiáº¿t HÄ ' + inv.invoiceCode + ' | CÃ²n ná»£: ' + formatMoney(inv.remainingAmount));
    }
  } catch (err) {
    console.error('Lá»—i xem chi tiáº¿t hÃ³a Ä‘Æ¡n:', err);
    alert('KhÃ´ng thá»ƒ má»Ÿ chi tiáº¿t hÃ³a Ä‘Æ¡n!');
  }
}

async function exportInvoicesCSV() {
  try {
    const res = await fetch('/api/invoices');
    if (!res.ok) throw new Error('HTTP ' + res.status);

    const data = await res.json();
    if (!Array.isArray(data.invoices)) {
      throw new Error('Dữ liệu hóa đơn không hợp lệ.');
    }

    const headers = [
      'Mã hóa đơn', 'Khách hàng', 'Tổng tiền',
      'Đã trả', 'Còn nợ', 'Hạn trả', 'Trạng thái'
    ];

    const escapeCSV = value =>
      '"' + String(value ?? '').replace(/"/g, '""') + '"';

    const rows = data.invoices.map(i => [
      i.invoiceCode,
      i.Client?.companyName || '',
      i.totalAmount,
      i.paidAmount,
      i.remainingAmount,
      i.dueDate,
      i.status
    ]);

    const csv = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\r\n');

    downloadCSV(csv, 'Danh_Sach_Hoa_Don.csv');
  } catch (err) {
    console.error('Lỗi xuất CSV:', err);
    alert('Không thể xuất CSV. Vui lòng kiểm tra kết nối và thử lại.');
  }
}
