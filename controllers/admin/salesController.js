const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");
const moment = require('moment');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

const loadSalesReport = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        // Destructure with default empty strings
        const { 
            startDate = '', 
            endDate = '', 
            dateRange = '' 
        } = req.query;

        let filter = {};

        if (startDate && endDate) {
            filter.createdAt = {
                $gte: moment(startDate).startOf('day').toDate(),
                $lte: moment(endDate).endOf('day').toDate()
            };
        } 
        else if (dateRange) {
            const today = moment();

            switch (dateRange) {
                case 'today':
                    filter.createdAt = {
                        $gte: today.startOf('day').toDate(),
                        $lte: today.endOf('day').toDate()
                    };
                    break;
                case 'week':
                    filter.createdAt = {
                        $gte: today.startOf('week').toDate(),
                        $lte: today.endOf('week').toDate()
                    };
                    break;
                case 'month':
                    filter.createdAt = {
                        $gte: today.startOf('month').toDate(),
                        $lte: today.endOf('month').toDate()
                    };
                    break;
                case 'year':
                    filter.createdAt = {
                        $gte: today.startOf('year').toDate(),
                        $lte: today.endOf('year').toDate()
                    };
                    break;
            }
        }

        const totalOrders = await Order.countDocuments(filter);
        const totalPages = Math.ceil(totalOrders / limit);

        const orderData = await Order.find(filter)
            .populate("user")
            .populate("items.productId")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalDiscount = await Order.aggregate([
            { $match: filter },
            { $group: { _id: null, totalDiscount: { $sum: "$discount" } } }
        ]);
        const totalDiscountValue = totalDiscount.length > 0 ? totalDiscount[0].totalDiscount : 0;
        const roundedDiscount = Math.round(totalDiscountValue);

        const uniqueUserIds = await Order.distinct("user", filter);
        const uniqueUsersCount = uniqueUserIds.length;

        const totalSales = await Order.aggregate([
            { $match: filter },
            { $group: { _id: null, totalSales: { $sum: "$finalAmount" } } }
        ]);
        const totalSalesValue = totalSales.length > 0 ? totalSales[0].totalSales : 0;
        const roundedSales = Math.round(totalSalesValue);

        res.render("salesReports", {
            orders: orderData,
            count: totalOrders,
            totalPages: totalPages,
            currentPage: page,
            totalDiscount: roundedDiscount,
            totalUsers: uniqueUsersCount,
            totalSales: roundedSales,
            startDate: startDate || '',
            endDate: endDate || '',
            dateRange: dateRange || ''
        });

    } catch (error) {
        console.error("Error loading sales report:", error);
        res.status(500).render("admin/pageerror", { error: error.message });
    }
};

const exportSalesToPDF = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('user')
            .populate('items.productId')
            .sort({ createdAt: -1 });

        const doc = new PDFDocument({ margin: 30, size: 'A3' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=sales-report.pdf');
        doc.pipe(res);

        doc.fontSize(16).font('Helvetica-Bold')
            .text('Sales Report', { align: 'center' });
        doc.fontSize(10).font('Helvetica')
            .text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });

        doc.moveDown(2);

        doc.fontSize(10).font('Helvetica-Bold');
        const headers = ["Sl No", "User Name", "Email", "Products", "Quantity", "Order Date", "Total Price", "Discount", "Final Amount", "Payment Status"];
        const headerWidths = [30, 80, 100, 150, 60, 80, 70, 60, 80, 80];
        let currentY = doc.y;
        headers.forEach((header, index) => {
            doc.text(header, 30 + headerWidths.slice(0, index).reduce((a, b) => a + b, 0), currentY, { width: headerWidths[index], align: 'center' });
        });
        doc.moveDown();

        doc.font('Helvetica');

        let slNo = 1;
        let yPosition = doc.y;

        orders.forEach((order, index) => {
            const user = order.user;
            const products = order.items.map(item => item.productId.name).join(', ');
            const row = [
                slNo,
                user ? user.username : 'N/A',
                user ? user.email : 'N/A',
                order.items.map(item => item.productId ? item.productId.productName : 'Unknown').join(', '),
                order.items.length,
                new Date(order.createdAt).toLocaleDateString(),
                `RS ${order.totalPrice.toLocaleString()}`,
                `RS ${(order.totalPrice - order.finalAmount).toLocaleString()}`,
                `RS ${order.finalAmount.toLocaleString()}`,
                order.paymentStatus || 'N/A'
            ];

           
            row.forEach((cell, i) => {
                doc.text(cell, 30 + headerWidths.slice(0, i).reduce((a, b) => a + b, 0), yPosition, { width: headerWidths[i], align: 'center' });
            });

            yPosition += 20;
           
            if (yPosition > doc.page.height - 50) {
                doc.addPage();
                yPosition = 50;
            }

            slNo++;
        });

       
        if (yPosition > doc.page.height - 100) doc.addPage();

        const totalSales = orders.reduce((sum, order) => sum + order.finalAmount, 0);
        const totalDiscount = orders.reduce((sum, order) => sum + (order.totalPrice - order.finalAmount), 0);
        const totalOrders = orders.length;

        doc.moveDown(2);
        doc.fontSize(14).font('Helvetica-Bold')
            .text('Sales Report Summary', { align: 'center' });
        doc.fontSize(10).font('Helvetica')
            .text(`Total Orders: ${totalOrders}`, 50, doc.y + 20)
            .text(`Total Sales: RS ${Math.round(totalSales).toLocaleString()}`, 50, doc.y + 40)
            .text(`Total Discount: RS ${Math.round(totalDiscount).toLocaleString()}`, 50, doc.y + 60);

        const totalPages = doc.bufferedPageRange().count;
        for (let i = 0; i < totalPages; i++) {
            doc.switchToPage(i);
            doc.fontSize(9).text(
                `Page ${i + 1} of ${totalPages}`,
                doc.page.width - 100,
                doc.page.height - 30,
                { align: 'right' }
            );
        }

        doc.end();

    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ error: 'Failed to generate PDF', details: error.message });
    }
};


const exportSalesToExcel = async (req, res) => {
    try {
       
        const orders = await Order.find()
            .populate("user")
            .populate("items.productId")
            .sort({ createdAt: -1 });

        
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

      
        worksheet.columns = [
            { header: 'Sl No', key: 'slNo', width: 10 },
            { header: 'User Name', key: 'userName', width: 20 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Products', key: 'products', width: 40 },
            { header: 'Quantity', key: 'quantity', width: 15 },
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Total Price', key: 'totalPrice', width: 15 },
            { header: 'Discount', key: 'discount', width: 15 },
            { header: 'Final Amount', key: 'finalAmount', width: 15 },
            { header: 'Payment Method', key: 'paymentMethod', width: 20 },
            { header: 'Status', key: 'status', width: 15 }
        ];

        
        orders.forEach((order, index) => {
            worksheet.addRow({
                slNo: index + 1,
                userName: order.user.username,
                email: order.user.email,
                products: order.items.map(item => item.productId ? item.productId.productName : 'Unknown').join(', '),
                quantity: order.items.map(item => item.quantity).join(', '),
                date: order.createdAt.toLocaleDateString(),
                totalPrice: order.totalPrice,
                discount: Math.floor(order.totalPrice - order.finalAmount),
                finalAmount: order.finalAmount,
                paymentMethod: order.paymentMethod,
                status: order.status
            });
        });

        
        worksheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFB8CCE4' } 
            };
        });

        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=sales-report.xlsx');

        
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error("Error exporting sales to Excel:", error);
        res.status(500).send("Error generating Excel file");
    }
};

module.exports = {
    loadSalesReport,
    exportSalesToPDF,
    exportSalesToExcel
};