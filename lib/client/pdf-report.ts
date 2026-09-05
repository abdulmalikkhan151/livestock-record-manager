type AnimalStatus = "Active" | "Sold" | "Deceased";

export type ReportAnimal = {
  tagNumber: string;
  name: string | null;
  species: "Cow" | "Buffalo" | "Goat" | "Camel";
  breed: string | null;
  sex: "Female" | "Male";
  status: AnimalStatus;
  dateOfBirth: string | null;
  color: string | null;
  location: string | null;
  sellerName: string | null;
  sellerPhone: string | null;
  purchaseDate: string | null;
  purchasePrice: number | null;
  purchaseWeightKg: number | null;
  currentWeightKg: number | null;
  recordSource: string | null;
  notes: string | null;
};

type WeightRecord = { weightKg: number; measuredAt: string; notes: string | null };
type HealthRecord = { category: string; title: string; eventDate: string; veterinarian: string | null; cost: number | null; nextDueDate: string | null; notes: string | null };
type ExpenseRecord = { category: string; amount: number; expenseDate: string; notes: string | null };
type SaleRecord = { saleDate: string; salePrice: number; saleWeightKg: number | null; buyerName: string | null; buyerPhone: string | null; notes: string | null };

export type ReportAnimalDetail = {
  animal: ReportAnimal;
  weights: WeightRecord[];
  health: HealthRecord[];
  expenses: ExpenseRecord[];
  sales: SaleRecord[];
};

type PdfPage = { width: number; height: number; commands: string[] };

const encoder = new TextEncoder();
const GREEN = "0.09 0.25 0.21";
const GOLD = "0.72 0.49 0.24";
const INK = "0.10 0.16 0.14";
const MUTED = "0.39 0.45 0.42";

function clean(value: unknown) {
  return String(value ?? "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2022]/g, "-")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeText(value: unknown) {
  return clean(value).replace(/([\\()])/g, "\\$1");
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return clean(value);
  return new Intl.DateTimeFormat("en-PK", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatPKR(value: number | null | undefined) {
  return value == null ? "-" : `Rs ${Math.round(value).toLocaleString("en-PK")}`;
}

function text(page: PdfPage, value: unknown, x: number, y: number, size = 10, bold = false, color = INK) {
  page.commands.push(`BT /${bold ? "F2" : "F1"} ${size} Tf ${color} rg 1 0 0 1 ${x} ${y} Tm (${escapeText(value)}) Tj ET`);
}

function line(page: PdfPage, x1: number, y1: number, x2: number, y2: number, color = "0.84 0.84 0.80", width = 0.6) {
  page.commands.push(`${color} RG ${width} w ${x1} ${y1} m ${x2} ${y2} l S`);
}

function fill(page: PdfPage, x: number, y: number, width: number, height: number, color: string) {
  page.commands.push(`${color} rg ${x} ${y} ${width} ${height} re f`);
}

function truncate(value: unknown, max: number) {
  const normalized = clean(value) || "-";
  return normalized.length <= max ? normalized : `${normalized.slice(0, Math.max(1, max - 3))}...`;
}

function wrap(value: unknown, max: number) {
  const words = (clean(value) || "-").split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= max) current = candidate;
    else {
      if (current) lines.push(current);
      current = word.length > max ? word.slice(0, max) : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function buildPdf(pages: PdfPage[]) {
  const objects: string[] = [];
  const pageObjectNumbers = pages.map((_, index) => 5 + index * 2);
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pageObjectNumbers.map((number) => `${number} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";

  pages.forEach((page, index) => {
    const pageNumber = 5 + index * 2;
    const contentNumber = pageNumber + 1;
    const stream = page.commands.join("\n");
    objects[pageNumber] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.width} ${page.height}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentNumber} 0 R >>`;
    objects[contentNumber] = `<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}\nendstream`;
  });

  let output = "%PDF-1.4\n%1234\n";
  const offsets = [0];
  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = encoder.encode(output).length;
    output += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xref = encoder.encode(output).length;
  output += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let index = 1; index < objects.length; index += 1) {
    output += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  output += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return encoder.encode(output);
}

function savePdf(bytes: Uint8Array, fileName: string) {
  const copy = new Uint8Array(new ArrayBuffer(bytes.byteLength));
  copy.set(bytes);
  const blob = new Blob([copy.buffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function farmPage(pageNumber: number, totalPages: number) {
  const page: PdfPage = { width: 842, height: 595, commands: [] };
  fill(page, 0, 521, 842, 74, GREEN);
  fill(page, 0, 517, 842, 4, GOLD);
  text(page, "LIVESTOCK RECORD MANAGER", 34, 560, 19, true, "1 1 1");
  text(page, "Complete Farm Report", 34, 538, 11, false, "0.80 0.88 0.85");
  text(page, `Page ${pageNumber} of ${totalPages}`, 747, 548, 9, false, "0.80 0.88 0.85");
  return page;
}

export function downloadFarmReport(animals: ReportAnimal[], requestedBy: string, label = "Complete livestock records") {
  const rowsPerPage = 17;
  const pageCount = Math.max(1, Math.ceil(animals.length / rowsPerPage));
  const pages: PdfPage[] = [];
  const active = animals.filter((animal) => animal.status === "Active").length;
  const invested = animals.reduce((sum, animal) => sum + (animal.purchasePrice ?? 0), 0);

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    const page = farmPage(pageIndex + 1, pageCount);
    pages.push(page);
    if (pageIndex === 0) {
      text(page, label, 34, 492, 12, true);
      text(page, `Generated ${new Date().toLocaleString("en-PK")} by ${requestedBy}`, 34, 475, 8, false, MUTED);
      text(page, `Total: ${animals.length}`, 475, 492, 10, true, GREEN);
      text(page, `Active: ${active}`, 555, 492, 10, true, GREEN);
      text(page, `Purchase value: ${formatPKR(invested)}`, 640, 492, 10, true, GREEN);
    } else {
      text(page, label, 34, 492, 11, true);
      text(page, "Continued animal records", 34, 475, 8, false, MUTED);
    }

    const tableTop = 452;
    fill(page, 34, tableTop, 774, 25, "0.89 0.91 0.87");
    const columns = [
      { x: 42, label: "TAG" }, { x: 108, label: "ANIMAL" }, { x: 252, label: "TYPE" },
      { x: 326, label: "SEX" }, { x: 382, label: "STATUS" }, { x: 460, label: "PURCHASE" },
      { x: 570, label: "WEIGHT" }, { x: 660, label: "LOCATION" },
    ];
    columns.forEach((column) => text(page, column.label, column.x, tableTop + 9, 8, true, GREEN));

    const pageAnimals = animals.slice(pageIndex * rowsPerPage, (pageIndex + 1) * rowsPerPage);
    pageAnimals.forEach((animal, rowIndex) => {
      const y = tableTop - 24 - rowIndex * 24;
      if (rowIndex % 2 === 1) fill(page, 34, y - 7, 774, 24, "0.97 0.96 0.93");
      text(page, truncate(animal.tagNumber, 10), 42, y, 8.5, true);
      text(page, truncate(animal.name || animal.breed || `${animal.species} ${animal.tagNumber}`, 24), 108, y, 8.5);
      text(page, animal.species, 252, y, 8.5);
      text(page, animal.sex, 326, y, 8.5);
      text(page, animal.status, 382, y, 8.5, animal.status !== "Active", animal.status === "Deceased" ? "0.58 0.22 0.20" : INK);
      text(page, truncate(formatPKR(animal.purchasePrice), 17), 460, y, 8.5);
      text(page, animal.currentWeightKg == null ? "-" : `${animal.currentWeightKg} kg`, 570, y, 8.5);
      text(page, truncate(animal.location, 21), 660, y, 8.5);
      line(page, 34, y - 8, 808, y - 8);
    });

    if (pageAnimals.length === 0) {
      text(page, "No animal records are available yet.", 34, 418, 11, false, MUTED);
    }
    text(page, "Private farm record - generated from Livestock Record Manager", 34, 24, 8, false, MUTED);
  }

  const stamp = new Date().toISOString().slice(0, 10);
  savePdf(buildPdf(pages), `livestock-report-${stamp}.pdf`);
}

export function downloadAnimalReport(detail: ReportAnimalDetail, requestedBy: string) {
  const pages: PdfPage[] = [];
  let page: PdfPage = { width: 595, height: 842, commands: [] };
  let y = 0;

  const newPage = () => {
    page = { width: 595, height: 842, commands: [] };
    pages.push(page);
    fill(page, 0, 760, 595, 82, GREEN);
    fill(page, 0, 756, 595, 4, GOLD);
    text(page, "LIVESTOCK RECORD MANAGER", 38, 807, 17, true, "1 1 1");
    text(page, "Complete Animal Record", 38, 784, 10, false, "0.80 0.88 0.85");
    y = 724;
  };

  const ensure = (height = 24) => {
    if (y - height < 45) newPage();
  };

  const section = (titleValue: string) => {
    ensure(44);
    fill(page, 38, y - 7, 519, 27, "0.90 0.92 0.88");
    text(page, titleValue.toUpperCase(), 48, y + 2, 9, true, GREEN);
    y -= 34;
  };

  const item = (labelValue: string, value: unknown) => {
    const lines = wrap(value || "-", 72);
    ensure(24 + Math.max(0, lines.length - 1) * 12);
    text(page, labelValue, 42, y, 8, true, MUTED);
    lines.forEach((entry, index) => text(page, entry, 176, y - index * 12, 9.5));
    y -= Math.max(22, lines.length * 12 + 8);
    line(page, 42, y + 8, 553, y + 8, "0.90 0.89 0.85", 0.5);
  };

  const historyItem = (titleValue: string, dateValue: string, noteValue?: string | null) => {
    const noteLines = noteValue ? wrap(noteValue, 78) : [];
    ensure(35 + noteLines.length * 11);
    text(page, titleValue, 48, y, 9.5, true);
    text(page, dateValue, 438, y, 8, false, MUTED);
    noteLines.forEach((entry, index) => text(page, entry, 48, y - 14 - index * 11, 8.5, false, MUTED));
    y -= 28 + noteLines.length * 11;
    line(page, 42, y + 9, 553, y + 9, "0.90 0.89 0.85", 0.5);
  };

  newPage();
  const { animal } = detail;
  text(page, animal.name || `${animal.species} ${animal.tagNumber}`, 38, y, 21, true, GREEN);
  text(page, `Tag ${animal.tagNumber}  |  ${animal.species}  |  ${animal.status}`, 38, y - 20, 10, false, GOLD);
  text(page, `Generated ${new Date().toLocaleString("en-PK")} by ${requestedBy}`, 38, y - 38, 8, false, MUTED);
  y -= 68;

  section("Identity and purchase profile");
  item("Animal type", `${animal.species} - ${animal.sex}`);
  item("Breed", animal.breed);
  item("Date of birth", formatDate(animal.dateOfBirth));
  item("Color / markings", animal.color);
  item("Farm location", animal.location);
  item("Purchase date", formatDate(animal.purchaseDate));
  item("Purchase price", formatPKR(animal.purchasePrice));
  item("Purchase weight", animal.purchaseWeightKg == null ? "-" : `${animal.purchaseWeightKg} kg`);
  item("Current weight", animal.currentWeightKg == null ? "-" : `${animal.currentWeightKg} kg`);
  item("Seller", [animal.sellerName, animal.sellerPhone].filter(Boolean).join(" - "));
  item("Record source", animal.recordSource);
  item("Notes", animal.notes);

  section("Weight history");
  if (detail.weights.length === 0) historyItem("No weight records", "-");
  detail.weights.forEach((record) => historyItem(`${record.weightKg} kg`, formatDate(record.measuredAt), record.notes));

  section("Health and vaccination");
  if (detail.health.length === 0) historyItem("No health records", "-");
  detail.health.forEach((record) => historyItem(
    `${record.category}: ${record.title}`,
    formatDate(record.eventDate),
    [record.veterinarian, record.nextDueDate ? `Next due ${formatDate(record.nextDueDate)}` : null, record.cost ? formatPKR(record.cost) : null, record.notes].filter(Boolean).join(" - "),
  ));

  section("Expenses and sale");
  if (detail.expenses.length === 0 && detail.sales.length === 0) historyItem("No expense or sale records", "-");
  detail.expenses.forEach((record) => historyItem(`${record.category}: ${formatPKR(record.amount)}`, formatDate(record.expenseDate), record.notes));
  detail.sales.forEach((record) => historyItem(
    `Sold for ${formatPKR(record.salePrice)}`,
    formatDate(record.saleDate),
    [record.buyerName, record.buyerPhone, record.saleWeightKg ? `${record.saleWeightKg} kg` : null, record.notes].filter(Boolean).join(" - "),
  ));

  pages.forEach((currentPage, index) => {
    text(currentPage, `Animal ${animal.tagNumber} - Page ${index + 1} of ${pages.length}`, 38, 24, 8, false, MUTED);
  });
  savePdf(buildPdf(pages), `animal-${clean(animal.tagNumber).replace(/[^a-zA-Z0-9-]/g, "-")}-report.pdf`);
}
