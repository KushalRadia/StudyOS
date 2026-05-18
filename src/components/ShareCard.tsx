import { useState } from "react";
import { Share2, Download, Loader2, CheckCircle } from "lucide-react";

interface ShareCardProps {
  title: string;        // e.g. "5-Min Explainer Result"
  topic: string;        // e.g. "Photosynthesis"
  content: string[];    // array of bullet points / key lines to include
  accentColor?: string; // hex color for accent, default "#4d41df"
  toolLabel?: string;   // e.g. "Must Know" or "Mastery Score: 78%"
}

export default function ShareCard({ title, topic, content, accentColor = "#4d41df", toolLabel }: ShareCardProps) {
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);

  const generateAndDownload = async () => {
    setGenerating(true);

    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext("2d")!;

    // Background
    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, 1080, 1080);

    // Gradient overlay (top-left corner glow)
    const grd = ctx.createRadialGradient(200, 200, 0, 200, 200, 600);
    grd.addColorStop(0, `${accentColor}40`);
    grd.addColorStop(1, "transparent");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 1080, 1080);

    // Border
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 1078, 1078);

    // Top accent line
    ctx.fillStyle = accentColor;
    ctx.fillRect(60, 60, 120, 4);

    // StudyOS branding
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = "bold 24px system-ui, sans-serif";
    ctx.fillText("StudyOS", 60, 110);

    // Tool label pill
    if (toolLabel) {
      ctx.fillStyle = `${accentColor}25`;
      const pillText = toolLabel.toUpperCase();
      ctx.font = "bold 22px system-ui, sans-serif";
      const pillW = ctx.measureText(pillText).width + 40;
      const pillX = 60;
      const pillY = 135;
      roundRect(ctx, pillX, pillY, pillW, 44, 22);
      ctx.fillStyle = accentColor;
      ctx.fillText(pillText, pillX + 20, pillY + 28);
    }

    // Title (topic)
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 72px system-ui, sans-serif";
    const words = topic.split(" ");
    let line = "";
    let y = toolLabel ? 270 : 220;
    for (const word of words) {
      const testLine = line + word + " ";
      if (ctx.measureText(testLine).width > 960 && line !== "") {
        ctx.fillText(line, 60, y);
        line = word + " ";
        y += 80;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 60, y);
    y += 60;

    // Divider
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fillRect(60, y, 960, 1);
    y += 40;

    // Content bullets
    ctx.font = "400 34px system-ui, sans-serif";
    const maxItems = Math.min(content.length, 6);
    for (let i = 0; i < maxItems; i++) {
      // Bullet dot
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.arc(75, y - 10, 6, 0, Math.PI * 2);
      ctx.fill();

      // Text (truncate if too long)
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      let text = content[i];
      if (ctx.measureText(text).width > 880) {
        while (ctx.measureText(text + "...").width > 880) {
          text = text.slice(0, -1);
        }
        text += "...";
      }
      ctx.fillText(text, 100, y);
      y += 56;
    }

    // Bottom branding
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.font = "500 28px system-ui, sans-serif";
    ctx.fillText("studyos.app · Powered by Gemini AI", 60, 1020);

    // Download
    const link = document.createElement("a");
    link.download = `studyos-${topic.replace(/\\s+/g, "-").toLowerCase()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();

    setGenerating(false);
    setDone(true);
    setTimeout(() => setDone(false), 3000);
  };

  // Helper: rounded rectangle
  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
  }

  return (
    <button
      onClick={generateAndDownload}
      disabled={generating || done}
      className="btn-secondary flex items-center gap-2"
    >
      {generating ? (
        <Loader2 size={16} className="animate-spin" />
      ) : done ? (
        <CheckCircle size={16} className="text-success" />
      ) : (
        <Share2 size={16} />
      )}
      {done ? "Downloaded!" : generating ? "Generating..." : "Share as Image"}
    </button>
  );
}
