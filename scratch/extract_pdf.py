import os
import sys

pdf_path = r"C:\dev\secured-guard\backend\docs\modelo-contrato-comercial\Minuta contratual Promover Vigilancia e servicos - vig-servicos.pdf"
output_path = r"C:\dev\secured-guard\scratch\extracted_pdf_text.txt"

print(f"Checking for PDF file: {pdf_path}")
if not os.path.exists(pdf_path):
    print("PDF file does not exist!")
    sys.exit(1)

# Try using pypdf
try:
    import pypdf
    print("Using pypdf...")
    reader = pypdf.PdfReader(pdf_path)
    text = ""
    for i, page in enumerate(reader.pages):
        text += f"\n--- PAGE {i+1} ---\n"
        text += page.extract_text() or ""
    
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(text)
    print(f"Successfully extracted text using pypdf to {output_path}")
    sys.exit(0)
except ImportError:
    print("pypdf is not installed.")

# Try using PyPDF2
try:
    import PyPDF2
    print("Using PyPDF2...")
    reader = PyPDF2.PdfReader(pdf_path)
    text = ""
    for i, page in enumerate(reader.pages):
        text += f"\n--- PAGE {i+1} ---\n"
        text += page.extract_text() or ""
    
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(text)
    print(f"Successfully extracted text using PyPDF2 to {output_path}")
    sys.exit(0)
except ImportError:
    print("PyPDF2 is not installed.")

# Try using pdfplumber
try:
    import pdfplumber
    print("Using pdfplumber...")
    with pdfplumber.open(pdf_path) as pdf:
        text = ""
        for i, page in enumerate(pdf.pages):
            text += f"\n--- PAGE {i+1} ---\n"
            text += page.extract_text() or ""
    
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(text)
    print(f"Successfully extracted text using pdfplumber to {output_path}")
    sys.exit(0)
except ImportError:
    print("pdfplumber is not installed.")

# Try using fitz (PyMuPDF)
try:
    import fitz
    print("Using PyMuPDF...")
    doc = fitz.open(pdf_path)
    text = ""
    for i, page in enumerate(doc):
        text += f"\n--- PAGE {i+1} ---\n"
        text += page.get_text() or ""
    
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(text)
    print(f"Successfully extracted text using PyMuPDF to {output_path}")
    sys.exit(0)
except ImportError:
    print("fitz/PyMuPDF is not installed.")

print("No PDF extraction libraries found in python environment. Trying to use pdfbox if possible or printing error.")
