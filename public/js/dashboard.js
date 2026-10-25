/**
 * Module: Dashboard & Thống Kê KPI
 */
async function loadDashboard() {
  try {
    const periodSelect = document.getElementById('dashboardPeriodSelect');
    const period = periodSelect ? periodSelect.value : 'all';
    const res = await fetch(`/api/dashboard/stats?period=${period}`);
    const data = await res.json();
    if (data.success) {
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
      updateDebtProgress('collectionProgressBar', 'collectionProgressTrack', data.stats.collectionRate);
      const vBadDebt = document.getElementById('valBadDebtRate');
      if (vBadDebt) vBadDebt.textContent = data.stats.badDebtRate + '%';
      updateDebtProgress('badDebtProgressBar', 'badDebtProgressTrack', data.stats.badDebtRate);

      if (data.chartData) {
        initCharts(data.chartData);
      }

      // Render Top 5 Debtors
      const tbody = document.getElementById('topDebtorsTableBody');
      if (tbody) {
        tbody.innerHTML = '';
        if (data.topDebtors && data.topDebtors.length > 0) {
          data.topDebtors.forEach(td => {
            tbody.innerHTML += `
              <tr>
                <td><strong>${td.companyName}</strong></td>
                <td><code>${td.taxCode}</code></td>
                <td><span class="badge bg-secondary">${td.invoiceCount} hóa đơn</span></td>
                <td class="text-danger fw-bold">${formatMoney(td.totalRemaining)}</td>
                <td>
                  <button class="btn btn-sm btn-outline-primary" onclick="switchTab('debt')">
                    <i class="fa-solid fa-eye me-1"></i>Xem Chi Tiết
                  </button>
                </td>
              </tr>
            `;
          });
        } else {
          tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">Hiện không có công nợ tồn đọng!</td></tr>';
        }
      }
    }
  } catch (err) {
    console.error('Lỗi tải Dashboard:', err);
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
                'Doanh thu: ' + formatRevenue(context.parsed.y) + ' triệu VNĐ'
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
  const canvasInd = document.getElementById('industryChart');
  if (canvasInd && typeof Chart !== 'undefined') {
    const ctxInd = canvasInd.getContext('2d');
    industryChartInstance = new Chart(ctxInd, {
      type: 'doughnut',
      data: {
        labels: chartData.industryShare.labels,
        datasets: [{
          data: chartData.industryShare.series,
          backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#ec4899', '#64748b'],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 14 } } }
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

    if (bar) bar.style.width = percent + '%';
    if (track) track.setAttribute('aria-valuenow', String(percent));
}