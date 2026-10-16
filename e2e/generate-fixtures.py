from pathlib import Path
import re
import textwrap
import zipfile
from xml.sax.saxutils import escape


ROOT = Path(__file__).resolve().parents[1]
SAMPLES = ROOT / "lib" / "samples.ts"
FIXTURES = ROOT / "e2e" / "fixtures"


def sample_resume_text() -> str:
    source = SAMPLES.read_text(encoding="utf-8")
    match = re.search(
        r"export const sampleResumeText = `([\s\S]*?)`;",
        source,
    )
    if not match:
        raise ValueError("Could not find sampleResumeText in lib/samples.ts")
    return match.group(1)


def pdf_escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def write_pdf(text: str, destination: Path) -> None:
    replacements = {
        "\u2014": "-",
        "\u2013": "-",
        "\u2019": "'",
        "\u2018": "'",
        "\u201c": '"',
        "\u201d": '"',
    }
    for source, replacement in replacements.items():
        text = text.replace(source, replacement)
    text = text.encode("ascii", errors="replace").decode("ascii")
    lines = [
        line
        for paragraph in text.splitlines()
        for line in (textwrap.wrap(paragraph, width=94) or [""])
    ]
    commands = ["BT", "/F1 9 Tf", "40 760 Td", "11 TL"]
    commands.extend(f"({pdf_escape(line)}) Tj T*" for line in lines)
    commands.append("ET")
    stream = "\n".join(commands).encode("ascii")

    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Length " + str(len(stream)).encode("ascii") + b" >>\nstream\n"
        + stream
        + b"\nendstream",
    ]
    data = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for index, body in enumerate(objects, start=1):
        offsets.append(len(data))
        data.extend(f"{index} 0 obj\n".encode("ascii"))
        data.extend(body)
        data.extend(b"\nendobj\n")
    xref_offset = len(data)
    data.extend(f"xref\n0 {len(offsets)}\n".encode("ascii"))
    data.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        data.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
    data.extend(
        (
            f"trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\n"
            f"startxref\n{xref_offset}\n%%EOF\n"
        ).encode("ascii")
    )
    destination.write_bytes(data)


def write_docx(text: str, destination: Path) -> None:
    paragraphs = "".join(
        "<w:p><w:r><w:t xml:space=\"preserve\">"
        + escape(line)
        + "</w:t></w:r></w:p>"
        for line in text.splitlines()
    )
    document = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        f"<w:body>{paragraphs}<w:sectPr/></w:body></w:document>"
    )
    content_types = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
        "</Types>"
    )
    relationships = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
        "</Relationships>"
    )
    with zipfile.ZipFile(destination, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", content_types)
        archive.writestr("_rels/.rels", relationships)
        archive.writestr("word/document.xml", document)


def main() -> None:
    FIXTURES.mkdir(parents=True, exist_ok=True)
    text = sample_resume_text()
    write_pdf(text, FIXTURES / "sample-resume.pdf")
    write_docx(text, FIXTURES / "sample-resume.docx")


if __name__ == "__main__":
    main()
