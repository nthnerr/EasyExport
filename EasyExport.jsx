// EasyExport v1.1 - EasyExport.jsx
// Lightweight After Effects panel: render a comp to an intermediate file
// (AVI on Windows, MOV on macOS) using a Lossless template, then convert
// to MP4 via FFmpeg. Save settings next to the script in EasyExport_settings.json.

(function(thisObj) {
  // UI

  var win = thisObj instanceof Panel
    ? thisObj
    : new Window("palette", "EasyExport", undefined, { resizable: true });

  win.orientation = "column";
  win.alignChildren = ["fill", "center"];

  var exportBtn = win.add("button", undefined, "Export");
  exportBtn.size = [130, 30];

  var statusText = win.add(
    "statictext",
    undefined,
    "",
    { multiline: true, wordWrap: true }
  );
  statusText.alignment = "fill";
  statusText.minimumSize.height = 60;

  // persistent settings UI (v1.1)
  var optionsGroup = win.add("group");
  optionsGroup.orientation = "column";
  optionsGroup.alignChildren = ["fill", "top"];

  var deleteIntermediateCheckbox = optionsGroup.add(
    "checkbox",
    undefined,
    "Delete intermediate file after MP4 conversion"
  );
  // default unchecked (false)
  deleteIntermediateCheckbox.value = false;

  // FFmpeg path input and browse
  var ffmpegRow = optionsGroup.add("group");
  ffmpegRow.orientation = "row";
  ffmpegRow.alignChildren = ["left", "center"];
  ffmpegRow.add("statictext", undefined, "FFmpeg Path:");
  var ffmpegPathInput = ffmpegRow.add("edittext", undefined, "");
  ffmpegPathInput.characters = 50;
  var ffmpegBrowseBtn = ffmpegRow.add("button", undefined, "Browse");

  // Settings file location (next to the script). Falls back to current folder.
  function getSettingsFile() {
    var scriptFile = null;
    try {
      scriptFile = new File($.fileName);
    } catch (e) {
      scriptFile = null;
    }
    var folder = scriptFile && scriptFile.exists ? scriptFile.parent : Folder.current;
    return new File(folder.fsName + "/EasyExport_settings.json");
  }

  // Load persisted settings (JSON). Invalid content is ignored.
  function loadSettings() {
    var settingsFile = getSettingsFile();
    if (!settingsFile.exists) return;
    if (!settingsFile.open("r")) return;
    try {
      var content = settingsFile.read();
      var obj = null;
      if (typeof JSON !== 'undefined' && JSON.parse) {
        obj = JSON.parse(content);
      } else {
        obj = eval('(' + content + ')');
      }
      if (obj) {
        if (obj.ffmpegPath) ffmpegPathInput.text = obj.ffmpegPath;
        if (typeof obj.deleteIntermediate !== 'undefined') deleteIntermediateCheckbox.value = !!obj.deleteIntermediate;
      }
    } catch (e) {
      // ignore parse errors and continue with defaults
    } finally {
      settingsFile.close();
    }
  }

  // Save settings (JSON).
  function saveSettings() {
    var settingsFile = getSettingsFile();
    if (!settingsFile.open("w")) return;
    var obj = {
      ffmpegPath: ffmpegPathInput.text || "",
      deleteIntermediate: !!deleteIntermediateCheckbox.value
    };
    try {
      if (typeof JSON !== 'undefined' && JSON.stringify) {
        settingsFile.write(JSON.stringify(obj));
      } else {
        // Basic manual serialization as fallback
        var s = '{"ffmpegPath":"' + obj.ffmpegPath.replace(/\\/g, "\\\\") + '","deleteIntermediate":' + (obj.deleteIntermediate ? 'true' : 'false') + '}';
        settingsFile.write(s);
      }
    } catch (e) {
      // ignore write errors
    } finally {
      settingsFile.close();
    }
  }

  // Browse: pick FFmpeg executable and save.
  ffmpegBrowseBtn.onClick = function() {
    var chosen = File.openDialog("Select FFmpeg executable");
    if (chosen) {
      ffmpegPathInput.text = chosen.fsName;
      saveSettings();
    }
  };

  // Persist when checkbox changes.
  deleteIntermediateCheckbox.onClick = function() {
    saveSettings();
  };

  // Load persisted settings now (if present)
  loadSettings();

  // Attach export handler
  exportBtn.onClick = doExport;

  win.onResizing = win.onResize = function() {
    this.layout.resize();
  };

  win.layout.layout(true);
  if (win instanceof Window) win.show();


  // Helpers

  function setStatus(message) {
    statusText.text = message;
    if (win instanceof Window) {
      win.layout.layout(true);
      win.update();
    }
  }

  // Ensure custom output module template exists (creates if missing)
  function ensureCustomLosslessTemplate() {
      var templateName = "EasyExport_Lossless";

      // Create a small temporary composition to access the host templates.
      var dummyComp = app.project.items.addComp(
          "TEMP_EE_COMP",
          16, 16, 1,
          1 / 30,
          30
      );

      // Add the temporary comp to the render queue so we can access an
      // OutputModule object and its templates collection.
      var rqItem = app.project.renderQueue.items.add(dummyComp);
      var om = rqItem.outputModule(1);

      // Check if our custom template already exists in the host templates.
      var omTemplates = om.templates;
      for (var i = 0; i < omTemplates.length; i++) {
          if (omTemplates[i] === templateName) {
              // Cleanup temporary RQ/comp before returning
              rqItem.remove();
              dummyComp.remove();
              return templateName;
          }
      }

      // Template does not exist — create it by applying the system "Lossless"
      // template and saving it under our custom name.
      // This provides a cross-platform safe baseline for rendering AVI.
      om.applyTemplate("Lossless");

      // Save it as our custom preset
      om.saveAsTemplate(templateName);

      // Cleanup
      rqItem.remove();
      dummyComp.remove();

      return templateName;
  }


  // Main export function

  function doExport() {
    exportBtn.enabled = false;
    setStatus("Starting export... please wait.");

    try {

      var comp = app.project.activeItem;
      if (!comp || !(comp instanceof CompItem)) {
  throw new Error("No composition selected. Please select a composition and try again.");
      }

      var defaultName = comp.name + "_export.mp4";
      var saveFile = File.saveDialog("Select where to save the exported file:", defaultName);
      if (!saveFile) {
        setStatus("Export canceled by user.");
        exportBtn.enabled = true;
        return;
      }

  // Determine intermediate format based on OS: Windows => .avi, macOS => .mov
  var isWindows = $.os.toLowerCase().indexOf('windows') !== -1;
  var intermediateExt = isWindows ? '.avi' : '.mov';

  var baseName = saveFile.fsName.replace(/\.mp4$/i, "");
  var intermediateFile = new File(baseName + intermediateExt);
  var mp4File = new File(baseName + ".mp4");

  // Ensure output preset is available and configure the render-queue item.
  setStatus("Ensuring custom Lossless preset is ready...");
      var templateName = ensureCustomLosslessTemplate();

  // Prepare render queue item
      var rqItem = app.project.renderQueue.items.add(comp);
      var outputModule = rqItem.outputModule(1);

      // Use our safe cross-platform preset
  outputModule.applyTemplate(templateName);
  // Point the render output to the chosen intermediate file
  outputModule.file = intermediateFile;

  // Run render queue to produce intermediate file
  setStatus("Rendering AVI — this may take some time.");
      app.project.renderQueue.render();

      if (!intermediateFile.exists) {
        throw new Error("Rendering failed: intermediate file was not created.");
      }

  // Check FFmpeg availability (PATH check). A custom path may still be used.
  setStatus("Checking for FFmpeg on the system...");
      var ffmpegTest = system.callSystem("ffmpeg -version");
      if (!ffmpegTest || ffmpegTest.indexOf("ffmpeg version") === -1) {
        throw new Error(
          "FFmpeg not found. Please install FFmpeg from https://ffmpeg.org/download.html and ensure 'ffmpeg' is in your system PATH."
        );
      }

  // Convert intermediate to MP4 with FFmpeg (libx264 preset)
  setStatus("Converting AVI to MP4. This may take several minutes.");

  // Use custom FFmpeg path when provided; otherwise rely on 'ffmpeg' in PATH.
  var ffmpegExe = (ffmpegPathInput && ffmpegPathInput.text && ffmpegPathInput.text.length > 0) ? ffmpegPathInput.text : 'ffmpeg';
  // Quote paths for safety
  var ffmpegCmd = '"' + ffmpegExe + '" -y -i "' + intermediateFile.fsName + '" -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart "' + mp4File.fsName + '"';

  var ffmpegOutput = system.callSystem(ffmpegCmd);

      if (mp4File.exists) {
        setStatus("Export complete. MP4 saved at:\n" + mp4File.fsName);
        // If requested by the user, delete the intermediate file
        if (deleteIntermediateCheckbox && deleteIntermediateCheckbox.value) {
          try {
            if (intermediateFile.exists) intermediateFile.remove();
          } catch (e) {
            // Non-fatal: inform in status but do not fail the whole export
            setStatus("Export complete. MP4 saved at:\n" + mp4File.fsName + "\nWarning: could not delete intermediate file: " + e.message);
          }
        }
        // Persist settings in case the user changed the FFmpeg path
        saveSettings();
        alert("Export complete.");
      } else {
        throw new Error("FFmpeg conversion failed. See console output for details:\n" + ffmpegOutput);
      }

    } catch (err) {
      // Present a single clear error dialog and update the status area.
      alert("Error:\n" + (err.message || err));
      setStatus("Error: " + (err.message || err));
    } finally {
      exportBtn.enabled = true;
    }
  }

})(this);
