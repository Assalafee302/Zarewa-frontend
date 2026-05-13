import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Rasterize a DOM node (e.g. #workbook-print-root) into a multi-page A4 portrait PDF.
 * @param {HTMLElement} element
 * @returns {Promise<Blob>}
 */
export async function workbookPrintRootToPdfBlob(element) {
  if (!element || !(element instanceof HTMLElement)) {
    throw new Error('Missing print root element');
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    scrollX: 0,
    scrollY: 0,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  });

  const pageWidthMm = 210;
  const pageHeightMm = 297;
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  let imgData;
  try {
    imgData = canvas.toDataURL('image/jpeg', 0.92);
  } catch {
    throw new Error(
      'Could not build PDF (blocked image data). Use Print and choose Save as PDF in the print dialog.'
    );
  }
  const imgWidthMm = pageWidthMm;
  const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width;

  let heightLeftMm = imgHeightMm;
  let positionMm = 0;
  pdf.addImage(imgData, 'JPEG', 0, positionMm, imgWidthMm, imgHeightMm);
  heightLeftMm -= pageHeightMm;
  while (heightLeftMm > 0) {
    positionMm -= pageHeightMm;
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, positionMm, imgWidthMm, imgHeightMm);
    heightLeftMm -= pageHeightMm;
  }

  return pdf.output('blob');
}
