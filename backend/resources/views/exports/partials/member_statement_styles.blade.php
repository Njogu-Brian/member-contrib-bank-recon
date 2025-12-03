<style>
    @page {
        margin: 28px 28px 32px 28px;
    }

    body {
        font-family: DejaVu Sans, sans-serif;
        font-size: 11px;
        color: #0f172a;
        margin: 0;
        padding: 0;
        background-color: #ffffff;
    }

    .statement {
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 26px 32px;
        margin-bottom: 32px;
        box-sizing: border-box;
    }

    .page-break {
        page-break-after: always;
    }

    .branding {
        display: flex;
        justify-content: center;
        margin-bottom: 10px;
    }

    .brand-lockup {
        display: flex;
        align-items: center;
        gap: 16px;
    }

    .brand-icon {
        width: 120px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .brand-icon svg {
        width: 100%;
        height: auto;
        display: block;
    }

    .brand-icon img {
        max-width: 100%;
        max-height: 80px;
        height: auto;
        display: block;
        object-fit: contain;
    }

    .brand-text {
        text-align: left;
    }

    .brand-name {
        font-size: 16px;
        font-weight: 700;
        letter-spacing: 0.05em;
    }

    .brand-tagline {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: #f59519;
    }

    .statement-title {
        text-align: center;
        font-size: 20px;
        font-weight: 700;
        margin: 6px 0 2px;
        text-transform: uppercase;
    }

    .generated {
        text-align: center;
        font-size: 11px;
        color: #6b7280;
        margin-bottom: 18px;
    }

    .info-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 14px;
        font-size: 12px;
    }

    .info-table td {
        padding: 4px 6px 4px 0;
    }

    .info-table td.label {
        font-weight: 600;
        width: 120px;
        color: #374151;
    }

    .note {
        font-size: 10px;
        color: #6b7280;
        margin-bottom: 10px;
    }

    .transactions {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 14px;
        font-size: 11px;
    }

    .transactions th,
    .transactions td {
        border: 1px solid #e5e7eb;
        padding: 6px 8px;
    }

    .transactions th {
        background-color: #f3f4f6;
        text-transform: uppercase;
        font-size: 10px;
        letter-spacing: 0.05em;
        text-align: left;
    }

    .transactions td.text-right {
        text-align: right;
    }

    .transactions tr.totals-row td {
        font-weight: 600;
        background-color: #f9fafb;
    }

    .empty-row {
        text-align: center;
        color: #6b7280;
        font-style: italic;
    }

    .summary-block {
        font-size: 12px;
        line-height: 1.6;
    }

    .summary-block strong {
        font-size: 13px;
    }

    .footer-text {
        margin-top: 18px;
        text-align: center;
        font-size: 10px;
        color: #9ca3af;
    }
</style>

