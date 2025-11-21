// v1

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

  // Ensure custom "EasyExport_Lossless" template exists; create from
  // system "Lossless" if missing.
  function ensureCustomLosslessTemplate() {
      var templateName = "EasyExport_Lossless";

      // Temp composition
      var dummyComp = app.project.items.addComp(
          "TEMP_EE_COMP",
          16, 16, 1,
          1 / 30,
          30
      );

      // Add to render queue to access output module templates
      var rqItem = app.project.renderQueue.items.add(dummyComp);
      var om = rqItem.outputModule(1);

      // Check existing templates
      var omTemplates = om.templates;
      for (var i = 0; i < omTemplates.length; i++) {
          if (omTemplates[i] === templateName) {
        // cleanup and return
        rqItem.remove();
        dummyComp.remove();
        return templateName;
          }
      }

      // Create template from system Lossless and save
      om.applyTemplate("Lossless");
      om.saveAsTemplate(templateName);

      // cleanup
      rqItem.remove();
      dummyComp.remove();

      return templateName;
  }


  // Export

  function doExport() {
    exportBtn.enabled = false;
    setStatus("Starting export... chill...");

    try {

      var comp = app.project.activeItem;
      if (!comp || !(comp instanceof CompItem)) {
        throw new Error("No comp selected, dummy. Pick one first.");
      }

      var defaultName = comp.name + "_export.mp4";
      var saveFile = File.saveDialog("Where you wanna save?", defaultName);
      if (!saveFile) {
        setStatus("User bailed. Export aborted.");
        exportBtn.enabled = true;
        return;
      }

      var baseName = saveFile.fsName.replace(/\.mp4$/i, "");
      var aviFile = new File(baseName + ".avi");
      var mp4File = new File(baseName + ".mp4");

  // Template handling
  setStatus("Ensuring custom Lossless preset is ready...");
      var templateName = ensureCustomLosslessTemplate();

  // Render-queue setup
      var rqItem = app.project.renderQueue.items.add(comp);
      var outputModule = rqItem.outputModule(1);

  // Apply our preset
      outputModule.applyTemplate(templateName);
      outputModule.file = aviFile;

  // Render AVI
  setStatus("Rendering AVI... grab a coffee.");
      app.project.renderQueue.render();

      if (!aviFile.exists) {
        throw new Error("No AVI file? Something broke. Panic!");
      }

  // Check ffmpeg
  setStatus("Checking if FFmpeg's chillin' on your machine...");
      var ffmpegTest = system.callSystem("ffmpeg -version");
      if (!ffmpegTest || ffmpegTest.indexOf("ffmpeg version") === -1) {
        throw new Error(
          "FFmpeg missing! Get it here: https://ffmpeg.org/download.html\n" +
          "And put 'ffmpeg' in your PATH or this won't work."
        );
      }

  // Convert to MP4
  setStatus("Converting AVI to MP4, magic happening now...");

      var ffmpegCmd =
        'ffmpeg -y -i "' +
        aviFile.fsName +
        '" -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart "' +
        mp4File.fsName +
        '"';

      var ffmpegOutput = system.callSystem(ffmpegCmd);

      if (mp4File.exists) {
        setStatus("Done! MP4's chillin' here:\n" + mp4File.fsName);
        alert("Export done! Go enjoy your video.");
      } else {
        throw new Error("FFmpeg conversion failed. Check console for drama:\n" + ffmpegOutput);
      }

    } catch (err) {
      alert("Oopsie:\n" + (err.message || err));
      setStatus("Error happened: " + (err.message || err));
    } finally {
      exportBtn.enabled = true;
    }
  }

})(this);
