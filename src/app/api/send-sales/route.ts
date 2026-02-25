import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { Order } from '@/types';

export async function POST(req: Request) {
    try {
        const { orders, email } = await req.json();

        if (!orders || orders.length === 0) {
            return NextResponse.json({ error: "No orders provided" }, { status: 400 });
        }
        if (!email) {
            return NextResponse.json({ error: "No recipient email provided" }, { status: 400 });
        }

        // Check if environment variables are set
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            return NextResponse.json(
                { error: "Server missing EMAIL_USER or EMAIL_PASS environment variables." },
                { status: 500 }
            );
        }

        // Generate CSV content
        let csvContent = "Order ID,Table,Date,Total Amount,Items\n";
        orders.forEach((order: Order) => {
            const dateStr = order.timestamp && (order.timestamp as any).toDate
                ? (order.timestamp as any).toDate().toLocaleString()
                : new Date().toLocaleString();

            const itemsStr = order.items.map(i => `${i.quantity}x ${i.name}`).join(' | ');
            const safeItemsStr = `"${itemsStr.replace(/"/g, '""')}"`;
            csvContent += `${order.id},${order.tableId},"${dateStr}",${order.total},${safeItemsStr}\n`;
        });

        // Configure Nodemailer
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        // Send Email
        await transporter.sendMail({
            from: `"Restro Menu Book" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `Sales Report - ${new Date().toLocaleDateString()}`,
            text: `Hello,\n\nPlease find attached your sales report for ${new Date().toLocaleDateString()}.\n\nTotal Orders: ${orders.length}\nTotal Revenue: ₹${orders.reduce((sum: number, o: Order) => sum + (o.total || 0), 0)}\n\nThank you,\nRestro Menu Book System`,
            attachments: [
                {
                    filename: `sales_report_${new Date().toISOString().split('T')[0]}.csv`,
                    content: Buffer.from(csvContent, 'utf-8'),
                },
            ],
        });

        return NextResponse.json({ success: true, message: "Email sent successfully" }, { status: 200 });

    } catch (error: any) {
        console.error("Error sending email:", error);
        return NextResponse.json(
            { error: error.message || "Failed to send email" },
            { status: 500 }
        );
    }
}
