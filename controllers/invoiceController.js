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

// Lấy thông tin chi tiết hóa đơn theo ID
exports.getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findByPk(id, {
      include: [
        { model: Client },
        {
          model: Placement,
          include: [Candidate, Job]
        },
        { model: Payment }
      ]
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hóa đơn!' });
    }

    res.json({ success: true, invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Phát hành hóa đơn từ Deal tuyển dụng (Chặn trùng và tự động sinh mã INV-YYYY-XXXX)
exports.createInvoiceFromPlacement = async (req, res) => {
  try {
    const { placementId, vatRate = 8 } = req.body;
    if (!placementId) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp placementId!' });
    }

    const placement = await Placement.findByPk(placementId, {
      include: [Client]
    });
    if (!placement) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin deal tuyển dụng!' });
    }

    // 1. Kiểm tra xem deal này đã được xuất hóa đơn chưa (nếu hóa đơn chưa bị Hủy)
    const existingInvoice = await Invoice.findOne({
      where: {
        placementId,
        status: { [Op.ne]: 'Cancelled' }
      }
    });

    if (existingInvoice) {
      return res.status(400).json({
        success: false,
        message: `Deal tuyển dụng này đã được phát hành hóa đơn mã: ${existingInvoice.invoiceCode}!`,
        existingInvoiceCode: existingInvoice.invoiceCode
      });
    }

    // 2. Tính toán và phát hành hóa đơn
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

    const invoice = await Invoice.create({
      invoiceCode,
      clientId: placement.clientId,
      placementId: placement.id,
      subtotal,
      vatRate: vat,
      vatAmount,
      totalAmount,
      paidAmount: 0,
      remainingAmount: totalAmount,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      status: 'Sent'
    });

    await AuditLog.create({
      userId: req.user ? req.user.id : null,
      action: 'CREATE_INVOICE',
      module: 'INVOICES',
      details: `Phát hành hóa đơn mới ${invoiceCode} cho Deal ID ${placementId}`
    });

    res.status(201).json({
      success: true,
      message: 'Phát hành hóa đơn thành công!',
      invoice
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Hủy hóa đơn
exports.cancelInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findByPk(id);

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hóa đơn!' });
    }

    invoice.status = 'Cancelled';
    await invoice.save();

    await AuditLog.create({
      userId: req.user ? req.user.id : null,
      action: 'CANCEL_INVOICE',
      module: 'INVOICES',
      details: `Hủy hóa đơn mã: ${invoice.invoiceCode}`
    });

    res.json({
      success: true,
      message: 'Đã hủy hóa đơn thành công!',
      invoice
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
