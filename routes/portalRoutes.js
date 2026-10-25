const express = require('express');
const router = express.Router();

const { User, Client, Job, Placement, Candidate, Invoice, Payment } = require('../models');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

router.get('/me', verifyToken, requireRole('client'), async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: ['id', 'role', 'clientId', 'isActive']
        });

        if (!user || !user.isActive || user.role !== 'client' || !user.clientId) {
            return res.status(403).json({
                success: false,
                message: 'Tài khoản không có quyền truy cập cổng khách hàng.'
            });
        }

        const client = await Client.findByPk(user.clientId, {
            attributes: [
                'id',
                'companyName',
                'taxCode',
                'address',
                'contactPerson',
                'contactEmail',
                'contactPhone',
                'paymentTermDays',
                'status'
            ],
            include: [
                {
                    model: Job,
                    attributes: ['id', 'title', 'department', 'status']
                },
                {
                    model: Placement,
                    attributes: ['id', 'status', 'onboardDate', 'warrantyEndDate'],
                    include: [
                        {
                            model: Job,
                            attributes: ['id', 'title']
                        }
                    ]
                },
                {
                    model: Invoice,
                    attributes: [
                        'id',
                        'invoiceCode',
                        'totalAmount',
                        'paidAmount',
                        'remainingAmount',
                        'issueDate',
                        'dueDate',
                        'status'
                    ]
                }
            ]
        });

        if (!client || client.status !== 'Active') {
            return res.status(403).json({
                success: false,
                message: 'Doanh nghiệp không tồn tại hoặc không còn hoạt động.'
            });
        }

        const invoices = client.Invoices || [];
        const jobs = client.Jobs || [];
        const placements = client.Placements || [];

        const totalInvoiced = invoices.reduce(
            (sum, invoice) => sum + Number(invoice.totalAmount || 0),
            0
        );

        const totalPaid = invoices.reduce(
            (sum, invoice) => sum + Number(invoice.paidAmount || 0),
            0
        );

        const totalRemaining = invoices.reduce(
            (sum, invoice) => sum + Number(invoice.remainingAmount || 0),
            0
        );

        const today = new Date().toISOString().slice(0, 10);

        const overdueCount = invoices.filter(invoice =>
            invoice.dueDate &&
            invoice.dueDate < today &&
            Number(invoice.remainingAmount) > 0
        ).length;

        return res.json({
            success: true,
            client: {
                id: client.id,
                companyName: client.companyName,
                taxCode: client.taxCode,
                address: client.address,
                contactPerson: client.contactPerson,
                contactEmail: client.contactEmail,
                contactPhone: client.contactPhone,
                paymentTermDays: client.paymentTermDays,
                status: client.status
            },
            summary: {
                totalInvoiced,
                totalPaid,
                totalRemaining,
                overdueCount,
                totalJobs: jobs.length,
                activeJobs: jobs.filter(job => job.status === 'Opening').length,
                totalPlacements: placements.length,
                warrantyActive: placements.filter(
                    placement => placement.status === 'UnderWarranty'
                ).length
            },
            invoices,
            jobs,
            placements
        });
    } catch (err) {
        console.error('[Portal] Lỗi lấy dữ liệu:', err);
        return res.status(500).json({
            success: false,
            message: 'Không thể tải dữ liệu cổng khách hàng.'
        });
    }
});

module.exports = router;