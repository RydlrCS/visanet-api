#!/usr/bin/env python3
"""
PDF Text Extractor for VisaNet User Journey
Extracts text content from PDF files
"""

import sys
from pypdf import PdfReader

def extract_pdf_text(pdf_path):
    """Extract text from PDF file"""
    try:
        reader = PdfReader(pdf_path)
        text_content = []
        
        print(f"PDF Pages: {len(reader.pages)}\n")
        print("="*80)
        
        for page_num, page in enumerate(reader.pages, 1):
            print(f"\n--- PAGE {page_num} ---\n")
            text = page.extract_text()
            text_content.append(text)
            print(text)
            print("\n" + "="*80)
        
        return "\n\n".join(text_content)
    
    except Exception as e:
        print(f"Error extracting PDF: {e}", file=sys.stderr)
        return None

if __name__ == "__main__":
    pdf_path = "VISANET- user journey.pdf"
    text = extract_pdf_text(pdf_path)
    
    if text:
        # Save to file
        with open("VISANET_user_journey_extracted.txt", "w", encoding="utf-8") as f:
            f.write(text)
        print("\n\n✓ Text extracted and saved to VISANET_user_journey_extracted.txt")
