import { generateQRCodeSVG } from '@/lib/splitter/qrGenerator';

describe('QR Generator', () => {
  test('generates valid SVG string for session ID', () => {
    const svg = generateQRCodeSVG('CAP-SPLIT-9821-X', { size: 200 });
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('viewBox="0 0 200 200"');
    expect(svg).toContain('<rect');
  });
});
