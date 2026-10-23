/**
 * Module: Pareto Analysis & Quality Management
 * Đồ án Quản lý dự án CNTT - GODDY Recruit (Nhóm 10)
 */

let currentParetoMode = 'project'; // 'project' hoặc 'practice'
let paretoChartInstance = null;
let paretoApiData = null;

// Dữ liệu tĩnh dự phòng (Fallback nếu chưa kết nối API)
const FALLBACK_DATA = {
  project: {
    title: 'Pareto GODDY Recruit - Quản Lý Hóa Đơn & Công Nợ Tuyển Dụng B2B',
    total: 120,
    vitalCount: 3,
    vitalPercentage: 37.5,
    vitalCumRate: 81.7,
    table: [
      { code: 'L01', name: 'Lệch tính tiền thuế VAT 8% & làm tròn số tiền', count: 48, rate: 40.0, cumRate: 40.0, category: 'Vital Few (Ưu tiên P1)' },
      { code: 'L02', name: 'Lệch đồng bộ trạng thái công nợ khi trả dần (Paid/Partial)', count: 36, rate: 30.0, cumRate: 70.0, category: 'Vital Few (Ưu tiên P1)' },
      { code: 'L03', name: 'Tính sai ngày hết hạn bảo hành ứng viên 60 ngày', count: 14, rate: 11.7, cumRate: 81.7, category: 'Vital Few (Mốc 81.7%)' },
      { code: 'L04', name: 'Trùng mã số thuế hoặc thiếu thông tin liên hệ B2B', count: 8, rate: 6.7, cumRate: 88.3, category: 'Trivial Many' },
      { code: 'L05', name: 'Lỗi định dạng font UTF-8 tiếng Việt khi in hóa đơn VAT', count: 6, rate: 5.0, cumRate: 93.3, category: 'Trivial Many' },
      { code: 'L06', name: 'Báo cáo tuổi nợ Aging tải chậm khi nhiều hóa đơn', count: 4, rate: 3.3, cumRate: 96.7, category: 'Trivial Many' },
      { code: 'L07', name: 'Lỗi phân quyền xem hóa đơn của doanh nghiệp đối tác khác', count: 3, rate: 2.5, cumRate: 99.2, category: 'Trivial Many (Hotfix an ninh P1)' },
      { code: 'L08', name: 'Lệch định dạng cấu trúc cột khi xuất file CSV', count: 1, rate: 0.8, cumRate: 100.0, category: 'Trivial Many' }
    ]
  },
  practice: {
    title: 'Pareto Website Bán Máy Tính - Bài Thực Hành Cá Nhân',
    total: 100,
    vitalCount: 4,
    vitalPercentage: 50.0,
    vitalCumRate: 80.0,
    table: [
      { code: 'L02', name: 'Đặt hàng không thành công', count: 28, rate: 28.0, cumRate: 28.0, category: 'Vital Few (Ưu tiên tuần 5)' },
      { code: 'L06', name: 'Giỏ hàng tính sai tổng tiền', count: 22, rate: 22.0, cumRate: 50.0, category: 'Vital Few (Ưu tiên tuần 5)' },
      { code: 'L04', name: 'Tìm kiếm và lọc không chính xác', count: 16, rate: 16.0, cumRate: 66.0, category: 'Vital Few (Ưu tiên tuần 5)' },
      { code: 'L01', name: 'Cấu hình máy tính sai hoặc thiếu', count: 14, rate: 14.0, cumRate: 80.0, category: 'Vital Few (Mốc 80.0%)' },
      { code: 'L07', name: 'Hình ảnh sản phẩm bị lỗi', count: 8, rate: 8.0, cumRate: 88.0, category: 'Trivial Many' },
      { code: 'L03', name: 'Không gửi email xác nhận', count: 5, rate: 5.0, cumRate: 93.0, category: 'Trivial Many' },
      { code: 'L08', name: 'Trang sản phẩm tải chậm', count: 4, rate: 4.0, cumRate: 97.0, category: 'Trivial Many' },
      { code: 'L05', name: 'Xem được đơn hàng của người khác', count: 3, rate: 3.0, cumRate: 100.0, category: 'Trivial Many (Hotfix an ninh P1)' }
    ]
  }
};

document.addEventListener('DOMContentLoaded', () => {
  loadParetoData();
});

async function loadParetoData() {
  try {
    const res = await fetch('/api/dashboard/pareto');
    const data = await res.json();
    if (data.success && data.data) {
      paretoApiData = data.data;
    } else {
      paretoApiData = FALLBACK_DATA;
    }
  } catch (e) {
    console.warn('Dùng dữ liệu Pareto chuẩn bị sẵn (offline fallback)', e);
    paretoApiData = FALLBACK_DATA;
  }
  renderParetoView();
}

function reloadParetoData() {
  loadParetoData();
}

function setParetoMode(mode) {
  currentParetoMode = mode;

  const btnProject = document.getElementById('btnModeProject');
  const btnPractice = document.getElementById('btnModePractice');
  const sectionAnswers = document.getElementById('sectionAnswers');

  if (mode === 'project') {
    btnProject.className = 'btn btn-primary fw-semibold px-4';
    btnPractice.className = 'btn btn-outline-primary fw-semibold px-4';
    if (sectionAnswers) sectionAnswers.style.display = 'none';
  } else {
    btnProject.className = 'btn btn-outline-primary fw-semibold px-4';
    btnPractice.className = 'btn btn-primary fw-semibold px-4';
    if (sectionAnswers) sectionAnswers.style.display = 'block';
  }

  renderParetoView();
}

function renderParetoView() {
  const dataset = (paretoApiData && paretoApiData[currentParetoMode]) ? paretoApiData[currentParetoMode] : FALLBACK_DATA[currentParetoMode];

  // Update KPI Cards
  const kpiTotal = document.getElementById('kpiTotalErrors');
  if (kpiTotal) kpiTotal.textContent = `${dataset.total} Lỗi`;

  const kpiVital = document.getElementById('kpiVitalFewCount');
  if (kpiVital) kpiVital.textContent = `${dataset.vitalCount} Nhóm (${dataset.vitalPercentage}%)`;

  const kpiCum = document.getElementById('kpiVitalCumRate');
  if (kpiCum) kpiCum.textContent = `${dataset.vitalCumRate}%`;

  const kpiSec = document.getElementById('kpiSecurityNotice');
  if (kpiSec) {
    kpiSec.textContent = currentParetoMode === 'project' ? 'P1 (HĐ Đối tác B2B)' : 'P1 (IDOR Đơn hàng)';
  }

  // Update Table
  const tbody = document.getElementById('paretoTableBody');
  const tfoot = document.getElementById('paretoTableFoot');
  if (tbody) {
    tbody.innerHTML = '';
    dataset.table.forEach((row, idx) => {
      const isVital = idx < dataset.vitalCount;
      const isSecurityHotfix = row.code === 'L05' || row.code === 'L07';

      let badgeHtml = '';
      if (isSecurityHotfix) {
        badgeHtml = `<span class="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1"><i class="fa-solid fa-shield-halved me-1"></i>Hotfix An Ninh P1</span>`;
      } else if (isVital) {
        badgeHtml = `<span class="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1"><i class="fa-solid fa-fire me-1"></i>Vital Few (Ưu tiên)</span>`;
      } else {
        badgeHtml = `<span class="badge bg-light text-secondary border px-2 py-1">Trivial Many</span>`;
      }

      tbody.innerHTML += `
        <tr class="${isVital ? 'table-primary-subtle' : ''}">
          <td class="text-center fw-bold text-muted">${idx + 1}</td>
          <td class="text-center"><code>${row.code}</code></td>
          <td class="fw-semibold text-dark">${row.name}</td>
          <td class="text-end fw-bold text-primary">${row.count}</td>
          <td class="text-end text-dark">${row.rate.toFixed(1)}%</td>
          <td class="text-end fw-bold text-danger">${row.cumRate.toFixed(1)}%</td>
          <td class="text-center">${badgeHtml}</td>
        </tr>
      `;
    });
  }

  if (tfoot) {
    tfoot.innerHTML = `
      <tr>
        <td colspan="3" class="text-center fw-bold text-primary">TỔNG CỘNG</td>
        <td class="text-end fw-bold text-primary">${dataset.total}</td>
        <td class="text-end fw-bold text-primary">100.0%</td>
        <td class="text-end fw-bold text-danger">100.0%</td>
        <td class="text-center text-success"><i class="fa-solid fa-circle-check me-1"></i>Kiểm tra khớp chuẩn 100%</td>
      </tr>
    `;
  }

  // Update Chart Title
  const titleEl = document.getElementById('paretoChartTitle');
  if (titleEl) {
    titleEl.innerHTML = `<i class="fa-solid fa-chart-column text-primary me-2"></i>${dataset.title}`;
  }

  // Draw Chart.js Pareto Combination Chart
  renderChart(dataset);
}

function renderChart(dataset) {
  const canvas = document.getElementById('paretoCanvas');
  if (!canvas || typeof Chart === 'undefined') return;

  if (paretoChartInstance) {
    paretoChartInstance.destroy();
    paretoChartInstance = null;
  }

  const labels = dataset.table.map(r => `${r.code} - ${r.name}`);
  const counts = dataset.table.map(r => r.count);
  const cumRates = dataset.table.map(r => r.cumRate);
  const maxCount = Math.max(...counts);
  const y1Max = Math.ceil(maxCount * 1.25 / 5) * 5;

  const ctx = canvas.getContext('2d');
  paretoChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Count (Số lượng lỗi)',
          type: 'bar',
          data: counts,
          backgroundColor: '#0f2b5c',
          borderColor: '#081c3e',
          borderWidth: 1,
          borderRadius: 4,
          yAxisID: 'yLeft',
          order: 2
        },
        {
          label: 'Cumulative % (Tỷ lệ tích lũy)',
          type: 'line',
          data: cumRates,
          borderColor: '#d91414',
          backgroundColor: '#d91414',
          borderWidth: 2.5,
          pointStyle: 'rect',
          pointRadius: 6,
          pointHoverRadius: 8,
          fill: false,
          tension: 0.1,
          yAxisID: 'yRight',
          order: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            boxWidth: 14,
            font: { family: 'Inter', weight: 600 }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              if (context.dataset.type === 'line') {
                return ` Lũy kế: ${context.parsed.y.toFixed(1)}%`;
              }
              return ` Số lượng lỗi: ${context.parsed.y}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { family: 'Inter', size: 10.5 },
            callback: function(val, index) {
              const label = this.getLabelForValue(val);
              return label.length > 25 ? label.substr(0, 25) + '...' : label;
            }
          }
        },
        yLeft: {
          type: 'linear',
          position: 'left',
          min: 0,
          max: y1Max,
          title: {
            display: true,
            text: 'Count of Errors (Số lượng lỗi)',
            font: { family: 'Inter', weight: 'bold', size: 11 },
            color: '#0f2b5c'
          },
          grid: { color: '#f1f5f9' }
        },
        yRight: {
          type: 'linear',
          position: 'right',
          min: 0,
          max: 100,
          title: {
            display: true,
            text: 'Cumulative % (Tỷ lệ tích lũy)',
            font: { family: 'Inter', weight: 'bold', size: 11 },
            color: '#d91414'
          },
          grid: {
            drawOnChartArea: false
          },
          ticks: {
            callback: v => v + '%'
          }
        }
      }
    }
  });
}

function viewSlideImage() {
  const imgModal = document.getElementById('slideModalImage');
  const btnDownload = document.getElementById('btnDownloadImage');
  const imgSrc = currentParetoMode === 'project' 
    ? '/images/pareto_du_an_goddy.png' 
    : '/images/pareto_baitap_canhan.png';

  if (imgModal) imgModal.src = imgSrc;
  if (btnDownload) {
    btnDownload.href = imgSrc;
    btnDownload.download = currentParetoMode === 'project' 
      ? 'Pareto_Diagram_GODDY_Recruit.png' 
      : 'Pareto_Diagram_Website_Canhan.png';
  }

  const modalEl = document.getElementById('modalSlideView');
  if (modalEl) {
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }
}
