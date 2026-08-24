(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));

  const core = {
    source: $("#sourceCanvas"),
    height: $("#heightCanvas"),
    normal: $("#normalCanvas"),
    relief: $("#reliefCanvas"),
    fileInput: $("#normalFileInput"),
    heightChannel: $("#heightChannel"),
    edgeMode: $("#edgeMode"),
    blackPoint: $("#blackPoint"),
    whitePoint: $("#whitePoint"),
    contrast: $("#heightContrast"),
    gamma: $("#heightGamma"),
    invertHeight: $("#invertHeight"),
    strength: $("#normalStrength"),
    blur: $("#heightBlur"),
    sampleRadius: $("#sampleRadius"),
    flipX: $("#flipX"),
    flipY: $("#flipY"),
    exportResolution: $("#exportResolution"),
  };

  const els = {
    undo: $("#advancedUndo"),
    redo: $("#advancedRedo"),
    saveA: $("#saveSnapshotA"),
    applyA: $("#applySnapshotA"),
    saveB: $("#saveSnapshotB"),
    applyB: $("#applySnapshotB"),
    zoom: $("#globalPreviewZoom"),

    canvas3d: $("#normal3dCanvas"),
    wrap3d: $("#normal3dWrap"),
    placeholder3d: $("#normal3dPlaceholder"),
    shape3d: $("#preview3dShape"),
    base3d: $("#preview3dBase"),
    rotate3d: $("#preview3dRotate"),
    reset3d: $("#reset3dView"),

    compareBase: $("#compareBaseCanvas"),
    compareEffect: $("#compareEffectCanvas"),
    compareOverlay: $("#compareOverlay"),
    compareDivider: $("#compareDivider"),
    compareSplit: $("#compareSplit"),
    compareValue: $("#compareSplitValue"),

    channelCards: $$(".normal-channel-card"),

    syncHeight: $("#syncHeightFromCore"),
    externalHeight: $("#externalHeightInput"),
    clearHeight: $("#clearHeightEdits"),
    heightEditCanvas: $("#heightEditCanvas"),
    heightEditWrap: $("#heightEditWrap"),
    heightEditPlaceholder: $("#heightEditPlaceholder"),
    brushCursor: $("#normalBrushCursor"),
    brushButtons: $$("[data-height-brush]"),
    brushSize: $("#heightBrushSize"),
    brushSizeValue: $("#heightBrushSizeValue"),
    brushPower: $("#heightBrushPower"),
    brushPowerValue: $("#heightBrushPowerValue"),

    multiscale: $("#multiscaleEnabled"),
    macro: $("#macroDetail"),
    macroValue: $("#macroDetailValue"),
    medium: $("#mediumDetail"),
    mediumValue: $("#mediumDetailValue"),
    micro: $("#microDetail"),
    microValue: $("#microDetailValue"),

    seamFix: $("#seamFixEnabled"),
    seamWidth: $("#seamFixWidth"),
    seamWidthValue: $("#seamFixWidthValue"),
    seamStrength: $("#seamFixStrength"),
    seamStrengthValue: $("#seamFixStrengthValue"),

    generateAdvanced: $("#generateAdvancedNormal"),
    detailInput: $("#detailNormalInput"),
    detailStrength: $("#detailNormalStrength"),
    detailStrengthValue: $("#detailNormalStrengthValue"),
    blendMode: $("#normalBlendMode"),
    detailFlipY: $("#detailFlipY"),
    advancedCanvas: $("#advancedNormalCanvas"),
    advancedPlaceholder: $("#advancedNormalPlaceholder"),
    combinedCanvas: $("#combinedNormalCanvas"),
    combinedPlaceholder: $("#combinedNormalPlaceholder"),
    downloadCombined: $("#downloadCombinedNormal"),

    tileSource: $("#tilePreviewSource"),
    tileCount: $("#tilePreviewCount"),
    tileCanvas: $("#tilePreviewCanvas"),
    tilePlaceholder: $("#tilePreviewPlaceholder"),

    techSource: $("#techSourceSize"),
    techPreview: $("#techPreviewSize"),
    techExport: $("#techExportSize"),
    techMemory: $("#techMemory"),
    techRange: $("#techHeightRange"),
    techStrength: $("#techStrength"),
    techWarning: $("#techWarning"),

    importProfile: $("#unityImportProfile"),
    importSettings: $("#unityImportSettings"),
    copySettings: $("#copyUnitySettings"),

    batchInput: $("#batchNormalInput"),
    batchSummary: $("#batchFileSummary"),
    batchMax: $("#batchMaxSize"),
    batchRun: $("#runBatchNormal"),
    batchProgress: $("#batchProgress"),
    batchProgressText: $("#batchProgressText"),
    batchProgressValue: $("#batchProgressValue"),
    batchProgressBar: $("#batchProgressBar"),
  };

  const editCtx = els.heightEditCanvas.getContext("2d", { willReadFrequently: true });
  const advancedCtx = els.advancedCanvas.getContext("2d", { willReadFrequently: true });
  const combinedCtx = els.combinedCanvas.getContext("2d", { willReadFrequently: true });
  const compareBaseCtx = els.compareBase.getContext("2d");
  const compareEffectCtx = els.compareEffect.getContext("2d");
  const tileCtx = els.tileCanvas.getContext("2d");

  let heightEdit = null;
  let heightBase = null;
  let heightWidth = 0;
  let heightHeight = 0;
  let brushMode = "raise";
  let painting = false;
  let detailNormalImage = null;
  let advancedNormalReady = false;
  let snapshotA = null;
  let snapshotB = null;
  let history = [];
  let redoHistory = [];
  let applyingHistory = false;
  let batchFiles = [];

  // =========================================================
  // Utilidades generales
  // =========================================================

  function canvasHasContent(canvas) {
    if (!canvas || !canvas.width || !canvas.height) return false;
    try {
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      const sample = ctx.getImageData(
        Math.max(0, Math.floor(canvas.width / 2)),
        Math.max(0, Math.floor(canvas.height / 2)),
        1,
        1
      ).data;
      return sample[3] > 0 || sample[0] > 0 || sample[1] > 0 || sample[2] > 0;
    } catch (_) {
      return false;
    }
  }

  function setCanvasSize(canvas, width, height) {
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes)) return "—";
    const units = ["B", "KB", "MB", "GB"];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit += 1;
    }
    return `${value.toFixed(unit ? 2 : 0)} ${units[unit]}`;
  }

  function currentCoreConfig() {
    return {
      heightChannel: core.heightChannel?.value,
      edgeMode: core.edgeMode?.value,
      blackPoint: Number(core.blackPoint?.value || 0),
      whitePoint: Number(core.whitePoint?.value || 100),
      contrast: Number(core.contrast?.value || 110),
      gamma: Number(core.gamma?.value || 100),
      invertHeight: Boolean(core.invertHeight?.checked),
      strength: Number(core.strength?.value || 220),
      blur: Number(core.blur?.value || 0),
      sampleRadius: Number(core.sampleRadius?.value || 1),
      flipX: Boolean(core.flipX?.checked),
      flipY: Boolean(core.flipY?.checked),
    };
  }

  function advancedConfig() {
    return {
      multiscale: els.multiscale.checked,
      macro: Number(els.macro.value),
      medium: Number(els.medium.value),
      micro: Number(els.micro.value),
      seamFix: els.seamFix.checked,
      seamWidth: Number(els.seamWidth.value),
      seamStrength: Number(els.seamStrength.value),
      detailStrength: Number(els.detailStrength.value),
      blendMode: els.blendMode.value,
      detailFlipY: els.detailFlipY.checked,
    };
  }

  function applyCoreConfig(config) {
    const mapping = {
      heightChannel: core.heightChannel,
      edgeMode: core.edgeMode,
      blackPoint: core.blackPoint,
      whitePoint: core.whitePoint,
      contrast: core.contrast,
      gamma: core.gamma,
      strength: core.strength,
      blur: core.blur,
      sampleRadius: core.sampleRadius,
    };

    Object.entries(mapping).forEach(([key, input]) => {
      if (input && config[key] !== undefined) input.value = config[key];
    });

    if (core.invertHeight && config.invertHeight !== undefined) core.invertHeight.checked = config.invertHeight;
    if (core.flipX && config.flipX !== undefined) core.flipX.checked = config.flipX;
    if (core.flipY && config.flipY !== undefined) core.flipY.checked = config.flipY;

    Object.values(mapping).forEach((input) => {
      input?.dispatchEvent(new Event("input", { bubbles: true }));
      input?.dispatchEvent(new Event("change", { bubbles: true }));
    });
    [core.invertHeight, core.flipX, core.flipY].forEach((input) => {
      input?.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  function applyAdvancedConfig(config) {
    if (!config) return;
    const valueMap = [
      [els.macro, config.macro],
      [els.medium, config.medium],
      [els.micro, config.micro],
      [els.seamWidth, config.seamWidth],
      [els.seamStrength, config.seamStrength],
      [els.detailStrength, config.detailStrength],
      [els.blendMode, config.blendMode],
    ];

    valueMap.forEach(([input, value]) => {
      if (value !== undefined) input.value = value;
    });

    if (config.multiscale !== undefined) els.multiscale.checked = config.multiscale;
    if (config.seamFix !== undefined) els.seamFix.checked = config.seamFix;
    if (config.detailFlipY !== undefined) els.detailFlipY.checked = config.detailFlipY;
    updateAdvancedLabels();
  }

  function captureSnapshot() {
    return {
      core: currentCoreConfig(),
      advanced: advancedConfig(),
      height: heightEdit ? heightEdit.slice() : null,
      heightBase: heightBase ? heightBase.slice() : null,
      width: heightWidth,
      heightPx: heightHeight,
    };
  }

  function applySnapshot(snapshot) {
    if (!snapshot) return;
    applyingHistory = true;
    applyCoreConfig(snapshot.core);
    applyAdvancedConfig(snapshot.advanced);

    heightWidth = snapshot.width || 0;
    heightHeight = snapshot.heightPx || 0;
    heightEdit = snapshot.height ? snapshot.height.slice() : null;
    heightBase = snapshot.heightBase ? snapshot.heightBase.slice() : null;

    if (heightEdit && heightWidth && heightHeight) {
      setCanvasSize(els.heightEditCanvas, heightWidth, heightHeight);
      drawHeightArray(heightEdit, els.heightEditCanvas, editCtx);
      els.heightEditPlaceholder.hidden = true;
      els.generateAdvanced.disabled = false;
      els.clearHeight.disabled = false;
    }

    setTimeout(() => {
      applyingHistory = false;
      scheduleSync();
      updateHistoryButtons();
    }, 40);
  }

  function pushHistory() {
    if (applyingHistory) return;
    const snap = captureSnapshot();
    history.push(snap);
    if (history.length > 15) history.shift();
    redoHistory = [];
    updateHistoryButtons();
  }

  function updateHistoryButtons() {
    els.undo.disabled = history.length <= 1;
    els.redo.disabled = redoHistory.length === 0;
  }

  // =========================================================
  // Copias y sincronización con el CORE
  // =========================================================

  let syncQueued = false;

  function scheduleSync() {
    if (syncQueued) return;
    syncQueued = true;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      syncQueued = false;
      syncFromCore();
    }));
  }

  function syncFromCore() {
    syncCompare();
    renderChannelPreviews();
    updateTechInfo();
    renderTilePreview();
    refreshCombinedNormal();
    webglPreview.requestTextureRefresh();
    update3dPlaceholder();
  }

  function syncCompare() {
    if (!canvasHasContent(core.source)) return;

    const width = core.source.width;
    const height = core.source.height;
    setCanvasSize(els.compareBase, width, height);
    setCanvasSize(els.compareEffect, width, height);

    compareBaseCtx.clearRect(0, 0, width, height);
    compareBaseCtx.drawImage(core.source, 0, 0);

    compareEffectCtx.clearRect(0, 0, width, height);
    if (canvasHasContent(core.relief)) {
      compareEffectCtx.drawImage(core.relief, 0, 0, width, height);
    } else {
      compareEffectCtx.drawImage(core.source, 0, 0, width, height);
    }
  }

  function updateCompareSplit() {
    const value = Number(els.compareSplit.value);
    els.compareOverlay.style.clipPath = `inset(0 0 0 ${value}%)`;
    els.compareDivider.style.left = `${value}%`;
    els.compareValue.textContent = `${value}%`;
  }

  function channelValue(r, g, b, a, mode) {
    switch (mode) {
      case "red": return r;
      case "green": return g;
      case "blue": return b;
      case "alpha": return a;
      case "average": return (r + g + b) / 3;
      case "luminance":
      default:
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
  }

  function renderChannelPreviews() {
    if (!canvasHasContent(core.source)) return;

    const srcCtx = core.source.getContext("2d", { willReadFrequently: true });
    const src = srcCtx.getImageData(0, 0, core.source.width, core.source.height);
    const modes = ["luminance", "red", "green", "blue", "alpha", "average"];

    els.channelCards.forEach((card, index) => {
      const canvas = card.querySelector("canvas");
      const ctx = canvas.getContext("2d");
      const temp = document.createElement("canvas");
      temp.width = canvas.width;
      temp.height = canvas.height;
      const tctx = temp.getContext("2d", { willReadFrequently: true });
      tctx.drawImage(core.source, 0, 0, temp.width, temp.height);
      const data = tctx.getImageData(0, 0, temp.width, temp.height);
      const mode = modes[index];

      for (let i = 0; i < data.data.length; i += 4) {
        const v = Math.round(channelValue(
          data.data[i],
          data.data[i + 1],
          data.data[i + 2],
          data.data[i + 3],
          mode
        ));
        data.data[i] = v;
        data.data[i + 1] = v;
        data.data[i + 2] = v;
        data.data[i + 3] = 255;
      }

      tctx.putImageData(data, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(temp, 0, 0);

      card.classList.toggle("active", core.heightChannel?.value === mode);
    });
  }

  // =========================================================
  // Height Lab + pintura
  // =========================================================

  function imageDataToHeight(imageData) {
    const out = new Float32Array(imageData.width * imageData.height);
    for (let p = 0, i = 0; p < out.length; p += 1, i += 4) {
      out[p] = (
        imageData.data[i] * 0.2126 +
        imageData.data[i + 1] * 0.7152 +
        imageData.data[i + 2] * 0.0722
      ) / 255;
    }
    return out;
  }

  function drawHeightArray(array, canvas, ctx) {
    if (!array || !canvas.width || !canvas.height) return;
    const img = new ImageData(canvas.width, canvas.height);

    for (let p = 0; p < array.length; p += 1) {
      const v = Math.round(clamp(array[p]) * 255);
      const i = p * 4;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }

    ctx.putImageData(img, 0, 0);
  }

  function copyCoreHeight() {
    if (!canvasHasContent(core.height)) return;

    heightWidth = core.height.width;
    heightHeight = core.height.height;
    setCanvasSize(els.heightEditCanvas, heightWidth, heightHeight);

    const ctx = core.height.getContext("2d", { willReadFrequently: true });
    const data = ctx.getImageData(0, 0, heightWidth, heightHeight);

    heightBase = imageDataToHeight(data);
    heightEdit = heightBase.slice();

    drawHeightArray(heightEdit, els.heightEditCanvas, editCtx);
    els.heightEditPlaceholder.hidden = true;
    els.generateAdvanced.disabled = false;
    els.clearHeight.disabled = false;
    pushHistory();
    updateTechInfo();
  }

  function loadExternalHeight(file) {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const scale = Math.min(1, 720 / Math.max(image.naturalWidth, image.naturalHeight));
      heightWidth = Math.max(1, Math.round(image.naturalWidth * scale));
      heightHeight = Math.max(1, Math.round(image.naturalHeight * scale));

      setCanvasSize(els.heightEditCanvas, heightWidth, heightHeight);
      editCtx.clearRect(0, 0, heightWidth, heightHeight);
      editCtx.drawImage(image, 0, 0, heightWidth, heightHeight);

      const data = editCtx.getImageData(0, 0, heightWidth, heightHeight);
      heightBase = imageDataToHeight(data);
      heightEdit = heightBase.slice();

      drawHeightArray(heightEdit, els.heightEditCanvas, editCtx);
      els.heightEditPlaceholder.hidden = true;
      els.generateAdvanced.disabled = false;
      els.clearHeight.disabled = false;
      URL.revokeObjectURL(url);
      pushHistory();
      updateTechInfo();
    };

    image.onerror = () => URL.revokeObjectURL(url);
    image.src = url;
  }

  function clearHeightEdits() {
    if (!heightBase) return;
    heightEdit = heightBase.slice();
    drawHeightArray(heightEdit, els.heightEditCanvas, editCtx);
    advancedNormalReady = false;
    els.advancedPlaceholder.hidden = false;
    pushHistory();
    refreshCombinedNormal();
  }

  function pointerToHeightCanvas(event) {
    const rect = els.heightEditCanvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / rect.width * heightWidth,
      y: (event.clientY - rect.top) / rect.height * heightHeight,
      sx: rect.width / heightWidth,
      sy: rect.height / heightHeight,
    };
  }

  function paintHeight(event) {
    if (!heightEdit) return;

    const { x, y } = pointerToHeightCanvas(event);
    const radius = Number(els.brushSize.value);
    const power = Number(els.brushPower.value) / 100 * 0.075;
    const minX = Math.max(0, Math.floor(x - radius));
    const maxX = Math.min(heightWidth - 1, Math.ceil(x + radius));
    const minY = Math.max(0, Math.floor(y - radius));
    const maxY = Math.min(heightHeight - 1, Math.ceil(y + radius));

    const copy = brushMode === "smooth" ? heightEdit.slice() : null;

    for (let py = minY; py <= maxY; py += 1) {
      for (let px = minX; px <= maxX; px += 1) {
        const dx = px - x;
        const dy = py - y;
        const dist = Math.hypot(dx, dy);
        if (dist > radius) continue;

        const falloff = Math.pow(1 - dist / radius, 1.7);
        const idx = py * heightWidth + px;

        if (brushMode === "raise") {
          heightEdit[idx] = clamp(heightEdit[idx] + power * falloff);
        } else if (brushMode === "lower") {
          heightEdit[idx] = clamp(heightEdit[idx] - power * falloff);
        } else if (brushMode === "erase" && heightBase) {
          heightEdit[idx] += (heightBase[idx] - heightEdit[idx]) * clamp(power * 5 * falloff);
        } else if (brushMode === "smooth" && copy) {
          let sum = 0;
          let count = 0;
          for (let oy = -1; oy <= 1; oy += 1) {
            for (let ox = -1; ox <= 1; ox += 1) {
              const sx = Math.min(heightWidth - 1, Math.max(0, px + ox));
              const sy = Math.min(heightHeight - 1, Math.max(0, py + oy));
              sum += copy[sy * heightWidth + sx];
              count += 1;
            }
          }
          const avg = sum / count;
          heightEdit[idx] += (avg - heightEdit[idx]) * clamp(power * 7 * falloff);
        }
      }
    }

    drawHeightArray(heightEdit, els.heightEditCanvas, editCtx);
  }

  function updateBrushCursor(event) {
    if (!heightEdit) return;
    const rect = els.heightEditWrap.getBoundingClientRect();
    const radius = Number(els.brushSize.value);
    const scaleX = rect.width / heightWidth;
    const scaleY = rect.height / heightHeight;
    const diameter = radius * 2 * Math.min(scaleX, scaleY);

    els.brushCursor.hidden = false;
    els.brushCursor.style.left = `${event.clientX - rect.left}px`;
    els.brushCursor.style.top = `${event.clientY - rect.top}px`;
    els.brushCursor.style.width = `${diameter}px`;
    els.brushCursor.style.height = `${diameter}px`;
  }

  // =========================================================
  // Procesamiento avanzado
  // =========================================================

  function boxBlur(src, width, height, radius) {
    radius = Math.max(0, Math.floor(radius));
    if (!radius) return src.slice();

    const temp = new Float32Array(src.length);
    const out = new Float32Array(src.length);
    const d = radius * 2 + 1;
    const cx = (x) => Math.min(width - 1, Math.max(0, x));
    const cy = (y) => Math.min(height - 1, Math.max(0, y));

    for (let y = 0; y < height; y += 1) {
      let sum = 0;
      for (let k = -radius; k <= radius; k += 1) sum += src[y * width + cx(k)];

      for (let x = 0; x < width; x += 1) {
        temp[y * width + x] = sum / d;
        sum += src[y * width + cx(x + radius + 1)] - src[y * width + cx(x - radius)];
      }
    }

    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      for (let k = -radius; k <= radius; k += 1) sum += temp[cy(k) * width + x];

      for (let y = 0; y < height; y += 1) {
        out[y * width + x] = sum / d;
        sum += temp[cy(y + radius + 1) * width + x] - temp[cy(y - radius) * width + x];
      }
    }

    return out;
  }

  function applyMultiscale(src, width, height) {
    if (!els.multiscale.checked) return src.slice();

    const small = boxBlur(src, width, height, 1);
    const large = boxBlur(src, width, height, Math.max(2, Math.round(Math.min(width, height) / 120)));

    const macroGain = Number(els.macro.value) / 100;
    const mediumGain = Number(els.medium.value) / 100;
    const microGain = Number(els.micro.value) / 100;

    const out = new Float32Array(src.length);

    for (let i = 0; i < src.length; i += 1) {
      const macro = large[i] - 0.5;
      const medium = small[i] - large[i];
      const micro = src[i] - small[i];
      out[i] = clamp(0.5 + macro * macroGain + medium * mediumGain + micro * microGain);
    }

    return out;
  }

  function applySeamFix(src, width, height) {
    if (!els.seamFix.checked) return src.slice();

    const out = src.slice();
    const edgeX = Math.max(1, Math.round(width * Number(els.seamWidth.value) / 100));
    const edgeY = Math.max(1, Math.round(height * Number(els.seamWidth.value) / 100));
    const strength = Number(els.seamStrength.value) / 100;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < edgeX; x += 1) {
        const a = y * width + x;
        const b = y * width + (width - 1 - x);
        const avg = (src[a] + src[b]) * 0.5;
        const fade = (1 - x / edgeX) * strength;
        out[a] = out[a] * (1 - fade) + avg * fade;
        out[b] = out[b] * (1 - fade) + avg * fade;
      }
    }

    for (let y = 0; y < edgeY; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const a = y * width + x;
        const b = (height - 1 - y) * width + x;
        const avg = (out[a] + out[b]) * 0.5;
        const fade = (1 - y / edgeY) * strength;
        out[a] = out[a] * (1 - fade) + avg * fade;
        out[b] = out[b] * (1 - fade) + avg * fade;
      }
    }

    return out;
  }

  function normalFromHeight(height, width, heightPx, strength, flipX, flipY, edgeMode, sampleRadius) {
    const img = new ImageData(width, heightPx);
    const step = Math.max(1, Math.round(sampleRadius));
    const wrap = edgeMode === "wrap";

    const coord = (v, max) => {
      if (wrap) {
        v %= max;
        if (v < 0) v += max;
        return v;
      }
      return Math.min(max - 1, Math.max(0, v));
    };

    const s = (x, y) => height[coord(y, heightPx) * width + coord(x, width)];

    for (let y = 0; y < heightPx; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const tl = s(x - step, y - step);
        const tc = s(x, y - step);
        const tr = s(x + step, y - step);
        const ml = s(x - step, y);
        const mr = s(x + step, y);
        const bl = s(x - step, y + step);
        const bc = s(x, y + step);
        const br = s(x + step, y + step);

        const sx = (tr + 2 * mr + br) - (tl + 2 * ml + bl);
        const sy = (bl + 2 * bc + br) - (tl + 2 * tc + tr);

        let nx = -sx * strength;
        let ny = -sy * strength;
        let nz = 1;

        if (flipX) nx *= -1;
        if (flipY) ny *= -1;

        const len = Math.hypot(nx, ny, nz) || 1;
        nx /= len; ny /= len; nz /= len;

        const i = (y * width + x) * 4;
        img.data[i] = Math.round((nx * 0.5 + 0.5) * 255);
        img.data[i + 1] = Math.round((ny * 0.5 + 0.5) * 255);
        img.data[i + 2] = Math.round((nz * 0.5 + 0.5) * 255);
        img.data[i + 3] = 255;
      }
    }

    return img;
  }

  function generateAdvancedNormal() {
    if (!heightEdit) return;

    let processed = applyMultiscale(heightEdit, heightWidth, heightHeight);
    processed = applySeamFix(processed, heightWidth, heightHeight);

    const config = currentCoreConfig();
    const normal = normalFromHeight(
      processed,
      heightWidth,
      heightHeight,
      config.strength / 100,
      config.flipX,
      config.flipY,
      config.edgeMode,
      config.sampleRadius
    );

    setCanvasSize(els.advancedCanvas, heightWidth, heightHeight);
    advancedCtx.putImageData(normal, 0, 0);
    els.advancedPlaceholder.hidden = true;
    advancedNormalReady = true;

    refreshCombinedNormal();
    renderTilePreview();
    webglPreview.requestTextureRefresh();
  }

  // =========================================================
  // Normal Mixer
  // =========================================================

  function loadDetailNormal(file) {
    if (!file || !file.type.startsWith("image/")) return;

    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      detailNormalImage = image;
      URL.revokeObjectURL(url);
      refreshCombinedNormal();
    };

    image.onerror = () => URL.revokeObjectURL(url);
    image.src = url;
  }

  function decodeNormal(data, i, flipY) {
    let x = data[i] / 255 * 2 - 1;
    let y = data[i + 1] / 255 * 2 - 1;
    let z = data[i + 2] / 255 * 2 - 1;
    if (flipY) y *= -1;
    const len = Math.hypot(x, y, z) || 1;
    return [x / len, y / len, z / len];
  }

  function encodeNormal(target, i, n) {
    const len = Math.hypot(n[0], n[1], n[2]) || 1;
    target[i] = Math.round((n[0] / len * 0.5 + 0.5) * 255);
    target[i + 1] = Math.round((n[1] / len * 0.5 + 0.5) * 255);
    target[i + 2] = Math.round((n[2] / len * 0.5 + 0.5) * 255);
    target[i + 3] = 255;
  }

  function combineNormals(baseData, detailData, strength, mode, flipY) {
    const out = new ImageData(baseData.width, baseData.height);
    const s = strength;

    for (let i = 0; i < baseData.data.length; i += 4) {
      const n1 = decodeNormal(baseData.data, i, false);
      const raw2 = decodeNormal(detailData.data, i, flipY);
      const n2 = [raw2[0] * s, raw2[1] * s, Math.max(0.001, raw2[2])];

      let n;

      if (mode === "whiteout") {
        n = [
          n1[0] + n2[0],
          n1[1] + n2[1],
          n1[2] * n2[2]
        ];
      } else if (mode === "linear") {
        n = [
          n1[0] + n2[0],
          n1[1] + n2[1],
          n1[2] + (n2[2] - 1)
        ];
      } else {
        // Reoriented Normal Mapping, aproximación estable para tangent-space normals.
        const t = [n1[0], n1[1], n1[2] + 1];
        const u = [-n2[0], -n2[1], n2[2]];
        const dot = t[0] * u[0] + t[1] * u[1] + t[2] * u[2];
        n = [
          t[0] * dot - u[0] * t[2],
          t[1] * dot - u[1] * t[2],
          t[2] * dot - u[2] * t[2],
        ];
      }

      encodeNormal(out.data, i, n);
    }

    return out;
  }

  function baseNormalCanvas() {
    if (advancedNormalReady && canvasHasContent(els.advancedCanvas)) return els.advancedCanvas;
    return core.normal;
  }

  function refreshCombinedNormal() {
    const base = baseNormalCanvas();
    if (!canvasHasContent(base)) return;

    setCanvasSize(els.combinedCanvas, base.width, base.height);

    const baseCtx = base.getContext("2d", { willReadFrequently: true });
    const baseData = baseCtx.getImageData(0, 0, base.width, base.height);

    if (!detailNormalImage) {
      combinedCtx.putImageData(baseData, 0, 0);
    } else {
      const detailCanvas = document.createElement("canvas");
      detailCanvas.width = base.width;
      detailCanvas.height = base.height;
      const dctx = detailCanvas.getContext("2d", { willReadFrequently: true });
      dctx.drawImage(detailNormalImage, 0, 0, base.width, base.height);
      const detailData = dctx.getImageData(0, 0, base.width, base.height);

      const mixed = combineNormals(
        baseData,
        detailData,
        Number(els.detailStrength.value) / 100,
        els.blendMode.value,
        els.detailFlipY.checked
      );

      combinedCtx.putImageData(mixed, 0, 0);
    }

    els.combinedPlaceholder.hidden = true;
    els.downloadCombined.disabled = false;
    renderTilePreview();
    webglPreview.requestTextureRefresh();
  }

  // =========================================================
  // Tile Preview
  // =========================================================

  function tileSourceCanvas() {
    const mode = els.tileSource.value;
    if (mode === "source") return core.source;
    if (mode === "height") return core.height;
    if (mode === "normal") return core.normal;
    if (mode === "combined" && canvasHasContent(els.combinedCanvas)) return els.combinedCanvas;
    return core.normal;
  }

  function renderTilePreview() {
    const src = tileSourceCanvas();
    if (!canvasHasContent(src)) return;

    const count = Number(els.tileCount.value);
    const width = els.tileCanvas.width;
    const height = els.tileCanvas.height;
    const cellW = width / count;
    const cellH = height / count;

    tileCtx.clearRect(0, 0, width, height);

    for (let y = 0; y < count; y += 1) {
      for (let x = 0; x < count; x += 1) {
        tileCtx.drawImage(src, x * cellW, y * cellH, cellW, cellH);
      }
    }

    els.tilePlaceholder.hidden = true;
  }

  // =========================================================
  // Technical info + Unity presets
  // =========================================================

  function getExportDimensions() {
    if (!canvasHasContent(core.source)) return null;

    const originalW = Number($("#normalFileDimensions")?.textContent?.split("×")[0]?.trim()) || core.source.width;
    const originalH = Number($("#normalFileDimensions")?.textContent?.split("×")[1]?.trim()) || core.source.height;
    const target = core.exportResolution?.value || "original";

    if (target === "original") return { width: originalW, height: originalH };

    const maxSide = Number(target);
    const scale = Math.min(1, maxSide / Math.max(originalW, originalH));

    return {
      width: Math.max(1, Math.round(originalW * scale)),
      height: Math.max(1, Math.round(originalH * scale))
    };
  }

  function heightRangeFromCanvas(canvas) {
    if (!canvasHasContent(canvas)) return null;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let min = 255;
    let max = 0;

    for (let i = 0; i < data.length; i += 16) {
      min = Math.min(min, data[i]);
      max = Math.max(max, data[i]);
    }

    return { min: Math.round(min / 255 * 100), max: Math.round(max / 255 * 100) };
  }

  function updateTechInfo() {
    const dimsText = $("#normalFileDimensions")?.textContent || "—";
    els.techSource.textContent = dimsText;
    els.techPreview.textContent = canvasHasContent(core.source) ? `${core.source.width} × ${core.source.height}` : "—";

    const exportDims = getExportDimensions();
    els.techExport.textContent = exportDims ? `${exportDims.width} × ${exportDims.height}` : "—";

    if (exportDims) {
      els.techMemory.textContent = formatBytes(exportDims.width * exportDims.height * 4);
    } else {
      els.techMemory.textContent = "—";
    }

    const range = heightRangeFromCanvas(core.height);
    els.techRange.textContent = range ? `${range.min}% → ${range.max}%` : "—";
    els.techStrength.textContent = (Number(core.strength?.value || 0) / 100).toFixed(2);

    els.techWarning.classList.remove("warn");

    if (!exportDims) {
      els.techWarning.textContent = "Carga una imagen para analizar la configuración.";
    } else if (Math.max(exportDims.width, exportDims.height) >= 4096) {
      els.techWarning.textContent =
        "Estás preparando una textura 4K. Comprueba en Unity si 2K conserva el detalle visible antes de mantener 4K.";
      els.techWarning.classList.add("warn");
    } else if (Math.max(exportDims.width, exportDims.height) <= 1024) {
      els.techWarning.textContent =
        "Resolución contenida. Buena candidata para detalles secundarios o una variante móvil si el resultado visual sigue siendo suficiente.";
    } else {
      els.techWarning.textContent =
        "Resolución moderada. Revisa la preview al 100% y decide por calidad visible, no solo por el tamaño del archivo.";
    }

    updateUnityImportSettings();
  }

  function updateUnityImportSettings() {
    const profile = els.importProfile.value;
    const wrap = core.edgeMode?.value === "wrap" ? "Repeat" : "Clamp";

    let text;

    if (profile === "vrchatQuest") {
      text = [
        "Perfil: VRChat Quest / Android",
        "Texture Type: Normal map",
        "sRGB: gestionado por Unity al usar Normal map",
        `Wrap Mode: ${wrap}`,
        "Max Size recomendado: 1024 como punto de partida",
        "Compression: comprimida / revisar artefactos",
        "Nota: usa un shader móvil permitido por VRChat para la versión Android."
      ].join("\n");
    } else if (profile === "unityPc") {
      text = [
        "Perfil: Unity PC",
        "Texture Type: Normal map",
        "sRGB: gestionado por Unity al usar Normal map",
        `Wrap Mode: ${wrap}`,
        "Max Size: según el detalle real de la superficie",
        "Compression: Normal Quality / comprobar visualmente"
      ].join("\n");
    } else {
      text = [
        "Perfil: VRChat PC",
        "Texture Type: Normal map",
        "sRGB: gestionado por Unity al usar Normal map",
        `Wrap Mode: ${wrap}`,
        "Max Size: 2048 como punto de partida práctico; 4096 solo si el detalle lo justifica",
        "Compression: equilibrar calidad y memoria",
        "Revisar: Texture Memory + Material/Shader del avatar"
      ].join("\n");
    }

    els.importSettings.textContent = text;
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    }
  }

  // =========================================================
  // Zoom
  // =========================================================

  function applyPreviewZoom() {
    const zoom = Number(els.zoom.value);
    const grid = document.querySelector(".normal-preview-grid");
    grid?.classList.toggle("zoomed", zoom > 100);

    document.querySelectorAll(".normal-preview-grid .normal-canvas-wrap canvas").forEach((canvas) => {
      canvas.style.width = `${zoom}%`;
      canvas.style.maxWidth = zoom > 100 ? "none" : "100%";
    });
  }

  // =========================================================
  // Batch
  // =========================================================

  function readImageFile(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error(`No se pudo leer ${file.name}`));
      };

      img.src = url;
    });
  }

  function sourceToHeight(imageData, config) {
    const out = new Float32Array(imageData.width * imageData.height);
    const black = config.blackPoint / 100;
    const white = config.whitePoint / 100;
    const span = Math.max(0.001, white - black);
    const contrast = config.contrast / 100;
    const gamma = Math.max(0.01, config.gamma / 100);

    for (let p = 0, i = 0; p < out.length; p += 1, i += 4) {
      const r = imageData.data[i] / 255;
      const g = imageData.data[i + 1] / 255;
      const b = imageData.data[i + 2] / 255;
      const a = imageData.data[i + 3] / 255;

      let v;
      switch (config.heightChannel) {
        case "average": v = (r + g + b) / 3; break;
        case "red": v = r; break;
        case "green": v = g; break;
        case "blue": v = b; break;
        case "alpha": v = a; break;
        case "max": v = Math.max(r, g, b); break;
        case "min": v = Math.min(r, g, b); break;
        default: v = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      }

      v = clamp((v - black) / span);
      v = Math.pow(v, gamma);
      v = clamp((v - 0.5) * contrast + 0.5);
      if (config.invertHeight) v = 1 - v;
      out[p] = v;
    }

    return out;
  }

  function scaleForMax(width, height, maxValue) {
    if (maxValue === "original") return { width, height };
    const maxSide = Number(maxValue);
    const scale = Math.min(1, maxSide / Math.max(width, height));
    return {
      width: Math.max(1, Math.round(width * scale)),
      height: Math.max(1, Math.round(height * scale)),
    };
  }

  function canvasBlob(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("No se pudo crear PNG.")),
        "image/png"
      );
    });
  }

  async function runBatch() {
    if (!batchFiles.length || !window.JSZip) return;

    els.batchRun.disabled = true;
    els.batchProgress.hidden = false;
    const zip = new JSZip();
    const config = currentCoreConfig();

    try {
      for (let index = 0; index < batchFiles.length; index += 1) {
        const file = batchFiles[index];
        const percent = Math.round(index / batchFiles.length * 100);
        els.batchProgressBar.value = percent;
        els.batchProgressValue.textContent = `${percent}%`;
        els.batchProgressText.textContent = `Procesando ${file.name}…`;

        const img = await readImageFile(file);
        const dims = scaleForMax(img.naturalWidth, img.naturalHeight, els.batchMax.value);

        const canvas = document.createElement("canvas");
        canvas.width = dims.width;
        canvas.height = dims.height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, dims.width, dims.height);

        const sourceData = ctx.getImageData(0, 0, dims.width, dims.height);
        let height = sourceToHeight(sourceData, config);

        const scaledBlur = Math.min(32, Math.max(0, Math.round(config.blur * dims.width / Math.max(1, core.source.width || dims.width))));
        if (scaledBlur > 0) height = boxBlur(height, dims.width, dims.height, scaledBlur);

        if (els.multiscale.checked) {
          const small = boxBlur(height, dims.width, dims.height, 1);
          const large = boxBlur(height, dims.width, dims.height, Math.max(2, Math.round(Math.min(dims.width, dims.height) / 120)));
          const macroGain = Number(els.macro.value) / 100;
          const medGain = Number(els.medium.value) / 100;
          const microGain = Number(els.micro.value) / 100;
          const filtered = new Float32Array(height.length);

          for (let i = 0; i < height.length; i += 1) {
            filtered[i] = clamp(
              0.5 +
              (large[i] - 0.5) * macroGain +
              (small[i] - large[i]) * medGain +
              (height[i] - small[i]) * microGain
            );
          }
          height = filtered;
        }

        if (els.seamFix.checked) {
          // reutiliza el algoritmo mediante arrays temporales del mismo tamaño
          const oldW = heightWidth, oldH = heightHeight, oldE = heightEdit;
          heightWidth = dims.width; heightHeight = dims.height; heightEdit = height;
          height = applySeamFix(height, dims.width, dims.height);
          heightWidth = oldW; heightHeight = oldH; heightEdit = oldE;
        }

        const normal = normalFromHeight(
          height,
          dims.width,
          dims.height,
          config.strength / 100,
          config.flipX,
          config.flipY,
          config.edgeMode,
          config.sampleRadius
        );

        ctx.putImageData(normal, 0, 0);
        const blob = await canvasBlob(canvas);

        const baseName = file.name.replace(/\.[^.]+$/, "").replace(/[\\/:*?"<>|]+/g, "-");
        zip.file(`${baseName}-normal.png`, blob);
      }

      els.batchProgressText.textContent = "Creando ZIP…";
      els.batchProgressBar.value = 96;
      els.batchProgressValue.textContent = "96%";

      const blob = await zip.generateAsync(
        { type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } },
        (meta) => {
          const p = Math.min(100, Math.round(96 + meta.percent * 0.04));
          els.batchProgressBar.value = p;
          els.batchProgressValue.textContent = `${p}%`;
        }
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "toolhub-normal-maps.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      els.batchProgressBar.value = 100;
      els.batchProgressValue.textContent = "100%";
      els.batchProgressText.textContent = `${batchFiles.length} Normal Maps listos.`;
    } catch (error) {
      console.error(error);
      els.batchProgressText.textContent = error?.message || "Error durante el batch.";
    } finally {
      els.batchRun.disabled = !batchFiles.length;
    }
  }

  // =========================================================
  // Descarga del combinado
  // =========================================================

  function downloadCanvas(canvas, filename) {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  }

  // =========================================================
  // WebGL 3D preview
  // =========================================================

  const webglPreview = (() => {
    const canvas = els.canvas3d;
    const gl = canvas.getContext("webgl", { alpha: false, antialias: true });
    if (!gl) {
      els.placeholder3d.textContent = "WebGL no está disponible en este navegador.";
      return { requestTextureRefresh() {}, reset() {} };
    }

    const vs = `
      attribute vec3 aPosition;
      attribute vec3 aNormal;
      attribute vec3 aTangent;
      attribute vec2 aUV;
      uniform mat4 uMVP;
      uniform mat4 uModel;
      varying vec3 vN;
      varying vec3 vT;
      varying vec3 vB;
      varying vec2 vUV;

      void main() {
        mat3 m = mat3(uModel);
        vec3 N = normalize(m * aNormal);
        vec3 T = normalize(m * aTangent);
        vec3 B = normalize(cross(N, T));
        vN = N;
        vT = T;
        vB = B;
        vUV = aUV;
        gl_Position = uMVP * vec4(aPosition, 1.0);
      }
    `;

    const fs = `
      precision mediump float;
      uniform sampler2D uNormalMap;
      uniform sampler2D uBaseMap;
      uniform int uBaseMode;
      uniform vec3 uLight;
      varying vec3 vN;
      varying vec3 vT;
      varying vec3 vB;
      varying vec2 vUV;

      void main() {
        vec3 tn = texture2D(uNormalMap, vUV).rgb * 2.0 - 1.0;
        vec3 N = normalize(vT * tn.x + vB * tn.y + vN * tn.z);
        vec3 L = normalize(uLight);
        vec3 V = vec3(0.0, 0.0, 1.0);
        vec3 H = normalize(L + V);
        float diff = max(dot(N, L), 0.0);
        float spec = pow(max(dot(N, H), 0.0), 48.0);

        vec3 base;
        if (uBaseMode == 1) {
          base = vec3(0.58);
        } else if (uBaseMode == 2) {
          base = vec3(0.92);
        } else {
          base = texture2D(uBaseMap, vUV).rgb;
        }

        vec3 color = base * (0.18 + diff * 0.95) + vec3(spec * 0.32);
        gl_FragColor = vec4(color, 1.0);
      }
    `;

    function shader(type, source) {
      const s = gl.createShader(type);
      gl.shaderSource(s, source);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(s));
      }
      return s;
    }

    const program = gl.createProgram();
    gl.attachShader(program, shader(gl.VERTEX_SHADER, vs));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program));
    }

    gl.useProgram(program);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    const loc = {
      pos: gl.getAttribLocation(program, "aPosition"),
      normal: gl.getAttribLocation(program, "aNormal"),
      tangent: gl.getAttribLocation(program, "aTangent"),
      uv: gl.getAttribLocation(program, "aUV"),
      mvp: gl.getUniformLocation(program, "uMVP"),
      model: gl.getUniformLocation(program, "uModel"),
      baseMode: gl.getUniformLocation(program, "uBaseMode"),
      light: gl.getUniformLocation(program, "uLight"),
      normalMap: gl.getUniformLocation(program, "uNormalMap"),
      baseMap: gl.getUniformLocation(program, "uBaseMap"),
    };

    function createTexture(unit) {
      const tex = gl.createTexture();
      gl.activeTexture(unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      return tex;
    }

    const normalTex = createTexture(gl.TEXTURE0);
    const baseTex = createTexture(gl.TEXTURE1);
    gl.uniform1i(loc.normalMap, 0);
    gl.uniform1i(loc.baseMap, 1);

    function sphereMesh(rows = 36, cols = 64) {
      const data = [];
      const indices = [];

      for (let y = 0; y <= rows; y += 1) {
        const v = y / rows;
        const theta = v * Math.PI;

        for (let x = 0; x <= cols; x += 1) {
          const u = x / cols;
          const phi = u * Math.PI * 2;

          const sx = Math.sin(theta) * Math.cos(phi);
          const sy = Math.cos(theta);
          const sz = Math.sin(theta) * Math.sin(phi);

          let tx = -Math.sin(phi);
          let ty = 0;
          let tz = Math.cos(phi);
          const tl = Math.hypot(tx, ty, tz) || 1;
          tx /= tl; ty /= tl; tz /= tl;

          data.push(
            sx, sy, sz,
            sx, sy, sz,
            tx, ty, tz,
            1 - u, v
          );
        }
      }

      const stride = cols + 1;
      for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < cols; x += 1) {
          const a = y * stride + x;
          const b = a + stride;
          indices.push(a, b, a + 1, b, b + 1, a + 1);
        }
      }

      return { data: new Float32Array(data), indices: new Uint16Array(indices) };
    }

    function planeMesh() {
      return {
        data: new Float32Array([
          -1.25,-1.25,0, 0,0,1, 1,0,0, 0,1,
           1.25,-1.25,0, 0,0,1, 1,0,0, 1,1,
           1.25, 1.25,0, 0,0,1, 1,0,0, 1,0,
          -1.25, 1.25,0, 0,0,1, 1,0,0, 0,0,
        ]),
        indices: new Uint16Array([0,1,2, 0,2,3])
      };
    }

    function cubeMesh() {
      const faces = [
        { n:[0,0,1],  t:[1,0,0],  p:[[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]] },
        { n:[0,0,-1], t:[-1,0,0], p:[[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1]] },
        { n:[1,0,0],  t:[0,0,-1], p:[[1,-1,1],[1,-1,-1],[1,1,-1],[1,1,1]] },
        { n:[-1,0,0], t:[0,0,1],  p:[[-1,-1,-1],[-1,-1,1],[-1,1,1],[-1,1,-1]] },
        { n:[0,1,0],  t:[1,0,0],  p:[[-1,1,1],[1,1,1],[1,1,-1],[-1,1,-1]] },
        { n:[0,-1,0], t:[1,0,0],  p:[[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1]] },
      ];

      const data = [];
      const indices = [];
      const uvs = [[0,1],[1,1],[1,0],[0,0]];

      faces.forEach((face, fi) => {
        face.p.forEach((p, i) => {
          data.push(
            p[0],p[1],p[2],
            face.n[0],face.n[1],face.n[2],
            face.t[0],face.t[1],face.t[2],
            uvs[i][0],uvs[i][1]
          );
        });

        const o = fi * 4;
        indices.push(o,o+1,o+2, o,o+2,o+3);
      });

      return { data:new Float32Array(data), indices:new Uint16Array(indices) };
    }

    const meshes = {
      sphere: sphereMesh(),
      plane: planeMesh(),
      cube: cubeMesh(),
    };

    const buffer = gl.createBuffer();
    const ibo = gl.createBuffer();

    function bindMesh(mesh) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, mesh.data, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);

      const stride = 11 * 4;
      [
        [loc.pos, 3, 0],
        [loc.normal, 3, 3 * 4],
        [loc.tangent, 3, 6 * 4],
        [loc.uv, 2, 9 * 4],
      ].forEach(([location, size, offset]) => {
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, size, gl.FLOAT, false, stride, offset);
      });
    }

    function mat4Identity() {
      return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
    }

    function mat4Multiply(a,b) {
      const o = new Float32Array(16);
      for (let r=0;r<4;r++) {
        for (let c=0;c<4;c++) {
          o[c*4+r] =
            a[0*4+r]*b[c*4+0] +
            a[1*4+r]*b[c*4+1] +
            a[2*4+r]*b[c*4+2] +
            a[3*4+r]*b[c*4+3];
        }
      }
      return o;
    }

    function perspective(fov, aspect, near, far) {
      const f = 1 / Math.tan(fov / 2);
      const nf = 1 / (near - far);
      return new Float32Array([
        f/aspect,0,0,0,
        0,f,0,0,
        0,0,(far+near)*nf,-1,
        0,0,(2*far*near)*nf,0
      ]);
    }

    function translate(z) {
      const m = mat4Identity();
      m[14] = z;
      return m;
    }

    function rotateX(a) {
      const c=Math.cos(a), s=Math.sin(a);
      return new Float32Array([
        1,0,0,0,
        0,c,s,0,
        0,-s,c,0,
        0,0,0,1
      ]);
    }

    function rotateY(a) {
      const c=Math.cos(a), s=Math.sin(a);
      return new Float32Array([
        c,0,-s,0,
        0,1,0,0,
        s,0,c,0,
        0,0,0,1
      ]);
    }

    let rotX = -0.15;
    let rotY = 0.5;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let textureDirty = true;

    function uploadCanvasTexture(texture, unit, source, fallbackColor) {
      gl.activeTexture(unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);

      if (source && canvasHasContent(source)) {
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      } else {
        const pixel = new Uint8Array(fallbackColor);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
      }
    }

    function draw() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));

      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      gl.viewport(0,0,w,h);
      gl.clearColor(0.025,0.045,0.075,1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      const normalSource = canvasHasContent(els.combinedCanvas) ? els.combinedCanvas : core.normal;

      if (textureDirty) {
        uploadCanvasTexture(normalTex, gl.TEXTURE0, normalSource, [128,128,255,255]);
        uploadCanvasTexture(baseTex, gl.TEXTURE1, core.source, [160,160,160,255]);
        textureDirty = false;
      }

      const shape = els.shape3d.value;
      const mesh = meshes[shape];
      bindMesh(mesh);

      const model = mat4Multiply(rotateY(rotY), rotateX(rotX));
      const view = translate(shape === "plane" ? -3.2 : -3.6);
      const proj = perspective(Math.PI/4, w/h, 0.1, 100);
      const mvp = mat4Multiply(proj, mat4Multiply(view, model));

      gl.uniformMatrix4fv(loc.model,false,model);
      gl.uniformMatrix4fv(loc.mvp,false,mvp);

      const mode = els.base3d.value === "gray" ? 1 : els.base3d.value === "white" ? 2 : 0;
      gl.uniform1i(loc.baseMode, mode);

      const lx = Number($("#lightX")?.value || -35) / 100;
      const ly = -Number($("#lightY")?.value || -42) / 100;
      gl.uniform3f(loc.light,lx,ly,1.0);

      gl.drawElements(gl.TRIANGLES, mesh.indices.length, gl.UNSIGNED_SHORT, 0);
    }

    function loop() {
      if (els.rotate3d.checked) rotY += 0.006;
      draw();
      requestAnimationFrame(loop);
    }

    canvas.addEventListener("pointerdown",(e)=>{
      dragging=true;
      lastX=e.clientX;
      lastY=e.clientY;
      canvas.setPointerCapture?.(e.pointerId);
    });

    canvas.addEventListener("pointermove",(e)=>{
      if(!dragging) return;
      rotY += (e.clientX-lastX)*0.009;
      rotX += (e.clientY-lastY)*0.009;
      rotX = Math.max(-1.4,Math.min(1.4,rotX));
      lastX=e.clientX;
      lastY=e.clientY;
    });

    const end=(e)=>{
      dragging=false;
      try{canvas.releasePointerCapture?.(e.pointerId);}catch(_){}
    };

    canvas.addEventListener("pointerup",end);
    canvas.addEventListener("pointercancel",end);

    els.reset3d.addEventListener("click",()=>{
      rotX=-0.15;
      rotY=0.5;
    });

    [els.shape3d,els.base3d].forEach(el=>el.addEventListener("change",()=>{textureDirty=true;}));

    requestAnimationFrame(loop);

    return {
      requestTextureRefresh(){ textureDirty=true; },
      reset(){ rotX=-0.15; rotY=0.5; textureDirty=true; }
    };
  })();

  function update3dPlaceholder() {
    els.placeholder3d.hidden = canvasHasContent(core.normal);
  }

  // =========================================================
  // UI bindings
  // =========================================================

  function updateAdvancedLabels() {
    els.brushSizeValue.textContent = `${els.brushSize.value} px`;
    els.brushPowerValue.textContent = `${els.brushPower.value}%`;
    els.macroValue.textContent = (Number(els.macro.value)/100).toFixed(2);
    els.mediumValue.textContent = (Number(els.medium.value)/100).toFixed(2);
    els.microValue.textContent = (Number(els.micro.value)/100).toFixed(2);
    els.seamWidthValue.textContent = `${els.seamWidth.value}%`;
    els.seamStrengthValue.textContent = `${els.seamStrength.value}%`;
    els.detailStrengthValue.textContent = (Number(els.detailStrength.value)/100).toFixed(2);
  }

  els.compareSplit.addEventListener("input", updateCompareSplit);
  updateCompareSplit();

  els.channelCards.forEach((card) => {
    card.addEventListener("click", () => {
      const mode = card.dataset.heightChannel;
      if (!core.heightChannel) return;
      core.heightChannel.value = mode;
      core.heightChannel.dispatchEvent(new Event("input", { bubbles:true }));
      core.heightChannel.dispatchEvent(new Event("change", { bubbles:true }));
      setTimeout(() => {
        renderChannelPreviews();
        pushHistory();
      }, 40);
    });
  });

  els.syncHeight.addEventListener("click", copyCoreHeight);
  els.externalHeight.addEventListener("change", () => {
    loadExternalHeight(els.externalHeight.files?.[0]);
    els.externalHeight.value = "";
  });
  els.clearHeight.addEventListener("click", clearHeightEdits);

  els.brushButtons.forEach((button) => {
    button.addEventListener("click", () => {
      brushMode = button.dataset.heightBrush;
      els.brushButtons.forEach((b) => b.classList.toggle("active", b === button));
    });
  });

  [els.brushSize, els.brushPower].forEach((input) => input.addEventListener("input", updateAdvancedLabels));

  els.heightEditWrap.addEventListener("pointerenter", (e) => updateBrushCursor(e));
  els.heightEditWrap.addEventListener("pointermove", (e) => {
    updateBrushCursor(e);
    if (painting) paintHeight(e);
  });
  els.heightEditWrap.addEventListener("pointerleave", () => {
    els.brushCursor.hidden = true;
  });
  els.heightEditWrap.addEventListener("pointerdown", (e) => {
    if (!heightEdit) return;
    painting = true;
    els.heightEditWrap.setPointerCapture?.(e.pointerId);
    paintHeight(e);
  });
  const endPaint = (e) => {
    if (!painting) return;
    painting = false;
    try { els.heightEditWrap.releasePointerCapture?.(e.pointerId); } catch (_) {}
    pushHistory();
  };
  els.heightEditWrap.addEventListener("pointerup", endPaint);
  els.heightEditWrap.addEventListener("pointercancel", endPaint);

  [
    els.multiscale,els.macro,els.medium,els.micro,
    els.seamFix,els.seamWidth,els.seamStrength,
    els.detailStrength,els.blendMode,els.detailFlipY
  ].forEach((input) => {
    input.addEventListener("input", () => {
      updateAdvancedLabels();
      if (input === els.detailStrength || input === els.blendMode || input === els.detailFlipY) {
        refreshCombinedNormal();
      }
    });
    input.addEventListener("change", () => {
      updateAdvancedLabels();
      if (advancedNormalReady && [
        els.multiscale,els.macro,els.medium,els.micro,
        els.seamFix,els.seamWidth,els.seamStrength
      ].includes(input)) {
        generateAdvancedNormal();
      }
      pushHistory();
    });
  });

  els.generateAdvanced.addEventListener("click", () => {
    generateAdvancedNormal();
    pushHistory();
  });

  els.detailInput.addEventListener("change", () => {
    loadDetailNormal(els.detailInput.files?.[0]);
    els.detailInput.value = "";
  });

  els.downloadCombined.addEventListener("click", () => {
    if (!canvasHasContent(els.combinedCanvas)) return;
    const raw = $("#exportName")?.value?.trim() || "normal-map";
    const safe = raw.replace(/[\\/:*?"<>|]+/g,"-");
    downloadCanvas(els.combinedCanvas, `${safe}-combined.png`);
  });

  [els.tileSource,els.tileCount].forEach((input)=>input.addEventListener("change",renderTilePreview));

  els.importProfile.addEventListener("change", updateUnityImportSettings);
  els.copySettings.addEventListener("click", async () => {
    const ok = await copyText(els.importSettings.textContent);
    const old = els.copySettings.textContent;
    els.copySettings.textContent = ok ? "Copiado ✓" : "No se pudo copiar";
    setTimeout(()=>{els.copySettings.textContent=old;},1200);
  });

  els.zoom.addEventListener("change", applyPreviewZoom);

  els.batchInput.addEventListener("change", () => {
    batchFiles = Array.from(els.batchInput.files || []).filter((file)=>file.type.startsWith("image/"));
    els.batchSummary.textContent = batchFiles.length
      ? `${batchFiles.length} ${batchFiles.length === 1 ? "imagen" : "imágenes"}`
      : "Ningún archivo seleccionado";
    els.batchRun.disabled = !batchFiles.length || !window.JSZip;
  });
  els.batchRun.addEventListener("click", runBatch);

  els.undo.addEventListener("click", () => {
    if (history.length <= 1) return;
    const current = history.pop();
    redoHistory.push(current);
    applySnapshot(history[history.length - 1]);
  });

  els.redo.addEventListener("click", () => {
    if (!redoHistory.length) return;
    const snap = redoHistory.pop();
    history.push(snap);
    applySnapshot(snap);
  });

  els.saveA.addEventListener("click", () => {
    snapshotA = captureSnapshot();
    els.applyA.disabled = false;
    els.saveA.textContent = "A guardado ✓";
    setTimeout(()=>{els.saveA.textContent="Guardar A";},1000);
  });

  els.saveB.addEventListener("click", () => {
    snapshotB = captureSnapshot();
    els.applyB.disabled = false;
    els.saveB.textContent = "B guardado ✓";
    setTimeout(()=>{els.saveB.textContent="Guardar B";},1000);
  });

  els.applyA.addEventListener("click", () => applySnapshot(snapshotA));
  els.applyB.addEventListener("click", () => applySnapshot(snapshotB));

  // Captura historial de controles principales sin interferir con su funcionamiento.
  const coreHistoryInputs = [
    core.heightChannel,core.edgeMode,core.blackPoint,core.whitePoint,
    core.contrast,core.gamma,core.invertHeight,core.strength,
    core.blur,core.sampleRadius,core.flipX,core.flipY
  ].filter(Boolean);

  coreHistoryInputs.forEach((input) => {
    input.addEventListener("change", () => {
      setTimeout(() => {
        if (!applyingHistory) pushHistory();
        scheduleSync();
      }, 35);
    });
    input.addEventListener("input", scheduleSync);
  });

  core.exportResolution?.addEventListener("change", updateTechInfo);
  $("#normalFileInput")?.addEventListener("change", () => {
    setTimeout(() => {
      els.syncHeight.disabled = !canvasHasContent(core.height);
      scheduleSync();
      webglPreview.reset();
      history = [];
      redoHistory = [];
      pushHistory();
    }, 180);
  });

  document.querySelectorAll("[data-normal-preset],#resetNormalSettings,#autoLevelsButton").forEach((button) => {
    button.addEventListener("click", () => setTimeout(() => {
      scheduleSync();
      pushHistory();
    }, 80));
  });

  // El core renderiza por RAF; un pulso lento mantiene las previews avanzadas sincronizadas
  // sin modificar el archivo normal-map.js existente.
  setInterval(() => {
    if (canvasHasContent(core.source)) scheduleSync();
  }, 650);

  updateAdvancedLabels();
  updateUnityImportSettings();
  applyPreviewZoom();
  updateHistoryButtons();
  pushHistory();
})();