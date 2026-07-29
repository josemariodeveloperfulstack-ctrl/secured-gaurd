from PIL import Image
from pathlib import Path

out = Path(r"c:\dev\secured-guard\backend\src\main\resources\static\certificates\nr06")
out.mkdir(parents=True, exist_ok=True)

ref1 = Image.open(
    r"C:\Users\José Mário Ramos\.cursor\projects\c-dev-secured-guard\assets"
    r"\c__Users_Jos__M_rio_Ramos_AppData_Roaming_Cursor_User_workspaceStorage_"
    r"2a3878465a2c24f5b5d6bf0208c52150_images_image-091aa800-c854-4523-9b57-35dd400464c2.png"
).convert("RGBA")
ref2 = Image.open(
    r"C:\Users\José Mário Ramos\.cursor\projects\c-dev-secured-guard\assets"
    r"\c__Users_Jos__M_rio_Ramos_AppData_Roaming_Cursor_User_workspaceStorage_"
    r"2a3878465a2c24f5b5d6bf0208c52150_images_image-7e0cdff7-c137-480f-88ab-372c7c7ee86f.png"
).convert("RGBA")


def white_to_alpha(img: Image.Image, threshold=232) -> Image.Image:
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            brightness = (r + g + b) / 3
            if brightness >= threshold and max(r, g, b) - min(r, g, b) < 25:
                px[x, y] = (255, 255, 255, 0)
    return img


def black_to_alpha(img: Image.Image, threshold=45) -> Image.Image:
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r <= threshold and g <= threshold and b <= threshold:
                px[x, y] = (0, 0, 0, 0)
    return img


# --- Promover from email asset (black BG) ---
prom = Image.open(
    r"c:\dev\secured-guard\backend\src\main\resources\static\email-marketing\promover-logo.png"
).convert("RGBA")
prom = black_to_alpha(prom, 50)
bbox = prom.getbbox()
if bbox:
    prom = prom.crop(bbox)
# Scale down for PDF embedding
prom.thumbnail((520, 220), Image.Resampling.LANCZOS)
prom.save(out / "promover-logo.png")

# --- Signature: left handwriting from strip y~548-582 ---
# From earlier inspection, handwritten ink sits left of name block
sig_region = ref1.crop((195, 548, 330, 582)).copy()
sig = white_to_alpha(sig_region, 225)
# Remove residual red arrow pixels (high R, low G/B)
px = sig.load()
for y in range(sig.height):
    for x in range(sig.width):
        r, g, b, a = px[x, y]
        if a > 0 and r > 180 and g < 90 and b < 90:
            px[x, y] = (0, 0, 0, 0)
sig.save(out / "assinatura-instrutor.png")

# --- CLINIMED from page 2 ---
cli = white_to_alpha(ref2.crop((800, 695, 995, 755)).copy(), 225)
# remove red arrow remnants
px = cli.load()
for y in range(cli.height):
    for x in range(cli.width):
        r, g, b, a = px[x, y]
        if a > 0 and r > 190 and g < 100 and b < 100:
            px[x, y] = (0, 0, 0, 0)
cli.save(out / "clinimed-logo.png")

for p in sorted(out.glob("*.png")):
    if p.name.startswith("_"):
        p.unlink()
        continue
    im = Image.open(p)
    print(f"{p.name}: {im.size} {im.mode} bbox={im.getbbox()}")
