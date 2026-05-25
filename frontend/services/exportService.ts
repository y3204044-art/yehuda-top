import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import { PageData } from '../types';

export const exportToDocx = async (pages: PageData[]) => {
  const children: Paragraph[] = [];

  pages.forEach((page) => {
    if (page.status !== 'completed') return;

    // Add Page Header
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: `--- עמוד ${page.pageNumber} ---`,
            bold: true,
            size: 28,
            rightToLeft: true,
          }),
        ],
        spacing: { before: 400, after: 400 },
      })
    );

    // Combine text: Right then Left
    const combinedText = `${page.rightText}\n\n${page.leftText}`;
    const paragraphs = combinedText.split('\n\n').filter(p => p.trim() !== '');

    paragraphs.forEach(text => {
      children.push(
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          bidirectional: true,
          children: [
            new TextRun({
              text: text.trim(),
              size: 24,
              rightToLeft: true,
            }),
          ],
          spacing: { after: 200 },
        })
      );
    });
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Marganita_Export.docx';
  a.click();
  window.URL.revokeObjectURL(url);
};
