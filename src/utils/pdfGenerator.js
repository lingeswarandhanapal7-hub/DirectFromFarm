import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generate and download a purchase bill PDF.
 * @param {object} params
 * @param {object} params.order
 * @param {object} params.buyer
 * @param {object} params.product
 * @param {number} params.quantity
 * @param {string} [params.qrDataUrl] - base64 PNG of UPI QR code (optional)
 */
export async function generateBill({ order, buyer, product, quantity, qrDataUrl }) {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();

    // ── Header ─────────────────────────────────────────────────────
    doc.setFillColor(26, 74, 46);
    doc.rect(0, 0, pageW, 48, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('DirectFromFarm', pageW / 2, 18, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Fresh from the farm, straight to your table', pageW / 2, 27, { align: 'center' });

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('PURCHASE BILL', pageW / 2, 40, { align: 'center' });

    // ── Bill info ──────────────────────────────────────────────────
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const billNo = `DFF-${String(order.id).slice(-6)}`;
    const date = new Date(order.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    const time = new Date(order.date).toLocaleTimeString('en-IN');

    doc.text(`Bill No: ${billNo}`, 14, 60);
    doc.text(`Date: ${date}`, 14, 67);
    doc.text(`Time: ${time}`, 14, 74);

    // ── Buyer info box ─────────────────────────────────────────────
    doc.setFillColor(240, 248, 240);
    doc.roundedRect(14, 82, 82, 48, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(26, 74, 46);
    doc.text('BUYER DETAILS', 20, 91);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    doc.text(`Name: ${buyer.name}`, 20, 99);
    doc.text(`Email: ${buyer.email}`, 20, 106);
    if (buyer.phone) doc.text(`Phone: ${buyer.phone}`, 20, 113);

    // ── Farmer info box (enhanced) ─────────────────────────────────
    doc.setFillColor(255, 248, 225);
    doc.roundedRect(104, 82, 92, 48, 3, 3, 'F');

    // "FARMER DETAILS" label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(180, 100, 0);
    doc.text('FARMER DETAILS', 110, 91);

    // Farmer name — bigger & bolder
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(120, 60, 0);
    doc.text(order.farmerName || '-', 110, 101);

    // Phone — highlighted with call icon
    if (order.farmerPhone) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(26, 74, 46);
        doc.text(`\u260E  ${order.farmerPhone}`, 110, 111);
    }

    // "Contact Farmer" CTA
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 60, 0);
    doc.text('Contact farmer to arrange delivery', 110, 120);

    // ── QR Code ────────────────────────────────────────────────────
    let tableStartY = 144;
    if (qrDataUrl) {
        try {
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(26, 74, 46);
            doc.text('Scan to Pay (UPI):', pageW - 56, 82);
            doc.addImage(qrDataUrl, 'PNG', pageW - 60, 85, 46, 46);
            tableStartY = 144;
        } catch (e) {
            console.warn('QR embed failed:', e.message);
        }
    }

    // ── Product table ──────────────────────────────────────────────
    autoTable(doc, {
        startY: tableStartY,
        head: [['#', 'Product', 'Category', 'Unit Price', 'Quantity', 'Total']],
        body: [[
            '1',
            order.productName,
            product.category || '-',
            `\u20B9${order.pricePerUnit}`,
            `${quantity} ${order.unit}`,
            `\u20B9${order.totalPrice}`
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

    // ── Total box ──────────────────────────────────────────────────
    doc.setFillColor(26, 74, 46);
    doc.roundedRect(pageW - 90, finalY, 76, 28, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('TOTAL AMOUNT', pageW - 52, finalY + 10, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(`\u20B9${order.totalPrice}`, pageW - 52, finalY + 22, { align: 'center' });

    // ── Footer ─────────────────────────────────────────────────────
    const footerY = finalY + 52;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, footerY, pageW - 14, footerY);
    doc.setTextColor(120, 120, 120);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.text('Thank you for supporting local farmers! | DirectFromFarm', pageW / 2, footerY + 8, { align: 'center' });
    doc.text('\u0BB5\u0BBF\u0BB5\u0B9A\u0BBE\u0BAF\u0BBF\u0B95\u0BB3\u0BC8 \u0B86\u0BA4\u0BB0\u0BBF\u0BA4\u0BA4\u0BAE\u0BC8\u0B95\u0BCD\u0B95\u0BC1 \u0BA8\u0BA9\u0BCD\u0BB1\u0BBF!', pageW / 2, footerY + 16, { align: 'center' });

    // Save
    doc.save(`DirectFromFarm_Bill_${billNo}.pdf`);
}
