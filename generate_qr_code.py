#!/usr/bin/env python3
"""
Smart Wheelchair QR Code Generator
Generates high-resolution PNG QR codes with big bold title header
and renders an ASCII QR code in terminal console for mobile users.
"""

import sys
import os
import argparse
import qrcode
from PIL import Image, ImageDraw, ImageFont

DEFAULT_SUMMON_URL = "https://ducky.tail0de3ff.ts.net/?mode=summon"
DEFAULT_PORTAL_URL = "https://ducky.tail0de3ff.ts.net"

def generate_qr(url, output_file="wheelchair_summon_qr.png", header_label="WHEELCHAIR SUMMONING PORTAL", box_size=10, border=4):
    print("\n" + "═" * 60)
    print(f"  {header_label}")
    print("═" * 60)
    print(f"  URL: {url}")
    print("─" * 60)
    
    # 1. Print ASCII QR Code to terminal console
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=1,
        border=2,
    )
    qr.add_data(url)
    qr.make(fit=True)
    
    print("\n  Scan QR Code below with your mobile camera:")
    qr.print_ascii(invert=True)
    
    # 2. Generate raw QR code image
    img_qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=box_size,
        border=border,
    )
    img_qr.add_data(url)
    img_qr.make(fit=True)
    
    qr_img = img_qr.make_image(fill_color="black", back_color="white").convert('RGB')
    qr_w, qr_h = qr_img.size

    # Calculate padding for big bold title text above and instructions below
    header_text = header_label.upper()
    padding_top = int(qr_h * 0.22)
    padding_bottom = int(qr_h * 0.12)
    total_w = qr_w
    total_h = qr_h + padding_top + padding_bottom

    canvas = Image.new('RGB', (total_w, total_h), color=(255, 255, 255))
    canvas.paste(qr_img, (0, padding_top))

    draw = ImageDraw.Draw(canvas)

    # Dynamic font sizing proportional to image dimensions
    font_size = max(16, int(qr_h * 0.052))
    sub_font_size = max(12, int(qr_h * 0.034))

    font = None
    sub_font = None
    font_paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf"
    ]
    for fp in font_paths:
        if os.path.exists(fp):
            try:
                font = ImageFont.truetype(fp, font_size)
                sub_font_path = fp.replace("-Bold", "").replace("Bold", "")
                if os.path.exists(sub_font_path):
                    sub_font = ImageFont.truetype(sub_font_path, sub_font_size)
                else:
                    sub_font = ImageFont.truetype(fp, sub_font_size)
                break
            except Exception:
                pass

    if font is None:
        font = ImageFont.load_default()
        sub_font = font

    # Draw centered big bold header text
    try:
        text_bbox = draw.textbbox((0, 0), header_text, font=font)
        text_w = text_bbox[2] - text_bbox[0]
    except AttributeError:
        text_w, _ = draw.textsize(header_text, font=font)
    
    text_x = max(10, (total_w - text_w) // 2)
    text_y = int(padding_top * 0.35)
    draw.text((text_x, text_y), header_text, fill=(15, 23, 42), font=font)

    # Draw centered subtitle text
    sub_text = "Scan to summon autonomous wheelchair"
    try:
        sub_bbox = draw.textbbox((0, 0), sub_text, font=sub_font)
        sub_w = sub_bbox[2] - sub_bbox[0]
    except AttributeError:
        sub_w, _ = draw.textsize(sub_text, font=sub_font)

    sub_x = max(10, (total_w - sub_w) // 2)
    sub_y = total_h - int(padding_bottom * 0.75)
    draw.text((sub_x, sub_y), sub_text, fill=(100, 116, 139), font=sub_font)

    output_path = os.path.abspath(output_file)
    canvas.save(output_path)
    print(f"\n  ✓ PNG with bold header saved to: {output_path} (Size: {total_w}x{total_h} px)")
    print("═" * 60 + "\n")

def main():
    parser = argparse.ArgumentParser(description="Generate QR codes for Smart Wheelchair Tailscale Frontend")
    parser.add_argument("--url", type=str, default=DEFAULT_SUMMON_URL, help="Custom URL for QR code generation")
    parser.add_argument("--out", type=str, default="wheelchair_summon_qr.png", help="Output PNG file path")
    parser.add_argument("--title", type=str, default="WHEELCHAIR SUMMONING PORTAL", help="Big bold header text above QR code")
    parser.add_argument("--box-size", "-s", type=int, default=10, help="Pixel size of each QR box (default: 10)")
    parser.add_argument("--border", "-b", type=int, default=4, help="Border margin size (default: 4)")
    parser.add_argument("--all", action="store_true", help="Generate QR codes for both Summoning Portal and Main Portal")
    args = parser.parse_args()

    if args.all:
        generate_qr(DEFAULT_SUMMON_URL, "wheelchair_summon_qr.png", "WHEELCHAIR SUMMONING PORTAL", args.box_size, args.border)
        generate_qr(DEFAULT_PORTAL_URL, "wheelchair_portal_qr.png", "SMART WHEELCHAIR PORTAL", args.box_size, args.border)
    else:
        generate_qr(args.url, args.out, args.title, args.box_size, args.border)

if __name__ == "__main__":
    main()
