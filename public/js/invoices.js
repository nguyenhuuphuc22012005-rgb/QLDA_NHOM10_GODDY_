/**
 * Module: Quản Lý Hóa Đơn Dịch Vụ Tuyển Dụng
 * TASK-083: Invoice Status Badges
 * Chức năng: Danh sách, lọc, xem chi tiết, in và xuất CSV.
 */

(function () {
    'use strict';

    // Nếu chạy backend ở cổng khác 3000, sửa URL này.
    const API_BASE_URL = window.location.protocol === 'file:'
        ? 'http://localhost:3000'
        : window.location.origin;

    const STATUS_BADGES = {
        Sent: 'badge-sent',
        Partial: 'badge-partial',
        Paid: 'badge-paid',
        Overdue: 'badge-overdue'
    };

    const STATUS_LABELS = {
        Sent: 'Đã gửi',
        Partial: 'Trả 1 phần',
        Paid: 'Hoàn tất',
        Overdue: 'Quá hạn'
    };

    // Chuyển dữ liệu thành HTML an toàn.
    function escapeHTML(value) {
        return String(value ?? '').replace(/[&<>"']/g, function (char) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[char];
        });
    }

    // Định dạng tiền Việt Nam.
    function formatMoneySafe(value) {
        const amount = Number(value ?? 0);

        if (typeof window.formatMoney === 'function') {
            return window.formatMoney(amount);
        }

        return amount.toLocaleString('vi-VN') + ' ₫';
    }

    // Chuẩn hóa ngày hiển thị.
    function formatDateSafe(value) {
        if (!value) return '-';

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return escapeHTML(value);
        }

        return date.toLocaleDateString('vi-VN');
    }

    // Lấy class huy hiệu theo trạng thái.
    function getBadgeClass(status) {
        return STATUS_BADGES[status] || 'badge-sent';
    }

    // Tạo HTML huy hiệu trạng thái.
    function createStatusBadge(status) {
        const label = STATUS_LABELS[status] || status || 'Unknown';

        return `
            <span class="status-badge ${getBadgeClass(status)}">
                ${escapeHTML(label)}
            </span>
        `;
    }

    // Gọi API và xử lý lỗi HTTP/JSON.
    async function apiRequest(path, options = {}) {
        const url = `${API_BASE_URL}${path}`;

        let response;

        try {
            response = await fetch(url, {
                ...options,
                headers: {
                    Accept: 'application/json',
                    ...(options.headers || {})
                }
            });
        } catch (error) {
            if (window.location.protocol === 'file:') {
                throw new Error(
                    'Bạn đang mở HTML trực tiếp từ ổ đĩa. ' +
                    'Hãy chạy backend và mở http://localhost:3000/invoices.html.'
                );
            }

            throw new Error(
                'Không kết nối được API. Hãy kiểm tra backend và địa chỉ API.'
            );
        }

        if (!response.ok) {
            throw new Error(`API trả về HTTP ${response.status}: ${path}`);
        }

        const contentType = response.headers.get('content-type') || '';

        if (!contentType.includes('application/json')) {
            throw new Error(
                'API không trả về JSON. Hãy kiểm tra route backend.'
            );
        }

        return response.json();
    }

    // Hiển thị thông báo trong bảng.
    function showTableMessage(message, type = 'muted') {
        const tbody = document.getElementById('invoicesTableBody');

        if (!tbody) return;

        tbody.innerHTML = `
            <tr>
                <td colspan="8"
                    class="text-center text-${type} py-4">
                    ${escapeHTML(message)}
                </td>
            </tr>
        `;
    }

    // Tải và hiển thị danh sách hóa đơn.
    async function loadInvoices() {
        const statusEl = document.getElementById('invoiceFilterStatus');
        const status = statusEl ? statusEl.value : '';

        const params = new URLSearchParams();

        if (status && status !== 'All' && status !== 'Overdue') {
            params.set('status', status);
        }

        const query = params.toString();
        const path = `/api/invoices${query ? `?${query}` : ''}`;

        showTableMessage('Đang tải danh sách hóa đơn...', 'muted');

        try {
            const data = await apiRequest(path);
            const tbody = document.getElementById('invoicesTableBody');

            if (!tbody) return;

            if (!Array.isArray(data.invoices)) {
                throw new Error(
                    'Dữ liệu API không đúng định dạng: cần có mảng invoices.'
                );
            }

            let invoices = data.invoices;

            if (status === 'Overdue') {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                invoices = invoices.filter(function (inv) {
                    const remaining = Number(
                        inv.remainingAmount ??
                        (Number(inv.totalAmount || 0) - Number(inv.paidAmount || 0))
                    );

                    if (!(remaining > 0) || !inv.dueDate) {
                        return false;
                    }

                    const parts = String(inv.dueDate).slice(0, 10).split('-');
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

            if (invoices.length === 0) {
                showTableMessage('Không có hóa đơn nào phù hợp.');
                return;
            }

            tbody.innerHTML = invoices.map(function (inv) {
                const clientName = inv.Client?.companyName || '-';
                const invoiceId = Number(inv.id);

                const remainingAmount = inv.remainingAmount ??
                    (Number(inv.totalAmount || 0) -
                        Number(inv.paidAmount || 0));

                return `
                    <tr>
                        <td>
                            <strong>${escapeHTML(inv.invoiceCode || '-')}</strong>
                        </td>

                        <td>${escapeHTML(clientName)}</td>

                        <td class="fw-bold">
                            ${escapeHTML(formatMoneySafe(inv.totalAmount))}
                        </td>

                        <td class="text-success">
                            ${escapeHTML(formatMoneySafe(inv.paidAmount))}
                        </td>

                        <td class="text-danger fw-bold">
                            ${escapeHTML(formatMoneySafe(remainingAmount))}
                        </td>

                        <td>${formatDateSafe(inv.dueDate)}</td>

                        <td>${createStatusBadge(inv.status)}</td>

                        <td>
                            <button
                                type="button"
                                class="btn btn-sm btn-outline-primary"
                                data-invoice-id="${Number.isSafeInteger(invoiceId) && invoiceId > 0 ? invoiceId : ''}"
                                ${Number.isSafeInteger(invoiceId) && invoiceId > 0 ? '' : 'disabled'}>
                                <i class="fa-solid fa-file-lines me-1"></i>
                                Xem &amp; In
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');

        } catch (error) {
            console.error('Lỗi tải danh sách hóa đơn:', error);

            showTableMessage(
                error.message || 'Không thể tải danh sách hóa đơn.',
                'danger'
            );
        }
    }

    // Xem chi tiết hóa đơn.
    async function viewInvoiceDetail(invoiceId) {
        if (!Number.isSafeInteger(Number(invoiceId)) ||
            Number(invoiceId) <= 0) {
            alert('Mã hóa đơn không hợp lệ!');
            return;
        }

        try {
            const data = await apiRequest(
                `/api/invoices/${encodeURIComponent(invoiceId)}`
            );

            if (!data.success || !data.invoice) {
                alert('Không tìm thấy thông tin hóa đơn!');
                return;
            }

            const inv = data.invoice;

            function setText(id, value) {
                const element = document.getElementById(id);

                if (element) {
                    element.textContent = value ?? '-';
                }
            }

            setText('invDetailCode', inv.invoiceCode);
            setText('invDetailIssueDate', formatDateSafe(inv.issueDate));
            setText('invDetailDueDate', formatDateSafe(inv.dueDate));
            setText(
                'invDetailClientName',
                inv.Client?.companyName || '-'
            );
            setText('invDetailTaxCode', inv.Client?.taxCode || '-');
            setText('invDetailAddress', inv.Client?.address || '-');

            const candidateName =
                inv.Placement?.Candidate?.fullName || 'Ứng viên';

            const jobTitle =
                inv.Placement?.Job?.title || 'Chuyên viên';

            setText(
                'invDetailPlacementInfo',
                `${candidateName} - ${jobTitle}`
            );

            setText('invDetailSubtotal', formatMoneySafe(inv.subtotal));
            setText('invDetailSubtotalFoot', formatMoneySafe(inv.subtotal));
            setText('invDetailVat', formatMoneySafe(inv.vatAmount));
            setText('invDetailTotal', formatMoneySafe(inv.totalAmount));
            setText('invDetailPaid', formatMoneySafe(inv.paidAmount));

            const remainingAmount = inv.remainingAmount ??
                (Number(inv.totalAmount || 0) -
                    Number(inv.paidAmount || 0));

            setText(
                'invDetailRemaining',
                formatMoneySafe(remainingAmount)
            );

            const statusElement =
                document.getElementById('invDetailStatusBadge');

            if (statusElement) {
                statusElement.innerHTML = createStatusBadge(inv.status);
            }

            const modalElement =
                document.getElementById('modalInvoiceDetail');

            if (modalElement && window.bootstrap?.Modal) {
                window.bootstrap.Modal
                    .getOrCreateInstance(modalElement)
                    .show();
            } else {
                alert(
                    `Hóa đơn: ${inv.invoiceCode}\n` +
                    `Trạng thái: ${inv.status}\n` +
                    `Còn nợ: ${formatMoneySafe(remainingAmount)}`
                );
            }

        } catch (error) {
            console.error('Lỗi xem chi tiết hóa đơn:', error);
            alert(error.message || 'Không thể mở chi tiết hóa đơn!');
        }
    }

    // Xuất dữ liệu CSV, hỗ trợ tiếng Việt.
    async function exportInvoicesCSV() {
        try {
            const data = await apiRequest('/api/invoices');

            if (!Array.isArray(data.invoices)) {
                throw new Error('Dữ liệu API không đúng định dạng.');
            }

            const headers = [
                'Mã hóa đơn',
                'Khách hàng',
                'Tổng tiền',
                'Đã trả',
                'Còn nợ',
                'Hạn thanh toán',
                'Trạng thái'
            ];

            const rows = data.invoices.map(function (inv) {
                const remainingAmount = inv.remainingAmount ??
                    (Number(inv.totalAmount || 0) -
                        Number(inv.paidAmount || 0));

                return [
                    inv.invoiceCode || '',
                    inv.Client?.companyName || '',
                    inv.totalAmount ?? 0,
                    inv.paidAmount ?? 0,
                    remainingAmount,
                    inv.dueDate || '',
                    inv.status || ''
                ];
            });

            function csvEscape(value) {
                let text = String(value ?? '');

                // Ngăn Excel diễn giải dữ liệu văn bản thành công thức.
                if (/^[\s]*[=+\-@]/.test(text)) {
                    text = "'" + text;
                }

                return '"' + text.replace(/"/g, '""') + '"';
            }

            const csv = [
                headers,
                ...rows
            ].map(function (row) {
                return row.map(csvEscape).join(',');
            }).join('\r\n');

            const blob = new Blob(
                ['\uFEFF' + csv],
                { type: 'text/csv;charset=utf-8;' }
            );

            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');

            link.href = objectUrl;
            link.download = 'Danh_Sach_Hoa_Don.csv';

            document.body.appendChild(link);
            link.click();
            link.remove();

            URL.revokeObjectURL(objectUrl);

        } catch (error) {
            console.error('Lỗi xuất CSV:', error);
            alert(error.message || 'Lỗi xuất CSV!');
        }
    }

    // Gắn các hàm để HTML hiện tại tiếp tục sử dụng được.
    window.loadInvoices = loadInvoices;
    window.viewInvoiceDetail = viewInvoiceDetail;
    window.exportInvoicesCSV = exportInvoicesCSV;

    // Gắn sự kiện cho bộ lọc và nút xem chi tiết.
    document.addEventListener('DOMContentLoaded', function () {
        // Lọc hóa đơn theo trạng thái
        const statusFilter = document.getElementById('invoiceFilterStatus');

        if (statusFilter) {
            statusFilter.addEventListener('change', loadInvoices);
        }

        // Xem chi tiết hóa đơn
        const tbody = document.getElementById('invoicesTableBody');

        if (tbody) {
            tbody.addEventListener('click', function (event) {
                const button = event.target.closest('[data-invoice-id]');

                if (button && button.dataset.invoiceId) {
                    viewInvoiceDetail(Number(button.dataset.invoiceId));
                }
            });
        }

        // TASK-086: In trực tiếp và xuất PDF bằng hộp thoại in của trình duyệt.
        function printInvoice() {
            const invoiceSheet = document.getElementById('invoicePrintSheet');

            if (!invoiceSheet) {
                alert('Không tìm thấy nội dung hóa đơn để in!');
                return;
            }

            window.print();
        }

        const printButton = document.getElementById('btnPrintInvoice');
        const pdfButton = document.getElementById('btnExportInvoicePDF');

        if (printButton && printButton.dataset.printBound !== 'true') {
            printButton.addEventListener('click', printInvoice);
            printButton.dataset.printBound = 'true';
        }

        if (pdfButton && pdfButton.dataset.printBound !== 'true') {
            pdfButton.addEventListener('click', printInvoice);
            pdfButton.dataset.printBound = 'true';
        }

        // Tải danh sách hóa đơn khi mở trang
        loadInvoices();
    });

})();