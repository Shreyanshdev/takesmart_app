import { Alert } from 'react-native';
import RNPrint from 'react-native-print';
import { logger } from '../../utils/logger';

interface InvoiceItem {
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

interface InvoiceData {
    invoiceNumber: string;
    orderNumber: string;
    orderDate: Date | string;
    customerName: string;
    customerPhone?: string;
    deliveryAddress: string;
    branchName: string;
    branchAddress?: string;
    items: InvoiceItem[];
    subtotal: number;
    deliveryFee: number;
    grandTotal: number;
    paymentMethod: 'COD' | 'Online' | string;
    isPaid: boolean;
}

const formatDate = (date: Date | string): string => {
    const d = new Date(date);
    return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const generateInvoiceHTML = (data: InvoiceData): string => {
    const itemsHTML = data.items.map((item, index) => `
        <tr>
            <td style="padding: 12px; border-bottom: 1px solid #f0f0f0;">${index + 1}</td>
            <td style="padding: 12px; border-bottom: 1px solid #f0f0f0;">${item.name}</td>
            <td style="padding: 12px; border-bottom: 1px solid #f0f0f0; text-align: center;">₹${item.unitPrice}</td>
            <td style="padding: 12px; border-bottom: 1px solid #f0f0f0; text-align: center;">${item.quantity}</td>
            <td style="padding: 12px; border-bottom: 1px solid #f0f0f0; text-align: right; font-weight: 600;">₹${item.total}</td>
        </tr>
    `).join('');

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice - ${data.invoiceNumber}</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: Arial, sans-serif; 
                font-size: 14px; 
                color: #333;
                background: #fff;
                padding: 30px;
            }
            .header { 
                display: flex; 
                justify-content: space-between; 
                align-items: flex-start;
                margin-bottom: 30px;
                padding-bottom: 15px;
                border-bottom: 3px solid #EF4444;
            }
            .brand-name { 
                font-size: 28px; 
                font-weight: 700; 
                color: #EF4444;
                margin-bottom: 4px;
            }
            .brand-tagline { 
                font-size: 12px; 
                color: #666;
            }
            .brand-email { 
                font-size: 12px; 
                color: #888;
                margin-top: 8px;
            }
            .invoice-title { 
                font-size: 24px; 
                font-weight: 700; 
                color: #333;
                margin-bottom: 8px;
                text-align: right;
            }
            .invoice-number { 
                font-size: 14px; 
                color: #666;
                text-align: right;
            }
            .invoice-date { 
                font-size: 12px; 
                color: #888;
                margin-top: 4px;
                text-align: right;
            }
            .info-section { 
                display: flex; 
                justify-content: space-between; 
                margin-bottom: 25px;
                gap: 20px;
            }
            .info-box { 
                flex: 1;
                background: #f9f9f9;
                padding: 15px;
                border-radius: 8px;
            }
            .info-label { 
                font-size: 11px; 
                color: #888;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 8px;
            }
            .info-value { 
                font-size: 14px; 
                font-weight: 600;
                color: #333;
            }
            .info-address { 
                font-size: 12px; 
                color: #666;
                margin-top: 4px;
                line-height: 1.5;
            }
            .items-table { 
                width: 100%; 
                border-collapse: collapse;
                margin-bottom: 25px;
            }
            .items-table th { 
                background: #EF4444;
                color: white;
                padding: 12px;
                text-align: left;
                font-weight: 600;
                font-size: 12px;
                text-transform: uppercase;
            }
            .items-table th:nth-child(3),
            .items-table th:nth-child(4) { text-align: center; }
            .items-table th:last-child { text-align: right; }
            .summary-section { 
                margin-left: auto;
                width: 250px;
            }
            .summary-row { 
                display: flex; 
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid #f0f0f0;
            }
            .summary-label { color: #666; }
            .summary-value { font-weight: 500; }
            .grand-total { 
                display: flex; 
                justify-content: space-between;
                padding: 14px;
                background: #EF4444;
                color: white;
                border-radius: 8px;
                margin-top: 10px;
            }
            .grand-total-label { font-size: 14px; font-weight: 600; }
            .grand-total-value { font-size: 18px; font-weight: 700; }
            .payment-status { 
                text-align: center;
                margin-top: 25px;
                padding: 14px;
                border-radius: 8px;
                font-weight: 600;
                font-size: 14px;
            }
            .payment-paid { 
                background: #D1FAE5;
                color: #065F46;
            }
            .payment-cod { 
                background: #FEF3C7;
                color: #92400E;
            }
            .footer { 
                margin-top: 30px;
                padding-top: 15px;
                border-top: 1px solid #eee;
                text-align: center;
                color: #888;
                font-size: 11px;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div>
                <div class="brand-name">LushandPure</div>
                <div class="brand-tagline">Fresh & Pure Dairy Delivered</div>
                <div class="brand-email">contact@lushandpures.com</div>
            </div>
            <div>
                <div class="invoice-title">INVOICE</div>
                <div class="invoice-number">${data.invoiceNumber}</div>
                <div class="invoice-date">${formatDate(data.orderDate)}</div>
            </div>
        </div>

        <div class="info-section">
            <div class="info-box">
                <div class="info-label">Bill To</div>
                <div class="info-value">${data.customerName}</div>
                ${data.customerPhone ? `<div class="info-address">📞 ${data.customerPhone}</div>` : ''}
                <div class="info-address">📍 ${data.deliveryAddress}</div>
            </div>
            <div class="info-box">
                <div class="info-label">From Branch</div>
                <div class="info-value">${data.branchName}</div>
                ${data.branchAddress ? `<div class="info-address">${data.branchAddress}</div>` : ''}
            </div>
        </div>

        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 40px;">#</th>
                    <th>Item Description</th>
                    <th style="width: 80px;">Price</th>
                    <th style="width: 60px;">Qty</th>
                    <th style="width: 90px;">Amount</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHTML}
            </tbody>
        </table>

        <div class="summary-section">
            <div class="summary-row">
                <span class="summary-label">Subtotal</span>
                <span class="summary-value">₹${data.subtotal}</span>
            </div>
            <div class="summary-row">
                <span class="summary-label">Delivery Fee</span>
                <span class="summary-value">${data.deliveryFee === 0 ? 'FREE' : `₹${data.deliveryFee}`}</span>
            </div>
            <div class="grand-total">
                <span class="grand-total-label">Grand Total</span>
                <span class="grand-total-value">₹${data.grandTotal}</span>
            </div>
        </div>

        <div class="payment-status ${data.isPaid ? 'payment-paid' : 'payment-cod'}">
            ${data.isPaid ? '✓ PAID VIA ONLINE PAYMENT' : '💵 CASH ON DELIVERY'}
        </div>

        <div class="footer">
            <p>Thank you for choosing LushandPure!</p>
            <p style="margin-top: 8px;"> +917017877512 | contact@lushandpures.com</p>
            <p style="margin-top: 4px;"> Kasera, Mathura, Uttar Pradesh - 281202</p>
            <p style="margin-top: 8px;">This is a computer-generated invoice.</p>
        </div>
    </body>
    </html>
    `;
};

export const invoiceService = {
    generateAndShareInvoice: async (data: InvoiceData): Promise<void> => {
        try {
            const html = generateInvoiceHTML(data);

            // Use RNPrint to print/save as PDF
            await RNPrint.print({
                html,
                jobName: `LushandPure_Invoice_${data.orderNumber}`,
            });

        } catch (error: any) {
            logger.error('Invoice generation error:', error);
            Alert.alert('Error', 'Failed to generate invoice. Please try again.');
        }
    },

    // Helper to create invoice data from order
    createInvoiceFromOrder: (order: any): InvoiceData => {
        const items: InvoiceItem[] = order.items?.map((item: any) => ({
            name: item.item || item.id?.name || 'Product',
            quantity: item.count || 1,
            unitPrice: item.id?.price || 0,
            total: (item.id?.price || 0) * (item.count || 1)
        })) || [];

        const subtotal = items.reduce((sum, item) => sum + item.total, 0);
        const deliveryFee = order.deliveryFee || 0;
        const grandTotal = order.totalPrice || (subtotal + deliveryFee);

        return {
            invoiceNumber: `INV-${order.orderId || order._id?.slice(-6).toUpperCase()}`,
            orderNumber: order.orderId || order._id?.slice(-6).toUpperCase(),
            orderDate: order.createdAt || new Date(),
            customerName: order.customer?.name || 'Customer',
            customerPhone: order.customer?.phone,
            deliveryAddress: order.deliveryLocation?.address || 'Address not available',
            branchName: order.branch?.name || order.pickupLocation?.address || 'Branch',
            branchAddress: order.branch?.address,
            items,
            subtotal,
            deliveryFee,
            grandTotal,
            paymentMethod: order.paymentDetails?.paymentMethod === 'cod' ? 'COD' : 'Online',
            isPaid: order.paymentStatus === 'verified' || order.paymentStatus === 'completed'
        };
    },

    // Generate and share subscription invoice
    generateSubscriptionInvoice: async (subscription: any): Promise<void> => {
        try {
            const formatDateShort = (date: Date | string): string => {
                const d = new Date(date);
                return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
            };

            const products = subscription.products || [];
            const productsHTML = products.map((p: any, index: number) => `
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #f0f0f0;">${index + 1}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #f0f0f0;">${p.productName || 'Product'}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #f0f0f0; text-align: center;">${p.quantityValue || 1} ${p.quantityUnit || ''}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #f0f0f0; text-align: center;">${p.deliveryFrequency || 'Daily'}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #f0f0f0; text-align: center;">
                        <span style="color: #22C55E; font-weight: 600;">${p.deliveredCount || 0}</span>
                        <span style="color: #888;">/${p.totalDeliveries || 0}</span>
                    </td>
                    <td style="padding: 12px; border-bottom: 1px solid #f0f0f0; text-align: right; font-weight: 600;">₹${p.monthlyPrice || 0}</td>
                </tr>
            `).join('');

            const deliveredCount = subscription.deliveredCount || 0;
            const remainingDeliveries = subscription.remainingDeliveries || 0;
            const totalDeliveries = subscription.totalDeliveries || (deliveredCount + remainingDeliveries);
            const progressPercent = totalDeliveries > 0 ? Math.round((deliveredCount / totalDeliveries) * 100) : 0;

            // Calculate subscription total from products if bill is not available
            const subscriptionTotal = subscription.bill || subscription.totalBill ||
                products.reduce((sum: number, p: any) => sum + (p.monthlyPrice || 0), 0);

            const customerName = subscription.customer?.name || 'Customer';
            const customerPhone = subscription.customer?.phone || '';
            const address = subscription.deliveryAddress
                ? `${subscription.deliveryAddress.addressLine1 || ''}, ${subscription.deliveryAddress.city || ''} - ${subscription.deliveryAddress.zipCode || ''}`
                : subscription.customer?.address || 'Address not available';

            const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Subscription Invoice</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: Arial, sans-serif; font-size: 14px; color: #333; background: #fff; padding: 30px; }
                    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 3px solid #EF4444; }
                    .brand-name { font-size: 28px; font-weight: 700; color: #EF4444; margin-bottom: 4px; }
                    .brand-tagline { font-size: 12px; color: #666; }
                    .brand-email { font-size: 12px; color: #888; margin-top: 8px; }
                    .invoice-title { font-size: 24px; font-weight: 700; color: #333; margin-bottom: 8px; text-align: right; }
                    .invoice-number { font-size: 14px; color: #666; text-align: right; }
                    .status-badge { display: inline-block; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
                    .status-active { background: #DCFCE7; color: #166534; }
                    .status-pending { background: #E0E7FF; color: #3730A3; }
                    .info-section { display: flex; justify-content: space-between; margin-bottom: 20px; gap: 15px; }
                    .info-box { flex: 1; background: #f9f9f9; padding: 15px; border-radius: 8px; }
                    .info-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
                    .info-value { font-size: 14px; font-weight: 600; color: #333; }
                    .info-address { font-size: 12px; color: #666; margin-top: 4px; }
                    .progress-section { background: #f9f9f9; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
                    .progress-title { font-size: 14px; font-weight: 600; margin-bottom: 12px; }
                    .progress-stats { display: flex; justify-content: space-around; text-align: center; margin-bottom: 15px; }
                    .progress-stat { }
                    .progress-stat-value { font-size: 24px; font-weight: 700; }
                    .progress-stat-label { font-size: 11px; color: #888; }
                    .progress-bar-bg { width: 100%; height: 8px; background: #E5E7EB; border-radius: 4px; overflow: hidden; }
                    .progress-bar-fill { height: 100%; background: #EF4444; border-radius: 4px; }
                    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                    .items-table th { background: #EF4444; color: white; padding: 12px; text-align: left; font-weight: 600; font-size: 12px; text-transform: uppercase; }
                    .items-table th:nth-child(3), .items-table th:nth-child(4) { text-align: center; }
                    .items-table th:last-child { text-align: right; }
                    .summary-section { margin-left: auto; width: 250px; }
                    .summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
                    .grand-total { display: flex; justify-content: space-between; padding: 14px; background: #EF4444; color: white; border-radius: 8px; margin-top: 10px; }
                    .payment-status { text-align: center; margin-top: 20px; padding: 14px; border-radius: 8px; font-weight: 600; font-size: 14px; }
                    .payment-paid { background: #D1FAE5; color: #065F46; }
                    .payment-cod { background: #FEF3C7; color: #92400E; }
                    .footer { margin-top: 25px; padding-top: 15px; border-top: 1px solid #eee; text-align: center; color: #888; font-size: 11px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <div class="brand-name">LushandPure</div>
                        <div class="brand-tagline">Fresh & Pure Dairy Delivered</div>
                        <div class="brand-email">contact@lushandpures.com</div>
                    </div>
                    <div>
                        <div class="invoice-title">SUBSCRIPTION</div>
                        <div class="invoice-number">#${subscription.subscriptionId || subscription._id?.slice(-8).toUpperCase()}</div>
                        <div class="status-badge ${subscription.status === 'active' ? 'status-active' : 'status-pending'}" style="margin-top: 8px;">
                            ${(subscription.status || 'active').toUpperCase()}
                        </div>
                    </div>
                </div>

                <div class="info-section">
                    <div class="info-box">
                        <div class="info-label">Customer</div>
                        <div class="info-value">${customerName}</div>
                        ${customerPhone ? `<div class="info-address">📞 ${customerPhone}</div>` : ''}
                        <div class="info-address">📍 ${address}</div>
                    </div>
                    <div class="info-box">
                        <div class="info-label">Duration</div>
                        <div class="info-value">${formatDateShort(subscription.startDate)} - ${formatDateShort(subscription.endDate)}</div>
                        <div class="info-address">Slot: ${subscription.slot === 'morning' ? '🌅 Morning' : '🌆 Evening'}</div>
                    </div>
                </div>

                <div class="progress-section">
                    <div class="progress-title">Delivery Progress</div>
                    <div class="progress-stats">
                        <div class="progress-stat">
                            <div class="progress-stat-value" style="color: #22C55E;">${deliveredCount}</div>
                            <div class="progress-stat-label">Delivered</div>
                        </div>
                        <div class="progress-stat">
                            <div class="progress-stat-value" style="color: #F59E0B;">${remainingDeliveries}</div>
                            <div class="progress-stat-label">Remaining</div>
                        </div>
                        <div class="progress-stat">
                            <div class="progress-stat-value">${totalDeliveries}</div>
                            <div class="progress-stat-label">Total</div>
                        </div>
                    </div>
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" style="width: ${progressPercent}%;"></div>
                    </div>
                    <div style="text-align: center; margin-top: 8px; font-size: 12px; color: #888;">${progressPercent}% Complete</div>
                </div>

                <table class="items-table">
                    <thead>
                        <tr>
                            <th style="width: 35px;">#</th>
                            <th>Product</th>
                            <th style="width: 70px;">Qty</th>
                            <th style="width: 80px;">Frequency</th>
                            <th style="width: 80px;">Delivered</th>
                            <th style="width: 80px;">Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${productsHTML}
                    </tbody>
                </table>

                <div class="summary-section">
                    <div class="summary-row">
                        <span style="color: #666;">Subscription Total</span>
                        <span style="font-weight: 500;">₹${subscriptionTotal}</span>
                    </div>
                    <div class="summary-row">
                        <span style="color: #666;">Delivery</span>
                        <span style="font-weight: 500; color: #22C55E;">FREE</span>
                    </div>
                    <div class="grand-total">
                        <span style="font-size: 14px; font-weight: 600;">Total Amount</span>
                        <span style="font-size: 18px; font-weight: 700;">₹${subscriptionTotal}</span>
                    </div>
                </div>

                <div class="payment-status ${subscription.paymentMethod !== 'cod' ? 'payment-paid' : 'payment-cod'}">
                    ${subscription.paymentMethod !== 'cod' ? '✓ PAID VIA ONLINE PAYMENT' : '💵 CASH ON DELIVERY'}
                </div>

                <div class="footer">
                    <p>Thank you for choosing LushandPure!</p>
                    <p style="margin-top: 8px;">📞 +917017877512 | 📧 contact@lushandpures.com</p>
                    <p style="margin-top: 4px;">📍 Kasera, Mathura, Uttar Pradesh - 281202</p>
                    <p style="margin-top: 8px;">This is a computer-generated invoice.</p>
                </div>
            </body>
            </html>
            `;

            await RNPrint.print({
                html,
                jobName: `LushandPure_Subscription_${subscription.subscriptionId || 'Invoice'}`,
            });

        } catch (error: any) {
            logger.error('Subscription invoice error:', error);
            Alert.alert('Error', 'Failed to generate subscription invoice. Please try again.');
        }
    }
};
