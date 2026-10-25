
/**
 * Module: Dashboard & Thống Kê KPI
 * TASK-151: Refresh Dashboard with smooth loading animation
 */

let dashboardRefreshPromise = null;

async function loadDashboard() {
  // Avoid duplicate requests when the user clicks repeatedly.
  if (dashboardRefreshPromise) {
    return dashboardRefreshPromise;
  }

  const refreshButton = document.getElementById('dashboardRefreshBtn');
  const refreshIcon = document.getElementById('dashboardRefreshIcon');
  const refreshText = document.getElementById('dashboardRefreshText');

  const startedAt = Date.now();

  if (refreshButton) {
    refreshButton.disabled = true;
    refreshButton.setAttribute('aria-busy', 'true');
  }

  if (refreshIcon) {
    refreshIcon.classList.add('fa-spin');
  }

  if (refreshText) {
    refreshText.textContent = 'Đang làm mới...';
  }

  dashboardRefreshPromise = (async () => {
    try {
      const periodSelect = document.getElementById('dashboardPeriodSelect');
      const period = periodSelect ? periodSelect.value : 'all';

      const res = await fetch(
        `/api/dashboard/stats?period=${encodeURIComponent(period)}`,
        { cache: 'no-store' }
      );

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || 'Không thể tải Dashboard.');
      }

      const vRevenue = document.getElementById('valTotalRevenue');
      if (vRevenue) vRevenue.textContent = formatMoney(data.stats.totalRevenue);

      const vAR = document.getElementById('valTotalAR');
      if (vAR) vAR.textContent = formatMoney(data.stats.totalAR);

      const vOverdue = document.getElementById('valOverdueAR');
      if (vOverdue) vOverdue.textContent = formatMoney(data.stats.overdueAR);

      const vPlacement = document.getElementById('valPlacementCount');
      if (vPlacement) vPlacement.textContent = data.stats.placementCount + ' Deals';

      const vColRate = document.getElementById('valCollectionRate');
      if (vColRate) vColRate.textContent = data.stats.collectionRate + '%';

      updateDebtProgress(
        'collectionProgressBar',
        'collectionProgressTrack',
        data.stats.collectionRate
      );

      const vBadDebt = document.getElementById('valBadDebtRate');
      if (vBadDebt) vBadDebt.textContent = data.stats.badDebtRate + '%';

      updateDebtProgress(
        'badDebtProgressBar',
        'badDebtProgressTrack',
        data.stats.badDebtRate
      );

      if (data.chartData) {
        initCharts(data.chartData);
      }

      // TASK-150: Top 5 debtors
      const tbody = document.getElementById('topDebtorsTableBody');

      if (tbody) {
        tbody.replaceChildren();

        const debtors = Array.isArray(data.topDebtors)
          ? [...data.topDebtors]
              .sort((a, b) =>
                (Number(b.totalRemaining) || 0) -
                (Number(a.totalRemaining) || 0)
              )
              .slice(0, 5)
          : [];

        if (debtors.length === 0) {
          const row = tbody.insertRow();
          const cell = row.insertCell();

          cell.colSpan = 5;
          cell.className = 'text-center text-muted py-3';
          cell.textContent = 'Hiện không có công nợ tồn đọng!';
        }

        debtors.forEach((td, index) => {
          const row = tbody.insertRow();

          const name = String(td.companyName || '-');
          const taxCode = String(td.taxCode || '');
          const invoiceCount = Number(td.invoiceCount) || 0;
          const amount = Number(td.totalRemaining) || 0;

          const nameCell = row.insertCell();
          const strong = document.createElement('strong');
          strong.textContent = `${index + 1}. ${name}`;
          nameCell.appendChild(strong);

          const taxCell = row.insertCell();
          const code = document.createElement('code');
          code.textContent = taxCode || '-';
          taxCell.appendChild(code);

          const countCell = row.insertCell();
          const badge = document.createElement('span');
          badge.className = 'badge bg-secondary';
          badge.textContent = `${invoiceCount} hóa đơn`;
          countCell.appendChild(badge);

          const amountCell = row.insertCell();
          amountCell.className = 'text-danger fw-bold';
          amountCell.textContent = formatMoney(amount);

          const actionCell = row.insertCell();
          const button = document.createElement('button');

          button.type = 'button';
          button.className = 'btn btn-sm btn-outline-primary';
          button.setAttribute('aria-label', `Xem công nợ của ${name}`);

          const icon = document.createElement('i');
          icon.className = 'fa-solid fa-eye me-1';

          button.appendChild(icon);
          button.appendChild(document.createTextNode('Xem chi tiết'));

          button.addEventListener('click', () => {
            openTopDebtorDetails(name, taxCode);
          });

          actionCell.appendChild(button);
        });
      }

      return data;
    } catch (err) {
      console.error('Lỗi tải Dashboard:', err);
      throw err;
    } finally {
      // Keep the loading animation visible for at least 500ms.
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, 500 - elapsed);

      if (remaining > 0) {
        await new Promise(resolve => setTimeout(resolve, remaining));
      }

      if (refreshIcon) {
        refreshIcon.classList.remove('fa-spin');
      }

      if (refreshButton) {
        refreshButton.disabled = false;
        refreshButton.removeAttribute('aria-busy');
      }

      if (refreshText) {
        refreshText.textContent = 'Làm mới dữ liệu';
      }
    }
  })();

  try {
    return await dashboardRefreshPromise;
  } finally {
    dashboardRefreshPromise = null;
  }
}

/**
 * TASK-151: Manual refresh action.
 */
async function refreshDashboardData() {
  try {
    await loadDashboard();

    if (typeof showDebtToast === 'function') {
      showDebtToast('Đã làm mới dữ liệu Dashboard!', 'success');
    }
  } catch (err) {
    if (typeof showDebtToast === 'function') {
      showDebtToast('Không thể làm mới dữ liệu Dashboard.', 'danger');
    } else {
      alert('Không thể làm mới dữ liệu Dashboard.');
    }
  }
}

/**
 * TASK-150: Open debt details for selected company.
 */
function openTopDebtorDetails(companyName, taxCode) {
  if (typeof switchTab !== 'function') return;

  switchTab('debt');

  const section = document.getElementById('section-debt');

  if (!section || section.style.display === 'none') {
    return;
  }

  window.task150DebtorFilter = {
    companyName: String(companyName || ''),
    taxCode: String(taxCode || '')
  };

  if (typeof loadDebt === 'function') {
    loadDebt();
  }
}

function initCharts(chartData) {
  if (revenueChartInstance) {
    revenueChartInstance.destroy();
    revenueChartInstance = null;
  }

  if (industryChartInstance) {
    industryChartInstance.destroy();
    industryChartInstance = null;
  }

  // TASK-148: Smooth 12-month revenue chart
  const canvasRev = document.getElementById('revenueChart');

  if (canvasRev && typeof Chart !== 'undefined') {
    const ctxRev = canvasRev.getContext('2d');

    const gradient = ctxRev.createLinearGradient(0, 0, 0, 350);
    gradient.addColorStop(0, 'rgba(79, 70, 229, 0.30)');
    gradient.addColorStop(1, 'rgba(79, 70, 229, 0.01)');

    const revenueValues = Array.isArray(chartData.revenueByMonth)
      ? chartData.revenueByMonth
      : [];

    const revenueLabels = Array.isArray(chartData.labels)
      ? chartData.labels
      : [];

    const formatRevenue = value =>
      new Intl.NumberFormat('vi-VN', {
        maximumFractionDigits: 2
      }).format(Number(value) || 0);

    revenueChartInstance = new Chart(ctxRev, {
      type: 'line',
      data: {
        labels: revenueLabels,
        datasets: [{
          label: 'Doanh thu thực tế (triệu VNĐ)',
          data: revenueValues,
          borderColor: '#4f46e5',
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          borderWidth: 3,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#4f46e5',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 7,
          pointHoverBackgroundColor: '#4f46e5',
          pointHoverBorderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        interaction: {
          mode: 'index',
          intersect: false
        },
        animation: {
          duration: 1200,
          easing: 'easeOutQuart'
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: '#1e293b',
            padding: 12,
            cornerRadius: 10,
            displayColors: false,
            callbacks: {
              label: context =>
                'Doanh thu: ' +
                formatRevenue(context.parsed.y) +
                ' triệu VNĐ'
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: '#f1f5f9'
            },
            ticks: {
              callback: value => formatRevenue(value) + ' tr'
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      }
    });
  }

  // TASK-149: Partner industry composition doughnut chart
  const canvasInd = document.getElementById('industryChart');

  if (canvasInd && typeof Chart !== 'undefined') {
    const ctxInd = canvasInd.getContext('2d');
    const industryShare = chartData.industryShare || {};

    const labels = Array.isArray(industryShare.labels)
      ? industryShare.labels
      : [];

    const values = Array.isArray(industryShare.series)
      ? industryShare.series.map(value => {
          const number = Number(value);
          return Number.isFinite(number) && number > 0 ? number : 0;
        })
      : [];

    const colors = [
      '#4f46e5',
      '#10b981',
      '#f59e0b',
      '#ec4899',
      '#64748b',
      '#06b6d4',
      '#8b5cf6',
      '#f97316'
    ];

    const totalPartners = values.reduce(
      (sum, value) => sum + value,
      0
    );

    industryChartInstance = new Chart(ctxInd, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          label: 'Đối tác',
          data: values,
          backgroundColor: labels.map(
            (_, index) => colors[index % colors.length]
          ),
          borderColor: '#ffffff',
          borderWidth: 3,
          hoverBorderWidth: 4,
          hoverOffset: 10,
          spacing: 2,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '68%',
        animation: {
          animateRotate: true,
          animateScale: true,
          duration: 1100,
          easing: 'easeOutQuart'
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              boxHeight: 12,
              padding: 16,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: '#1e293b',
            padding: 12,
            cornerRadius: 10,
            callbacks: {
              label: context => {
                const value = Number(context.parsed) || 0;

                const percent = totalPartners > 0
                  ? (value / totalPartners * 100).toFixed(1)
                  : '0.0';

                return ' ' + context.label + ': ' +
                  new Intl.NumberFormat('vi-VN').format(value) +
                  ' đối tác (' +
                  percent.replace('.', ',') +
                  '%)';
              }
            }
          }
        }
      }
    });
  }
}

// TASK-147: Update debt ratio progress bar
function updateDebtProgress(barId, trackId, value) {
  const number = Number(value);

  const percent = Number.isFinite(number)
    ? Math.max(0, Math.min(100, number))
    : 0;

  const bar = document.getElementById(barId);
  const track = document.getElementById(trackId);

  if (bar) {
    bar.style.width = percent + '%';
  }

  if (track) {
    track.setAttribute('aria-valuenow', String(percent));
  }
}
