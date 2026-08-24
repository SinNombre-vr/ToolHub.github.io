(() => {
  "use strict";

  const PREVIEW_MAX = 480;

  const $ = (selector) => document.querySelector(selector);

  const els = {
    fileInput: $("#normalFileInput"),
    dropZone: $("#normalDropZone"),
    fileSummary: $("#normalFileSummary"),
    fileName: $("#normalFileName"),
    fileSize: $("#normalFileSize"),
    fileDimensions: $("#normalFileDimensions"),
    fileType: $("#normalFileType"),

    sourceCanvas: $("#sourceCanvas"),
    heightCanvas: $("#heightCanvas"),
    normalCanvas: $("#normalCanvas"),
    reliefCanvas: $("#reliefCanvas"),

    sourcePlaceholder: $("#sourcePlaceholder"),
    heightPlaceholder: $("#heightPlaceholder"),
    normalPlaceholder: $("#normalPlaceholder"),
    reliefPlaceholder: $("#reliefPlaceholder"),

    autoLevels: $("#autoLevelsButton"),
    reset: $("#resetNormalSettings"),

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

    previewMode: $("#previewMode"),
    lightColor: $("#lightColor"),
    lightX: $("#lightX"),
    lightY: $("#lightY"),
    ambient: $("#ambientLight"),
    diffuse: $("#diffuseLight"),
    specular: $("#specularLight"),
    shininess: $("#shininess"),

    exportResolution: $("#exportResolution"),
    exportName: $("#exportName"),
    downloadNormal: $("#downloadNormal"),
    downloadHeight: $("#downloadHeight"),
    downloadConfig: $("#downloadConfig"),
    loadConfig: $("#loadConfig"),
    status: $("#normalStatus"),

    reliefWrap: $("#reliefWrap"),
    lightIndicator: $("#lightIndicator"),
  };

  const sourceCtx = els.sourceCanvas.getContext("2d", { willReadFrequently: true });
  const heightCtx = els.heightCanvas.getContext("2d", { willReadFrequently: true });
  const normalCtx = els.normalCanvas.getContext("2d", { willReadFrequently: true });
  const reliefCtx = els.reliefCanvas.getContext("2d", { willReadFrequently: true });

  let sourceImage = null;
  let sourceFile = null;
  let previewSourceData = null;
  let previewHeight = null;
  let previewNormals = null;
  let previewWidth = 0;
  let previewHeightPx = 0;
  let renderQueued = false;
  let lightRenderQueued = false;

  const defaults = Object.freeze({
    heightChannel: "luminance",
    edgeMode: "clamp",
    blackPoint: 0,
    whitePoint: 100,
    contrast: 110,
    gamma: 100,
    invertHeight: false,
    strength: 220,
    blur: 1,
    sampleRadius: 1,
    flipX: false,
    flipY: false,
    previewMode: "source",
    lightColor: "#ffffff",
    lightX: -35,
    lightY: -42,
    ambient: 28,
    diffuse: 105,
    specular: 32,
    shininess: 48,
  });

  const presets = {
    softSkin: {
      strength: 115,
      blur: 2,
      sampleRadius: 1,
      contrast: 105,
      gamma: 100,
    },
    cloth: {
      strength: 240,
      blur: 1,
      sampleRadius: 1,
      contrast: 135,
      gamma: 95,
    },
    engraved: {
      strength: 420,
      blur: 0,
      sampleRadius: 1,
      contrast: 155,
      gamma: 100,
    },
    stone: {
      strength: 500,
      blur: 1,
      sampleRadius: 2,
      contrast: 165,
      gamma: 92,
    },
    tattoo: {
      strength: 185,
      blur: 0,
      sampleRadius: 1,
      contrast: 145,
      gamma: 105,
    },
    crisp: {
      strength: 315,
      blur: 0,
      sampleRadius: 1,
      contrast: 125,
      gamma: 100,
    },
  };

  function clamp(value, min = 0, max = 1) {
    return Math.min(max, Math.max(min, value));
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

    return `${value.toFixed(unit === 0 ? 0 : 2)} ${units[unit]}`;
  }

  function hexToRgb(hex) {
    const clean = String(hex).replace("#", "");
    const value = parseInt(clean, 16);

    return {
      r: ((value >> 16) & 255) / 255,
      g: ((value >> 8) & 255) / 255,
      b: (value & 255) / 255,
    };
  }

  function currentSettings() {
    return {
      heightChannel: els.heightChannel.value,
      edgeMode: els.edgeMode.value,
      blackPoint: Number(els.blackPoint.value),
      whitePoint: Number(els.whitePoint.value),
      contrast: Number(els.contrast.value),
      gamma: Number(els.gamma.value),
      invertHeight: els.invertHeight.checked,
      strength: Number(els.strength.value),
      blur: Number(els.blur.value),
      sampleRadius: Number(els.sampleRadius.value),
      flipX: els.flipX.checked,
      flipY: els.flipY.checked,
      previewMode: els.previewMode.value,
      lightColor: els.lightColor.value,
      lightX: Number(els.lightX.value),
      lightY: Number(els.lightY.value),
      ambient: Number(els.ambient.value),
      diffuse: Number(els.diffuse.value),
      specular: Number(els.specular.value),
      shininess: Number(els.shininess.value),
    };
  }

  function applySettings(settings) {
    const merged = { ...defaults, ...(settings || {}) };

    els.heightChannel.value = merged.heightChannel;
    els.edgeMode.value = merged.edgeMode;
    els.blackPoint.value = merged.blackPoint;
    els.whitePoint.value = merged.whitePoint;
    els.contrast.value = merged.contrast;
    els.gamma.value = merged.gamma;
    els.invertHeight.checked = Boolean(merged.invertHeight);
    els.strength.value = merged.strength;
    els.blur.value = merged.blur;
    els.sampleRadius.value = merged.sampleRadius;
    els.flipX.checked = Boolean(merged.flipX);
    els.flipY.checked = Boolean(merged.flipY);
    els.previewMode.value = merged.previewMode;
    els.lightColor.value = merged.lightColor;
    els.lightX.value = merged.lightX;
    els.lightY.value = merged.lightY;
    els.ambient.value = merged.ambient;
    els.diffuse.value = merged.diffuse;
    els.specular.value = merged.specular;
    els.shininess.value = merged.shininess;

    updateControlLabels();
    updateLightIndicator();
    scheduleFullRender();
  }

  function updateControlLabels() {
    $("#blackPointValue").textContent = `${els.blackPoint.value}%`;
    $("#whitePointValue").textContent = `${els.whitePoint.value}%`;
    $("#heightContrastValue").textContent = (Number(els.contrast.value) / 100).toFixed(2);
    $("#heightGammaValue").textContent = (Number(els.gamma.value) / 100).toFixed(2);
    $("#normalStrengthValue").textContent = (Number(els.strength.value) / 100).toFixed(2);
    $("#heightBlurValue").textContent = `${els.blur.value} px`;
    $("#sampleRadiusValue").textContent = `${els.sampleRadius.value} px`;
    $("#lightXValue").textContent = (Number(els.lightX.value) / 100).toFixed(2);
    $("#lightYValue").textContent = (Number(els.lightY.value) / 100).toFixed(2);
    $("#ambientLightValue").textContent = (Number(els.ambient.value) / 100).toFixed(2);
    $("#diffuseLightValue").textContent = (Number(els.diffuse.value) / 100).toFixed(2);
    $("#specularLightValue").textContent = (Number(els.specular.value) / 100).toFixed(2);
    $("#shininessValue").textContent = els.shininess.value;
  }

  function setCanvasSize(canvas, width, height) {
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
  }

  function previewDimensions(width, height) {
    const scale = Math.min(1, PREVIEW_MAX / Math.max(width, height));
    return {
      width: Math.max(1, Math.round(width * scale)),
      height: Math.max(1, Math.round(height * scale)),
    };
  }

  function getChannelValue(data, i, channel) {
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;
    const a = data[i + 3] / 255;

    switch (channel) {
      case "average": return (r + g + b) / 3;
      case "red": return r;
      case "green": return g;
      case "blue": return b;
      case "alpha": return a;
      case "max": return Math.max(r, g, b);
      case "min": return Math.min(r, g, b);
      case "luminance":
      default:
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
  }

  function buildHeightMap(imageData, width, height, settings) {
    const pixels = width * height;
    const out = new Float32Array(pixels);
    const data = imageData.data;

    const black = settings.blackPoint / 100;
    const white = settings.whitePoint / 100;
    const span = Math.max(0.001, white - black);
    const contrast = settings.contrast / 100;
    const gamma = Math.max(0.01, settings.gamma / 100);

    for (let p = 0, i = 0; p < pixels; p += 1, i += 4) {
      let value = getChannelValue(data, i, settings.heightChannel);
      value = clamp((value - black) / span);
      value = Math.pow(value, gamma);
      value = clamp((value - 0.5) * contrast + 0.5);

      if (settings.invertHeight) value = 1 - value;
      out[p] = value;
    }

    return out;
  }

  function boxBlur(src, width, height, radius, wrap) {
    radius = Math.max(0, Math.floor(radius));
    if (radius <= 0) return src.slice();

    const temp = new Float32Array(src.length);
    const out = new Float32Array(src.length);
    const diameter = radius * 2 + 1;

    const coord = (v, max) => {
      if (wrap) {
        v %= max;
        if (v < 0) v += max;
        return v;
      }
      return Math.min(max - 1, Math.max(0, v));
    };

    for (let y = 0; y < height; y += 1) {
      let sum = 0;

      for (let k = -radius; k <= radius; k += 1) {
        sum += src[y * width + coord(k, width)];
      }

      for (let x = 0; x < width; x += 1) {
        temp[y * width + x] = sum / diameter;

        const removeX = coord(x - radius, width);
        const addX = coord(x + radius + 1, width);
        sum += src[y * width + addX] - src[y * width + removeX];
      }
    }

    for (let x = 0; x < width; x += 1) {
      let sum = 0;

      for (let k = -radius; k <= radius; k += 1) {
        sum += temp[coord(k, height) * width + x];
      }

      for (let y = 0; y < height; y += 1) {
        out[y * width + x] = sum / diameter;

        const removeY = coord(y - radius, height);
        const addY = coord(y + radius + 1, height);
        sum += temp[addY * width + x] - temp[removeY * width + x];
      }
    }

    return out;
  }

  function normalFromHeight(heightMap, width, height, settings, includeFloatNormals = true) {
    const image = new ImageData(width, height);
    const normalFloats = includeFloatNormals ? new Float32Array(width * height * 3) : null;
    const strength = settings.strength / 100;
    const step = Math.max(1, Math.round(settings.sampleRadius));
    const wrap = settings.edgeMode === "wrap";

    const coord = (v, max) => {
      if (wrap) {
        v %= max;
        if (v < 0) v += max;
        return v;
      }
      return Math.min(max - 1, Math.max(0, v));
    };

    const sample = (x, y) => heightMap[coord(y, height) * width + coord(x, width)];

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const tl = sample(x - step, y - step);
        const tc = sample(x, y - step);
        const tr = sample(x + step, y - step);
        const ml = sample(x - step, y);
        const mr = sample(x + step, y);
        const bl = sample(x - step, y + step);
        const bc = sample(x, y + step);
        const br = sample(x + step, y + step);

        let sx = (tr + 2 * mr + br) - (tl + 2 * ml + bl);
        let sy = (bl + 2 * bc + br) - (tl + 2 * tc + tr);

        let nx = -sx * strength;
        let ny = -sy * strength;
        let nz = 1;

        if (settings.flipX) nx *= -1;
        if (settings.flipY) ny *= -1;

        const length = Math.hypot(nx, ny, nz) || 1;
        nx /= length;
        ny /= length;
        nz /= length;

        const p = y * width + x;
        const i = p * 4;

        image.data[i] = Math.round((nx * 0.5 + 0.5) * 255);
        image.data[i + 1] = Math.round((ny * 0.5 + 0.5) * 255);
        image.data[i + 2] = Math.round((nz * 0.5 + 0.5) * 255);
        image.data[i + 3] = 255;

        if (normalFloats) {
          const n = p * 3;
          normalFloats[n] = nx;
          normalFloats[n + 1] = ny;
          normalFloats[n + 2] = nz;
        }
      }
    }

    return { image, normalFloats };
  }

  function heightImageData(heightMap, width, height) {
    const image = new ImageData(width, height);

    for (let p = 0; p < heightMap.length; p += 1) {
      const value = Math.round(clamp(heightMap[p]) * 255);
      const i = p * 4;

      image.data[i] = value;
      image.data[i + 1] = value;
      image.data[i + 2] = value;
      image.data[i + 3] = 255;
    }

    return image;
  }

  function drawSourcePreview() {
    if (!sourceImage) return;

    const dims = previewDimensions(sourceImage.naturalWidth, sourceImage.naturalHeight);
    previewWidth = dims.width;
    previewHeightPx = dims.height;

    [
      els.sourceCanvas,
      els.heightCanvas,
      els.normalCanvas,
      els.reliefCanvas,
    ].forEach((canvas) => setCanvasSize(canvas, previewWidth, previewHeightPx));

    sourceCtx.clearRect(0, 0, previewWidth, previewHeightPx);
    sourceCtx.drawImage(sourceImage, 0, 0, previewWidth, previewHeightPx);

    previewSourceData = sourceCtx.getImageData(0, 0, previewWidth, previewHeightPx);

    [
      els.sourcePlaceholder,
      els.heightPlaceholder,
      els.normalPlaceholder,
      els.reliefPlaceholder,
    ].forEach((element) => {
      element.hidden = true;
    });

    els.lightIndicator.hidden = false;
    els.autoLevels.disabled = false;
    els.downloadNormal.disabled = false;
    els.downloadHeight.disabled = false;
  }

  function scheduleFullRender() {
    if (!sourceImage || renderQueued) return;
    renderQueued = true;

    requestAnimationFrame(() => {
      renderQueued = false;
      renderFullPreview();
    });
  }

  function scheduleLightRender() {
    if (!sourceImage || !previewNormals || lightRenderQueued) return;
    lightRenderQueued = true;

    requestAnimationFrame(() => {
      lightRenderQueued = false;
      renderLightingPreview();
    });
  }

  function renderFullPreview() {
    if (!previewSourceData || !previewWidth || !previewHeightPx) return;

    const settings = currentSettings();
    let heightMap = buildHeightMap(
      previewSourceData,
      previewWidth,
      previewHeightPx,
      settings
    );

    if (settings.blur > 0) {
      heightMap = boxBlur(
        heightMap,
        previewWidth,
        previewHeightPx,
        settings.blur,
        settings.edgeMode === "wrap"
      );
    }

    previewHeight = heightMap;

    const normalResult = normalFromHeight(
      heightMap,
      previewWidth,
      previewHeightPx,
      settings,
      true
    );

    previewNormals = normalResult.normalFloats;

    heightCtx.putImageData(
      heightImageData(heightMap, previewWidth, previewHeightPx),
      0,
      0
    );

    normalCtx.putImageData(normalResult.image, 0, 0);
    renderLightingPreview();

    els.status.textContent =
      `Normal Map actualizado en tiempo real · ${previewWidth} × ${previewHeightPx} preview`;
  }

  function renderLightingPreview() {
    if (!previewNormals || !previewSourceData || !previewHeight) return;

    const settings = currentSettings();
    const out = new ImageData(previewWidth, previewHeightPx);
    const light = hexToRgb(settings.lightColor);

    let lx = settings.lightX / 100;
    let ly = settings.lightY / 100;
    let lz = 1;

    const lightLength = Math.hypot(lx, ly, lz) || 1;
    lx /= lightLength;
    ly /= lightLength;
    lz /= lightLength;

    const hx = lx;
    const hy = ly;
    const hz = lz + 1;
    const halfLength = Math.hypot(hx, hy, hz) || 1;
    const halfX = hx / halfLength;
    const halfY = hy / halfLength;
    const halfZ = hz / halfLength;

    const ambient = settings.ambient / 100;
    const diffuseStrength = settings.diffuse / 100;
    const specularStrength = settings.specular / 100;
    const shininess = Math.max(2, settings.shininess);

    for (let p = 0; p < previewWidth * previewHeightPx; p += 1) {
      const n = p * 3;
      const i = p * 4;

      const nx = previewNormals[n];
      const ny = previewNormals[n + 1];
      const nz = previewNormals[n + 2];

      const diffuse = Math.max(0, nx * lx + ny * ly + nz * lz);
      const specular = Math.pow(
        Math.max(0, nx * halfX + ny * halfY + nz * halfZ),
        shininess
      ) * specularStrength;

      let br;
      let bg;
      let bb;

      if (settings.previewMode === "gray") {
        br = bg = bb = 0.64;
      } else if (settings.previewMode === "height") {
        br = bg = bb = previewHeight[p];
      } else {
        br = previewSourceData.data[i] / 255;
        bg = previewSourceData.data[i + 1] / 255;
        bb = previewSourceData.data[i + 2] / 255;
      }

      const litR = br * (ambient + diffuse * diffuseStrength * light.r) + specular * light.r;
      const litG = bg * (ambient + diffuse * diffuseStrength * light.g) + specular * light.g;
      const litB = bb * (ambient + diffuse * diffuseStrength * light.b) + specular * light.b;

      out.data[i] = Math.round(clamp(litR) * 255);
      out.data[i + 1] = Math.round(clamp(litG) * 255);
      out.data[i + 2] = Math.round(clamp(litB) * 255);
      out.data[i + 3] = 255;
    }

    reliefCtx.putImageData(out, 0, 0);
  }

  function updateLightIndicator() {
    if (!sourceImage) return;

    const x = (Number(els.lightX.value) / 100 * 0.5 + 0.5) * 100;
    const y = (Number(els.lightY.value) / 100 * 0.5 + 0.5) * 100;

    els.lightIndicator.style.left = `${x}%`;
    els.lightIndicator.style.top = `${y}%`;
  }

  function handleLightPointer(event) {
    if (!sourceImage) return;

    const rect = els.reliefWrap.getBoundingClientRect();
    const nx = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const ny = clamp((event.clientY - rect.top) / rect.height, 0, 1);

    els.lightX.value = Math.round((nx * 2 - 1) * 100);
    els.lightY.value = Math.round((ny * 2 - 1) * 100);

    updateControlLabels();
    updateLightIndicator();
    scheduleLightRender();
  }

  function autoLevels() {
    if (!previewSourceData) return;

    const settings = currentSettings();
    const histogram = new Uint32Array(256);
    const data = previewSourceData.data;
    let total = 0;

    for (let i = 0; i < data.length; i += 4) {
      const value = Math.round(
        clamp(getChannelValue(data, i, settings.heightChannel)) * 255
      );

      histogram[value] += 1;
      total += 1;
    }

    const lowTarget = total * 0.02;
    const highTarget = total * 0.98;

    let cumulative = 0;
    let low = 0;
    let high = 255;

    for (let i = 0; i < 256; i += 1) {
      cumulative += histogram[i];
      if (cumulative >= lowTarget) {
        low = i;
        break;
      }
    }

    cumulative = 0;

    for (let i = 0; i < 256; i += 1) {
      cumulative += histogram[i];
      if (cumulative >= highTarget) {
        high = i;
        break;
      }
    }

    let black = Math.round((low / 255) * 100);
    let white = Math.round((high / 255) * 100);

    black = Math.min(49, black);
    white = Math.max(51, white);

    if (white <= black + 2) {
      black = 0;
      white = 100;
    }

    els.blackPoint.value = black;
    els.whitePoint.value = white;

    updateControlLabels();
    scheduleFullRender();
    els.status.textContent = `Auto Levels aplicado · rango ${black}%–${white}%`;
  }

  function loadImageFile(file) {
    if (!file || !file.type.startsWith("image/")) {
      els.status.textContent = "Selecciona una imagen válida.";
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      if (sourceImage?.src?.startsWith("blob:")) {
        try { URL.revokeObjectURL(sourceImage.src); } catch (_) {}
      }

      sourceImage = image;
      sourceFile = file;

      els.fileName.textContent = file.name;
      els.fileSize.textContent = formatBytes(file.size);
      els.fileDimensions.textContent = `${image.naturalWidth} × ${image.naturalHeight}`;
      els.fileType.textContent = file.type || "Imagen";
      els.fileSummary.hidden = false;

      const baseName = file.name.replace(/\.[^.]+$/, "");
      els.exportName.value = `${baseName}-normal`;

      drawSourcePreview();
      updateLightIndicator();
      scheduleFullRender();

      els.status.textContent =
        `Imagen cargada · ${image.naturalWidth} × ${image.naturalHeight}`;
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      els.status.textContent = "No se pudo leer la imagen.";
    };

    image.src = objectUrl;
  }

  function outputDimensions(target) {
    const originalWidth = sourceImage.naturalWidth;
    const originalHeight = sourceImage.naturalHeight;

    if (target === "original") {
      return { width: originalWidth, height: originalHeight };
    }

    const maxSide = Number(target);
    const scale = Math.min(1, maxSide / Math.max(originalWidth, originalHeight));

    return {
      width: Math.max(1, Math.round(originalWidth * scale)),
      height: Math.max(1, Math.round(originalHeight * scale)),
    };
  }

  function scaledSettingsForExport(settings, width) {
    const scale = previewWidth ? width / previewWidth : 1;

    return {
      ...settings,
      blur: Math.min(48, Math.max(0, Math.round(settings.blur * scale))),
      sampleRadius: Math.min(16, Math.max(1, Math.round(settings.sampleRadius * scale))),
    };
  }

  async function buildExportData(kind = "normal") {
    if (!sourceImage) throw new Error("No hay imagen cargada.");

    const dims = outputDimensions(els.exportResolution.value);
    const canvas = document.createElement("canvas");
    canvas.width = dims.width;
    canvas.height = dims.height;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(sourceImage, 0, 0, dims.width, dims.height);

    const sourceData = ctx.getImageData(0, 0, dims.width, dims.height);
    const settings = scaledSettingsForExport(
      currentSettings(),
      dims.width
    );

    let heightMap = buildHeightMap(
      sourceData,
      dims.width,
      dims.height,
      settings
    );

    if (settings.blur > 0) {
      heightMap = boxBlur(
        heightMap,
        dims.width,
        dims.height,
        settings.blur,
        settings.edgeMode === "wrap"
      );
    }

    if (kind === "height") {
      ctx.putImageData(
        heightImageData(heightMap, dims.width, dims.height),
        0,
        0
      );
    } else {
      const normal = normalFromHeight(
        heightMap,
        dims.width,
        dims.height,
        settings,
        false
      );

      ctx.putImageData(normal.image, 0, 0);
    }

    return { canvas, dims };
  }

  function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("No se pudo crear el PNG.")),
        "image/png"
      );
    });
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function exportImage(kind) {
    if (!sourceImage) return;

    try {
      const label = kind === "height" ? "Height Map" : "Normal Map";
      els.status.textContent = `Generando ${label} a resolución de exportación…`;

      await new Promise((resolve) => setTimeout(resolve, 30));

      const { canvas, dims } = await buildExportData(kind);
      const blob = await canvasToBlob(canvas);

      const rawName = els.exportName.value.trim() || "normal-map";
      const safeName = rawName.replace(/[\\/:*?"<>|]+/g, "-");
      const suffix = kind === "height" ? "-height" : "";

      downloadBlob(blob, `${safeName}${suffix}.png`);

      els.status.textContent =
        `${label} exportado · ${dims.width} × ${dims.height} · ${formatBytes(blob.size)}`;
    } catch (error) {
      console.error(error);
      els.status.textContent =
        `No se pudo exportar: ${error?.message || "error desconocido"}`;
    }
  }

  function downloadConfig() {
    const config = {
      tool: "ToolHub Normal Map Studio Pro",
      version: 1,
      settings: currentSettings(),
    };

    const blob = new Blob(
      [JSON.stringify(config, null, 2)],
      { type: "application/json" }
    );

    downloadBlob(blob, "toolhub-normal-map-config.json");
  }

  function loadConfigFile(file) {
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ""));
        const settings = parsed?.settings || parsed;

        if (!settings || typeof settings !== "object") {
          throw new Error("Configuración no válida.");
        }

        applySettings(settings);
        els.status.textContent = "Configuración JSON cargada.";
      } catch (error) {
        els.status.textContent =
          `No se pudo cargar el JSON: ${error?.message || "archivo no válido"}`;
      }
    };

    reader.readAsText(file);
  }

  const fullRenderInputs = [
    els.heightChannel,
    els.edgeMode,
    els.blackPoint,
    els.whitePoint,
    els.contrast,
    els.gamma,
    els.invertHeight,
    els.strength,
    els.blur,
    els.sampleRadius,
    els.flipX,
    els.flipY,
  ];

  fullRenderInputs.forEach((input) => {
    input.addEventListener("input", () => {
      updateControlLabels();
      scheduleFullRender();
    });

    input.addEventListener("change", () => {
      updateControlLabels();
      scheduleFullRender();
    });
  });

  const lightInputs = [
    els.previewMode,
    els.lightColor,
    els.lightX,
    els.lightY,
    els.ambient,
    els.diffuse,
    els.specular,
    els.shininess,
  ];

  lightInputs.forEach((input) => {
    input.addEventListener("input", () => {
      updateControlLabels();
      updateLightIndicator();
      scheduleLightRender();
    });

    input.addEventListener("change", () => {
      updateControlLabels();
      updateLightIndicator();
      scheduleLightRender();
    });
  });

  els.fileInput.addEventListener("change", () => {
    loadImageFile(els.fileInput.files?.[0]);
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    els.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      els.dropZone.classList.add("is-dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    els.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      els.dropZone.classList.remove("is-dragging");
    });
  });

  els.dropZone.addEventListener("drop", (event) => {
    loadImageFile(event.dataTransfer?.files?.[0]);
  });

  els.autoLevels.addEventListener("click", autoLevels);

  els.reset.addEventListener("click", () => {
    applySettings(defaults);
    els.status.textContent = "Controles restablecidos.";
  });

  document.querySelectorAll("[data-normal-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      const preset = presets[button.dataset.normalPreset];
      if (!preset) return;

      applySettings({ ...currentSettings(), ...preset });
      els.status.textContent = `Preset aplicado: ${button.textContent.trim()}`;
    });
  });

  els.downloadNormal.addEventListener("click", () => exportImage("normal"));
  els.downloadHeight.addEventListener("click", () => exportImage("height"));
  els.downloadConfig.addEventListener("click", downloadConfig);

  els.loadConfig.addEventListener("change", () => {
    loadConfigFile(els.loadConfig.files?.[0]);
    els.loadConfig.value = "";
  });

  let draggingLight = false;

  els.reliefWrap.addEventListener("pointerdown", (event) => {
    if (!sourceImage) return;
    draggingLight = true;
    els.reliefWrap.setPointerCapture?.(event.pointerId);
    handleLightPointer(event);
  });

  els.reliefWrap.addEventListener("pointermove", (event) => {
    if (!draggingLight) return;
    handleLightPointer(event);
  });

  const endLightDrag = (event) => {
    if (!draggingLight) return;
    draggingLight = false;

    try {
      els.reliefWrap.releasePointerCapture?.(event.pointerId);
    } catch (_) {}
  };

  els.reliefWrap.addEventListener("pointerup", endLightDrag);
  els.reliefWrap.addEventListener("pointercancel", endLightDrag);

  updateControlLabels();
})();