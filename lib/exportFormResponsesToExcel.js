function escapeXml(value) {
    return String(value ?? '')
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function columnName(index) {
    let name = '';
    let column = index + 1;
    while (column > 0) {
        const remainder = (column - 1) % 26;
        name = String.fromCharCode(65 + remainder) + name;
        column = Math.floor((column - 1) / 26);
    }
    return name;
}

function toCell(value, reference, isHeader = false) {
    return `<c r="${reference}" t="inlineStr"${isHeader ? ' s="1"' : ''}><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}

function toDisplayValue(value) {
    if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
    if (!value) return '-';
    if (Array.isArray(value)) return value.map(toDisplayValue).join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

function toDisplayDate(timestamp, locale) {
    const date = new Date(timestamp);
    return `${date.toLocaleDateString(locale)} ${date.toLocaleTimeString(locale)}`;
}

function makeWorksheetXml(headers, records) {
    const rows = [headers, ...records];
    const sheetRows = rows.map((row, rowIndex) => {
        const cells = row.map((value, columnIndex) =>
            toCell(value, `${columnName(columnIndex)}${rowIndex + 1}`, rowIndex === 0)
        ).join('');
        return `<row r="${rowIndex + 1}">${cells}</row>`;
    }).join('');
    const lastColumn = columnName(Math.max(0, headers.length - 1));
    const columns = headers.map((header, index) => {
        const width = index === 0 ? 26 : Math.min(40, Math.max(18, String(header).length + 4));
        return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`;
    }).join('');

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
        `<dimension ref="A1:${lastColumn}${rows.length}"/><sheetViews><sheetView workbookViewId="0"/></sheetViews>` +
        `<cols>${columns}</cols><sheetData>${sheetRows}</sheetData>` +
        `<autoFilter ref="A1:${lastColumn}${rows.length}"/>` +
        `</worksheet>`;
}

function safeFilePart(value) {
    return String(value || 'form-responses')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'form-responses';
}

export async function downloadFormResponsesExcel(form, submissions) {
    const fields = form?.fields || [];
    const headers = ['Date', ...fields.map((field) => field.label || 'Question')];
    const rows = submissions.map((submission) => [
        toDisplayDate(submission.submittedAt, form?.dateLocale),
        ...fields.map((field) => toDisplayValue(submission.data?.[field.id])),
    ]);
    const JSZip = (await import('jszip')).default;
    const workbook = new JSZip();
    const sheetName = safeFilePart(form?.title).slice(0, 31) || 'Reponses';

    workbook.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
        `<Default Extension="xml" ContentType="application/xml"/>` +
        `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
        `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
        `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
        `</Types>`);
    workbook.folder('_rels').file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
        `</Relationships>`);
    workbook.folder('xl').file('workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
        `<sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`);
    workbook.folder('xl').folder('_rels').file('workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
        `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
        `</Relationships>`);
    workbook.folder('xl').folder('worksheets').file('sheet1.xml', makeWorksheetXml(headers, rows));
    workbook.folder('xl').file('styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
        `<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>` +
        `<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>` +
        `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
        `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
        `<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0"/></cellXfs>` +
        `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`);

    const fileBlob = await workbook.generateAsync({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(fileBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeFilePart(form?.title)}-reponses-${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
