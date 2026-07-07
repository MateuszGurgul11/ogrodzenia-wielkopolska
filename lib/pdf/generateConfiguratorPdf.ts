import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

export async function generateConfiguratorPdf(
  container: HTMLElement,
): Promise<void> {
  const pages = Array.from(
    container.querySelectorAll<HTMLElement>("[data-pdf-page]"),
  );

  if (pages.length === 0) {
    throw new Error("Brak stron PDF do wygenerowania.");
  }

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]!;
    const canvas = await html2canvas(page, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    const imgData = canvas.toDataURL("image/png");
    const imgWidth = A4_WIDTH_MM;
    const imgHeight = (canvas.height * A4_WIDTH_MM) / canvas.width;

    if (i > 0) {
      doc.addPage();
    }

    if (imgHeight <= A4_HEIGHT_MM) {
      doc.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
    } else {
      const scale = A4_HEIGHT_MM / imgHeight;
      doc.addImage(imgData, "PNG", 0, 0, imgWidth * scale, A4_HEIGHT_MM);
    }
  }

  doc.save("konfiguracja-ogrodzenia-wielkopolska.pdf");
}
