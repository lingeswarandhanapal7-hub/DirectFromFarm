import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export async function generateBill({ order, buyer, product, quantity }) {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();

    // Header background
    doc.setFillColor(26, 74, 46);
    doc.rect(0, 0, pageW, 45, 'F');

    // Logo / Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('DirectFromFarm', pageW / 2, 18, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Fresh from the farm, straight to your table', pageW / 2, 27, { align: 'center' });

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('PURCHASE BILL', pageW / 2, 38, { align: 'center' });

    // Bill info
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const billNo = `DFF-${order.id.toString().slice(-6)}`;
    const date = new Date(order.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    const time = new Date(order.date).toLocaleTimeString('en-IN');

    doc.text(`Bill No: ${billNo}`, 14, 58);
    doc.text(`Date: ${date}`, 14, 65);
    doc.text(`Time: ${time}`, 14, 72);

    // Buyer info box
    doc.setFillColor(240, 248, 240);
    doc.roundedRect(14, 80, 85, 40, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(26, 74, 46);
    doc.text('BUYER DETAILS', 20, 89);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    doc.text(`Name: ${buyer.name}`, 20, 97);
    doc.text(`Email: ${buyer.email}`, 20, 104);
    if (buyer.phone) doc.text(`Phone: ${buyer.phone}`, 20, 111);

    // Farmer info box
    doc.setFillColor(255, 248, 230);
    doc.roundedRect(110, 80, 85, 40, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(180, 100, 0);
    doc.text('FARMER DETAILS', 116, 89);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    doc.text(`Name: ${order.farmerName}`, 116, 97);
    if (order.farmerPhone) doc.text(`Phone: ${order.farmerPhone}`, 116, 104);

    // Product table
    autoTable(doc, {
        startY: 130,
        head: [['#', 'Product', 'Category', 'Unit Price', 'Quantity', 'Total']],
        body: [[
            '1',
            order.productName,
            product.category || '-',
            `₹${order.pricePerUnit}`,
            `${quantity} ${order.unit}`,
            `₹${order.totalPrice}`
        ]],
        headStyles: {
            fillColor: [26, 74, 46],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 10,
        },
        bodyStyles: { fontSize: 10, textColor: [50, 50, 50] },
        alternateRowStyles: { fillColor: [245, 252, 245] },
        columnStyles: {
            0: { cellWidth: 10 },
            3: { halign: 'right' },
            5: { halign: 'right', fontStyle: 'bold' },
        },
        margin: { left: 14, right: 14 },
    });

    const finalY = doc.lastAutoTable.finalY + 10;

    // Total box
    doc.setFillColor(26, 74, 46);
    doc.roundedRect(pageW - 90, finalY, 76, 28, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('TOTAL AMOUNT', pageW - 52, finalY + 10, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(`₹${order.totalPrice}`, pageW - 52, finalY + 22, { align: 'center' });

    // Footer
    const footerY = finalY + 50;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, footerY, pageW - 14, footerY);
    doc.setTextColor(120, 120, 120);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.text('Thank you for supporting local farmers! | DirectFromFarm', pageW / 2, footerY + 8, { align: 'center' });
    doc.text('விவசாயிகளை ஆதரித்தமைக்கு நன்றி!', pageW / 2, footerY + 16, { align: 'center' });

    // Save
    doc.save(`DirectFromFarm_Bill_${billNo}.pdf`);
}
