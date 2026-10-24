const { Invoice, Client, Placement, Candidate, Job, Payment, AuditLog } = require('../models');
const { Op } = require('sequelize');

// Lấy danh sách hóa đơn (có lọc theo trạng thái và tìm kiếm)
exports.getInvoices = async (req, res) => {
  try {
    const { status, search } = req.query;
    const where = {};

    if (status && status !== 'All') {
      where.status = status;
    }

    if (search) {
      where.invoiceCode = { [Op.like]: `%${search}%` };
    }

    const invoices = await Invoice.findAll({
      where,
      include: [
        { model: Client, attributes: ['id', 'companyName', 'taxCode', 'address', 'contactPerson', 'paymentTermDays'] },
        {
          model: Placement,
          include: [
            { model: Candidate, attributes: ['id', 'fullName', 'email'] },
            { model: Job, attributes: ['id', 'title'] }
          ]
        },
        { model: Payment }
      ],
      order: [['id', 'DESC']]
    });

    res.json({ success: true, invoices });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
// Kiểm tra xem deal này đã được xuất hóa đơn chưa
        const existingInvoice = await Invoice.findOne({ where: { placementId, status: { [Op.ne]: 'Cancelled' } } });
        if (existingInvoice) {
            return res.status(400).json({
                success: false,
                message: `Deal tuyển dụng này đã được phát hành hóa đơn mã: ${existingInvoice.invoiceCode}!`
            });
        }

        const currentYear = new Date().getFullYear();
        const count = await Invoice.count();
        const invoiceCode = `INV-${currentYear}-${String(count + 1).padStart(4, '0')}`;

        const subtotal = parseFloat(placement.serviceFee);
        const parsedVatRate = vatRate === undefined || vatRate === null || vatRate === ''
            ? 8
            : Number(vatRate);
        if (!Number.isFinite(parsedVatRate) || parsedVatRate < 0 || parsedVatRate > 100) {
            return res.status(400).json({
                success: false,
                message: 'VAT phải là số từ 0 đến 100.'
            });
        }
        const vat = parsedVatRate;
        const vatAmount = subtotal * (vat / 100);
        const totalAmount = subtotal + vatAmount;

