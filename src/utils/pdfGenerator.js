import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Dictionary for common Tamil crops and agricultural terms
const TAMIL_TRANSLATIONS = {
    // Vegetables
    'தக்காளி': 'Tomato (Thakkaali)',
    'வெங்காயம்': 'Onion (Vengaayam)',
    'உருளைக்கிழங்கு': 'Potato (Urulaikilangu)',
    'கத்தரிக்காய்': 'Brinjal (Katharikaai)',
    'வெண்டைக்காய்': 'Okra / Ladies Finger (Vendaikaai)',
    'மிளகாய்': 'Chilli (Milagaai)',
    'முருங்கைக்காய்': 'Drumstick (Murungaikaai)',
    'கேரட்': 'Carrot',
    'பீட்ரூட்': 'Beetroot',
    'முட்டைக்கோஸ்': 'Cabbage (Muttaikose)',
    'காலிபிளவர்': 'Cauliflower',
    'பச்சை பட்டாணி': 'Green Peas (Pachai Pattaani)',
    'இஞ்சி': 'Ginger (Inji)',
    'பூண்டு': 'Garlic (Poondu)',
    'கீரை': 'Spinach (Keerai)',
    'புதினா': 'Mint (Pudhina)',
    'கொத்தமல்லி': 'Coriander (Kothamalli)',
    'எலுமிச்சை': 'Lemon (Elumichai)',
    
    // Fruits
    'தேங்காய்': 'Coconut (Theengaai)',
    'மாம்பழம்': 'Mango (Maambalam)',
    'வாழைப்பழம்': 'Banana (Vaalaipalam)',
    'ஆப்பிள்': 'Apple',
    'கொய்யா': 'Guava (Koyya)',
    'பப்பாளி': 'Papaya (Pappaali)',
    'திராட்சை': 'Grapes (Dhiraatchai)',
    'ஆரஞ்சு': 'Orange',
    
    // Grains & Crops
    'நெல்': 'Paddy / Rice (Nel)',
    'கோதுமை': 'Wheat (Godhumai)',
    'பருப்பு': 'Dhal / Pulses (Paruppu)',
    'உளுந்து': 'Black Gram (Ulundhu)',
    'கடலை': 'Groundnut (Kadalai)',
    'கம்பு': 'Pearl Millet (Kambu)',
    'சோளம்': 'Sorghum / Corn (Solam)',
    'கேழ்வரகு': 'Finger Millet / Ragi',
    'ராகி': 'Finger Millet / Ragi',
    
    // Categories
    'காய்கறி': 'Vegetables (Kaaykari)',
    'காய்கறிகள்': 'Vegetables (Kaaykarigal)',
    'பழம்': 'Fruits (Pazham)',
    'பழங்கள்': 'Fruits (Pazhangal)',
    'தானியம்': 'Grains (Dhaaniyam)',
    'தானியங்கள்': 'Grains (Dhaaniyangal)',
    'பூ': 'Flowers (Poo)',
    'பூக்கள்': 'Flowers (Pookkal)',
    'பால்': 'Milk / Dairy (Paal)',
    'நெய்': 'Ghee (Ney)'
};

/**
 * Transliterates Tamil characters to readable English phonetics.
 * If the word has an exact translation mapped, it returns that instead.
 * @param {string} text
 * @returns {string}
 */
export function transliterateTamil(text) {
    if (!text) return '';
    const trimmed = text.trim();
    if (TAMIL_TRANSLATIONS[trimmed]) {
        return TAMIL_TRANSLATIONS[trimmed];
    }
    
    // Check if the text contains Tamil characters (Unicode block 0B80 - 0BFF)
    const hasTamil = /[\u0B80-\u0BFF]/.test(text);
    if (!hasTamil) return text;
    
    const vowels = {
        '\u0B85': 'a', '\u0B86': 'aa', '\u0B87': 'i', '\u0B88': 'ee',
        '\u0B89': 'u', '\u0B8A': 'oo', '\u0B8E': 'e', '\u0B8F': 'ae',
        '\u0B90': 'ai', '\u0B92': 'o', '\u0B93': 'oe', '\u0B94': 'au',
        '\u0B83': 'h'
    };
    
    const consonants = {
        '\u0B95': 'ka', '\u0B99': 'nga', '\u0B9A': 'cha', '\u0B9E': 'nja',
        '\u0B9F': 'ta', '\u0BA3': 'na', '\u0BA4': 'tha', '\u0BA8': 'na',
        '\u0BA9': 'na', '\u0BAA': 'pa', '\u0BAE': 'ma', '\u0BAF': 'ya',
        '\u0BB0': 'ra', '\u0BB2': 'la', '\u0BB5': 'va', '\u0BB4': 'zha',
        '\u0BB3': 'la', '\u0BB1': 'ra', '\u0BB8': 'sa', '\u0BB7': 'sha',
        '\u0BB9': 'ha', '\u0B9C': 'ja'
    };
    
    const modifiers = {
        '\u0BBE': 'aa', '\u0BBF': 'i', '\u0BC0': 'ee', '\u0BC1': 'u',
        '\u0BC2': 'oo', '\u0BC6': 'e', '\u0BC7': 'ae', '\u0BC8': 'ai',
        '\u0BCA': 'o', '\u0BCB': 'oe', '\u0BCC': 'au', '\u0BCD': ''
    };
    
    let result = '';
    let i = 0;
    
    while (i < text.length) {
        const char = text[i];
        
        if (vowels[char] !== undefined) {
            result += vowels[char];
            i++;
        } else if (consonants[char] !== undefined) {
            let base = consonants[char];
            const nextChar = text[i + 1];
            
            if (nextChar !== undefined && modifiers[nextChar] !== undefined) {
                if (nextChar === '\u0BCD') {
                    result += base.slice(0, -1);
                } else {
                    result += base.slice(0, -1) + modifiers[nextChar];
                }
                i += 2; // consumed consonant + modifier
            } else {
                result += base;
                i++;
            }
        } else {
            result += char;
            i++;
        }
    }
    
    // Capitalize first letter for premium presentation
    return result.charAt(0).toUpperCase() + result.slice(1);
}

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

    // ── Transliterate Tamil values to avoid PDF character corruption ─────
    const buyerNameClean = transliterateTamil(buyer.name || '-');
    const buyerEmailClean = transliterateTamil(buyer.email || '-');
    const farmerNameClean = transliterateTamil(order.farmerName || '-');
    const productNameClean = transliterateTamil(order.productName || '-');
    const categoryClean = transliterateTamil(product.category || '-');

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

    // ── Dynamic Layout Columns to Prevent QR code Overlap ────────────
    const hasQr = !!qrDataUrl;
    
    // Column widths and X-positions
    const buyerX = 14;
    const buyerW = hasQr ? 68 : 88;
    
    const farmerX = hasQr ? 86 : 106;
    const farmerW = hasQr ? 64 : 90;

    // ── Buyer info box ─────────────────────────────────────────────
    doc.setFillColor(240, 248, 240);
    doc.roundedRect(buyerX, 82, buyerW, 48, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(26, 74, 46);
    doc.text('BUYER DETAILS', buyerX + 6, 91);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(9);
    
    // Fit long email / name in the card if QR code is enabled
    let buyerNameDisp = buyerNameClean;
    if (hasQr && buyerNameDisp.length > 20) {
        buyerNameDisp = buyerNameDisp.slice(0, 18) + '...';
    }
    let buyerEmailDisp = buyerEmailClean;
    if (hasQr && buyerEmailDisp.length > 22) {
        buyerEmailDisp = buyerEmailDisp.slice(0, 20) + '...';
    }
    
    doc.text(`Name: ${buyerNameDisp}`, buyerX + 6, 99);
    doc.text(`Email: ${buyerEmailDisp}`, buyerX + 6, 106);
    if (buyer.phone) doc.text(`Phone: ${buyer.phone}`, buyerX + 6, 113);

    // ── Farmer info box (enhanced) ─────────────────────────────────
    doc.setFillColor(255, 248, 225);
    doc.roundedRect(farmerX, 82, farmerW, 48, 3, 3, 'F');

    // "FARMER DETAILS" label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(180, 100, 0);
    doc.text('FARMER DETAILS', farmerX + 6, 91);

    // Farmer name — bigger & bolder
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(120, 60, 0);
    
    let farmerNameDisp = farmerNameClean;
    if (hasQr && farmerNameDisp.length > 18) {
        farmerNameDisp = farmerNameDisp.slice(0, 16) + '...';
    }
    doc.text(farmerNameDisp, farmerX + 6, 101);

    // Phone — cleanly formatted (avoid symbol fallbacks)
    if (order.farmerPhone) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(26, 74, 46);
        doc.text(`Phone: ${order.farmerPhone}`, farmerX + 6, 111);
    }

    // "Contact Farmer" CTA
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 60, 0);
    const contactText = hasQr ? 'Contact farmer for delivery' : 'Contact farmer to arrange delivery';
    doc.text(contactText, farmerX + 6, 120);

    // ── QR Code Card (Clean Align) ─────────────────────────────────
    let tableStartY = 144;
    if (hasQr) {
        try {
            // Self-contained clean card for UPI QR Code
            doc.setFillColor(250, 250, 250);
            doc.setDrawColor(220, 225, 220);
            doc.setLineWidth(0.3);
            doc.roundedRect(154, 82, 42, 48, 3, 3, 'FD');

            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(26, 74, 46);
            doc.text('Scan to Pay (UPI):', 175, 88, { align: 'center' });
            
            // Image precisely centered
            doc.addImage(qrDataUrl, 'PNG', 158, 92, 34, 34);
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
            productNameClean,
            categoryClean,
            `Rs. ${order.pricePerUnit}`,
            `${quantity} ${order.unit}`,
            `Rs. ${order.totalPrice}`
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
    doc.text(`Rs. ${order.totalPrice}`, pageW - 52, finalY + 22, { align: 'center' });

    // ── Footer ─────────────────────────────────────────────────────
    const footerY = finalY + 52;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, footerY, pageW - 14, footerY);
    doc.setTextColor(120, 120, 120);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.text('Thank you for supporting local farmers! | DirectFromFarm', pageW / 2, footerY + 8, { align: 'center' });
    doc.text('Nandri! Supporting Indian Agriculture.', pageW / 2, footerY + 16, { align: 'center' });

    // Save
    doc.save(`DirectFromFarm_Bill_${billNo}.pdf`);
}
