import { afterEach, describe, expect, it, vi } from 'vitest';

const toBlob = vi.fn();
const pdf = vi.fn(() => ({ toBlob }));
const downloadBlob = vi.fn();

vi.mock('@react-pdf/renderer', () => ({ pdf }));
vi.mock('../../components/pdf/ResumePdfDocument', () => ({ default: function ResumePdfDocument() {} }));
vi.mock('../files', () => ({ downloadBlob }));

const { countPdfPages, downloadResumePdf, pdfFileName, renderResumePdf } = await import('../pdfExport');

afterEach(() => {
  vi.clearAllMocks();
});

describe('pdfFileName', () => {
  it('ajoute l’extension une seule fois et prévoit un nom par défaut', () => {
    expect(pdfFileName('CV_Camille_Martin')).toBe('CV_Camille_Martin.pdf');
    expect(pdfFileName('CV_Camille_Martin.PDF')).toBe('CV_Camille_Martin.pdf');
    expect(pdfFileName('')).toBe('CV.pdf');
    expect(pdfFileName(undefined)).toBe('CV.pdf');
    expect(pdfFileName('CV: Martin/Decathlon')).toBe('CV_ Martin_Decathlon.pdf');
  });
});

describe('downloadResumePdf', () => {
  it('génère le document à partir de données normalisées et le télécharge', async () => {
    const blob = new Blob(['%PDF-1.3']);
    toBlob.mockResolvedValue(blob);

    await downloadResumePdf({ data: null, settings: { lang: 'en', fontScale: 9 }, fileName: 'CV_Camille_Martin_Decathlon.pdf' });

    const element = pdf.mock.calls[0][0];
    expect(element.props.title).toBe('CV_Camille_Martin_Decathlon');
    expect(element.props.data.personalInfo.name).toBe('');
    expect(element.props.data.sections.length).toBeGreaterThan(0);
    expect(element.props.settings.lang).toBe('en');
    expect(element.props.settings.fontScale).toBe(1.3);
    expect(downloadBlob).toHaveBeenCalledWith(blob, 'CV_Camille_Martin_Decathlon.pdf');
  });

  it('annonce le nombre de pages du PDF généré, puis télécharge ce même fichier', async () => {
    const blob = new Blob(['%PDF-1.3\n1 0 obj << /Type /Pages /Count 2 >>\n2 0 obj << /Type /Page >>\n3 0 obj <</Type/Page>>']);
    toBlob.mockResolvedValue(blob);

    const prepared = await renderResumePdf({ data: {}, settings: {}, fileName: 'CV_Camille_Martin' });
    expect(prepared).toEqual({ blob, name: 'CV_Camille_Martin.pdf', pages: 2 });
    expect(downloadBlob).not.toHaveBeenCalled();

    await downloadResumePdf({ prepared });
    expect(pdf).toHaveBeenCalledTimes(1);
    expect(downloadBlob).toHaveBeenCalledWith(blob, 'CV_Camille_Martin.pdf');
    expect(await countPdfPages(new Blob(['pas un PDF']))).toBe(0);
  });

  it('remonte un message en français si la génération échoue', async () => {
    const cause = new Error('boom');
    toBlob.mockRejectedValue(cause);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const error = await downloadResumePdf({ data: {}, settings: {}, fileName: 'CV' }).catch((e) => e);

    expect(error.message).toMatch(/La création du PDF a échoué/);
    expect(error.cause).toBe(cause);
    expect(downloadBlob).not.toHaveBeenCalled();
  });

  it('remonte un message en français si le module PDF ne se charge pas', async () => {
    vi.resetModules();
    vi.doMock('@react-pdf/renderer', () => {
      throw new Error('Failed to fetch dynamically imported module');
    });
    const fresh = await import('../pdfExport');

    const error = await fresh.downloadResumePdf({ data: {}, settings: {}, fileName: 'CV' }).catch((e) => e);

    expect(error.message).toMatch(/n'a pas pu être chargé/);
    expect(downloadBlob).not.toHaveBeenCalled();
    vi.doUnmock('@react-pdf/renderer');
  });
});
