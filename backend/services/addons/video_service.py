"""
GoVisual AI — Addon: Video Animation Service
Generates MP4 reels from static images using moviepy + pillow
"""
import os, io, uuid, tempfile
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np

# moviepy is imported lazily to avoid load-time crash if not installed
OUTPUT_DIR = os.getenv("VIDEO_OUTPUT_DIR", "generated_videos")
os.makedirs(OUTPUT_DIR, exist_ok=True)

FORMAT_SIZES = {
    "9:16":  (1080, 1920),
    "1:1":   (1080, 1080),
    "16:9":  (1920, 1080),
}

DURATIONS = {
    "text-reveal":    15,
    "product-zoom":   15,
    "ken-burns":      30,
    "split-screen":   20,
    "festival-burst": 15,
    "countdown-offer":15,
}

class VideoService:
    def __init__(self):
        self.fps = 24

    def generate_video(
        self,
        image_bytes: bytes,
        main_text: str,
        sub_text: str,
        animation_style: str,
        video_format: str,
        music_id: str,
        output_filename: str | None = None,
    ) -> str:
        """
        Generate an MP4 video. Returns path to the output file.
        Falls back to animated GIF preview if moviepy unavailable.
        """
        try:
            from moviepy.editor import VideoClip, AudioFileClip
            return self._generate_mp4(image_bytes, main_text, sub_text, animation_style, video_format, music_id, output_filename)
        except ImportError:
            return self._generate_gif_fallback(image_bytes, main_text, sub_text, animation_style, video_format, output_filename)

    # ── MP4 path (moviepy available) ─────────────────────────────────────────
    def _generate_mp4(self, image_bytes, main_text, sub_text, style, fmt, music_id, out_fn):
        from moviepy.editor import VideoClip

        w, h      = FORMAT_SIZES.get(fmt, (1080, 1080))
        duration  = DURATIONS.get(style, 15)
        fps       = self.fps
        base_img  = self._load_and_resize(image_bytes, w, h)
        base_arr  = np.array(base_img)

        def make_frame(t: float) -> np.ndarray:
            progress = t / duration  # 0.0 → 1.0
            frame    = base_arr.copy()
            frame    = self._apply_animation(frame, style, progress, t, w, h, main_text, sub_text)
            return frame

        clip = VideoClip(make_frame, duration=duration).set_fps(fps)

        fn   = out_fn or f"{uuid.uuid4().hex}.mp4"
        path = os.path.join(OUTPUT_DIR, fn)

        music_path = self._get_music_path(music_id)
        if music_path and os.path.exists(music_path):
            from moviepy.editor import AudioFileClip
            audio = AudioFileClip(music_path).subclip(0, duration)
            clip  = clip.set_audio(audio)

        clip.write_videofile(path, codec="libx264", audio_codec="aac", logger=None)
        return path

    def _apply_animation(self, frame: np.ndarray, style: str, progress: float, t: float, w: int, h: int, main_text: str, sub_text: str) -> np.ndarray:
        img = Image.fromarray(frame)

        if style == "text-reveal":
            img = self._text_reveal(img, progress, main_text, sub_text, w, h)

        elif style == "product-zoom":
            scale  = 1.0 + progress * 0.15
            new_w  = int(w * scale)
            new_h  = int(h * scale)
            zoomed = img.resize((new_w, new_h), Image.LANCZOS)
            left   = (new_w - w) // 2
            top    = (new_h - h) // 2
            img    = zoomed.crop((left, top, left + w, top + h))
            img    = self._text_reveal(img, min(progress * 3, 1.0), main_text, sub_text, w, h)

        elif style == "ken-burns":
            pan_x  = int(progress * 40)
            pan_y  = int(progress * 20)
            scale  = 1.0 + progress * 0.1
            new_w  = int(w * scale)
            new_h  = int(h * scale)
            scaled = img.resize((new_w, new_h), Image.LANCZOS)
            left   = min(pan_x, new_w - w)
            top    = min(pan_y, new_h - h)
            img    = scaled.crop((left, top, left + w, top + h))

        elif style == "festival-burst":
            img    = self._festival_overlay(img, progress, w, h)
            img    = self._text_reveal(img, progress, main_text, sub_text, w, h)

        elif style == "countdown-offer":
            img    = self._countdown_overlay(img, progress, t, main_text, sub_text, w, h)

        return np.array(img)

    def _text_reveal(self, img: Image.Image, progress: float, main_text: str, sub_text: str, w: int, h: int) -> Image.Image:
        if progress < 0.3:
            return img
        overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        draw    = ImageDraw.Draw(overlay)
        alpha   = min(int((progress - 0.3) / 0.3 * 200), 200)
        slide_y = int((1 - min((progress - 0.3) / 0.3, 1.0)) * 60)

        # Dark gradient strip at bottom
        for y in range(h - 280, h):
            t_alpha = int(180 * (y - (h - 280)) / 280)
            draw.line([(0, y), (w, y)], fill=(0, 0, 0, t_alpha))

        # Main text
        if main_text:
            font_size = max(48, w // 18)
            try:
                font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
            except:
                font = ImageFont.load_default()
            draw.text((w // 2, h - 200 + slide_y), main_text.upper(), font=font, fill=(57, 255, 20, alpha), anchor="mm")

        # Sub text
        if sub_text:
            try:
                sfont = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", max(32, w // 26))
            except:
                sfont = ImageFont.load_default()
            draw.text((w // 2, h - 130 + slide_y), sub_text, font=sfont, fill=(255, 255, 255, alpha), anchor="mm")

        img = img.convert("RGBA")
        img = Image.alpha_composite(img, overlay)
        return img.convert("RGB")

    def _festival_overlay(self, img: Image.Image, progress: float, w: int, h: int) -> Image.Image:
        overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        draw    = ImageDraw.Draw(overlay)
        import random, math
        random.seed(int(progress * 100))
        for _ in range(int(progress * 30)):
            x     = random.randint(0, w)
            y     = random.randint(0, h // 2)
            size  = random.randint(3, 12)
            color = random.choice([(255,215,0), (255,69,0), (57,255,20), (255,255,255)])
            draw.ellipse([x - size, y - size, x + size, y + size], fill=(*color, 200))
        img = img.convert("RGBA")
        return Image.alpha_composite(img, overlay).convert("RGB")

    def _countdown_overlay(self, img: Image.Image, progress: float, t: float, main_text: str, sub_text: str, w: int, h: int) -> Image.Image:
        overlay  = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        draw     = ImageDraw.Draw(overlay)
        duration = DURATIONS["countdown-offer"]
        secs_left = int(duration - t)
        try:
            big_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", w // 6)
            med_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", w // 16)
        except:
            big_font = med_font = ImageFont.load_default()

        draw.ellipse([w//2-120, h//2-120, w//2+120, h//2+120], fill=(0,0,0,180))
        draw.text((w//2, h//2 - 20), str(secs_left), font=big_font, fill=(57,255,20,240), anchor="mm")
        draw.text((w//2, h//2 + 80), "SECONDS LEFT", font=med_font, fill=(255,255,255,200), anchor="mm")
        if main_text:
            draw.text((w//2, h - 200), main_text, font=med_font, fill=(255,215,0,220), anchor="mm")

        img = img.convert("RGBA")
        return Image.alpha_composite(img, overlay).convert("RGB")

    # ── GIF fallback (no moviepy) ─────────────────────────────────────────────
    def _generate_gif_fallback(self, image_bytes, main_text, sub_text, style, fmt, out_fn):
        w, h    = FORMAT_SIZES.get(fmt, (1080, 1080))
        base    = self._load_and_resize(image_bytes, w // 2, h // 2)  # half-res for GIF
        frames  = []
        steps   = 20

        for i in range(steps):
            progress = i / steps
            frame    = base.copy()
            frame    = Image.fromarray(self._apply_animation(np.array(frame), style, progress, progress * 10, w // 2, h // 2, main_text, sub_text))
            frames.append(frame)

        fn   = (out_fn or f"{uuid.uuid4().hex}") + "_preview.gif"
        path = os.path.join(OUTPUT_DIR, fn)
        frames[0].save(path, save_all=True, append_images=frames[1:], duration=150, loop=0)
        return path

    # ── Helpers ───────────────────────────────────────────────────────────────
    def _load_and_resize(self, image_bytes: bytes, w: int, h: int) -> Image.Image:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        return img.resize((w, h), Image.LANCZOS)

    def _get_music_path(self, music_id: str) -> str | None:
        music_dir = os.path.join(os.path.dirname(__file__), "../../assets/music")
        mapping   = {
            "upbeat-hindi":   "upbeat_hindi.mp3",
            "corporate-clean":"corporate_clean.mp3",
            "festive-dhol":   "festive_dhol.mp3",
            "lo-fi-calm":     "lofi_calm.mp3",
        }
        fn = mapping.get(music_id)
        if fn:
            return os.path.join(music_dir, fn)
        return None
