````markdown
# EasyExport for After Effects

EasyExport is a lightweight After Effects script that automates professional-quality MP4 exports.  
With one click, it renders your composition using a lossless preset and converts it to a high-quality MP4 using FFmpeg — giving you cleaner results than AE’s built-in H.264 exporter.

---

## Installation
1. Clone or download the repository:
   ```bash
   git clone https://github.com/yourusername/EasyExport.git
````

2. Place `EasyExport.jsx` in your After Effects Scripts folder:

   * **Windows:** `Documents/Adobe/After Effects <version>/Scripts/`
   * **macOS:** `~/Library/Application Support/Adobe/After Effects/<version>/Scripts/`
3. (Optional) For a dockable panel, move it into the **ScriptUI Panels** folder.

---

## Usage

1. Open the composition you want to export in After Effects.
2. Run the script:

   ```
   File → Scripts → EasyExport.jsx
   ```
3. Click **Export**, choose a save location, and let the script:

   * Render a lossless AVI/MOV
   * Convert it to MP4 using FFmpeg
4. Your final MP4 will appear in the chosen folder.

---

## How It Works

1. **Render Queue Setup**: Adds the active comp to the Render Queue automatically.
2. **Custom Template Creation**: Builds a lossless preset (`EasyExport_Lossless`) if it doesn’t already exist.
3. **Intermediate Render**: Outputs a high-quality AVI/MOV as a source for encoding.
4. **FFmpeg Conversion**: Encodes the final MP4 using:

   ```
   libx264 · CRF 18 · slow preset · yuv420p · AAC audio · faststart
   ```
5. **Status Updates & Error Handling**: Provides real-time feedback and checks for missing FFmpeg installations.

---

## Example Output

```
myVideo_export.avi   ← lossless intermediate
myVideo_export.mp4   ← final FFmpeg render
```

---

## What's New in v1.0

* One-click automated lossless → MP4 export
* Auto-generated “EasyExport_Lossless” template
* FFmpeg detection and friendly error messages
* Clean UI with live status messages
* Cross-platform support (Windows/macOS)

---

## License

EasyExport is open-source and available under the MIT License.

```
```
