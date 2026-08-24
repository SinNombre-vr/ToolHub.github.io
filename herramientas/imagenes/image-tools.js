
(() => {
  const tool = document.body.dataset.imageTool;
  const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
  const MAX_PIXELS = 60_000_000;

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) return "—";
    if (bytes < 1024) return `${bytes} B`;
    const units = ["KB", "MB", "GB"];
    let value = bytes / 1024;
    let unit = units[0];
    for (let i = 1; i < units.length && value >= 1024; i++) {
      value /= 1024;
      unit = units[i];
    }
    return `${value >= 10 ? value.toFixed(1) : value.toFixed(2)} ${unit}`;
  }

  function safeStem(name) {
    const stem = name.replace(/\.[^/.]+$/, "").trim() || "imagen";
    return stem.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
  }

  function extForMime(mime) {
    return mime === "image/jpeg" ? "jpg" :
      mime === "image/webp" ? "webp" : "png";
  }

  function mimeLabel(mime) {
    return mime === "image/jpeg" ? "JPG" :
      mime === "image/webp" ? "WEBP" :
      mime === "image/png" ? "PNG" : mime;
  }

  function showStatus(element, message, type = "") {
    if (!element) return;
    element.textContent = message;
    element.className = `status-box${type ? ` ${type}` : ""}`;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function canvasToBlob(canvas, mime, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("El navegador no pudo generar el formato seleccionado."));
      }, mime, quality);
    });
  }

  function validateDimensions(width, height) {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
      throw new Error("Las dimensiones no son válidas.");
    }
    if (width > 12000 || height > 12000 || width * height > MAX_PIXELS) {
      throw new Error("La imagen resultante es demasiado grande. Usa dimensiones menores.");
    }
  }

  function drawImageToCanvas(image, width, height, mime) {
    validateDimensions(width, height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: mime !== "image/jpeg" });

    if (!ctx) throw new Error("No se pudo iniciar el procesamiento de imagen.");

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    if (mime === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
    }

    ctx.drawImage(image, 0, 0, width, height);
    return canvas;
  }

  function setPreview(previewImg, placeholder, url) {
    if (previewImg) {
      previewImg.src = url;
      previewImg.hidden = false;
    }
    if (placeholder) placeholder.hidden = true;
  }

  function resetPreview(previewImg, placeholder) {
    if (previewImg) {
      previewImg.removeAttribute("src");
      previewImg.hidden = true;
    }
    if (placeholder) placeholder.hidden = false;
  }

  function createFileState() {
    return {
      file: null,
      image: null,
      inputUrl: null,
      resultBlob: null,
      resultUrl: null,
      ratio: 1,
    };
  }

  function clearStateUrls(state) {
    if (state.inputUrl) URL.revokeObjectURL(state.inputUrl);
    if (state.resultUrl) URL.revokeObjectURL(state.resultUrl);
    state.inputUrl = null;
    state.resultUrl = null;
  }

  async function loadImageFile(file, state) {
    if (!file) throw new Error("Selecciona una imagen.");
    if (!ALLOWED_TYPES.has(file.type)) {
      throw new Error("Formato no compatible. Utiliza PNG, JPG/JPEG o WEBP.");
    }

    if (state.inputUrl) URL.revokeObjectURL(state.inputUrl);
    state.inputUrl = URL.createObjectURL(file);

    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error("No se pudo leer la imagen."));
      image.src = state.inputUrl;
    });

    validateDimensions(image.naturalWidth, image.naturalHeight);

    state.file = file;
    state.image = image;
    state.ratio = image.naturalWidth / image.naturalHeight;
    state.resultBlob = null;

    if (state.resultUrl) {
      URL.revokeObjectURL(state.resultUrl);
      state.resultUrl = null;
    }

    return image;
  }

  function setupDropZone(zone, input, onFile) {
    if (!zone || !input) return;

    zone.addEventListener("click", () => input.click());
    zone.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        input.click();
      }
    });

    input.addEventListener("change", () => {
      if (input.files?.[0]) onFile(input.files[0]);
    });

    ["dragenter", "dragover"].forEach((name) => {
      zone.addEventListener(name, (event) => {
        event.preventDefault();
        zone.classList.add("is-dragging");
      });
    });

    ["dragleave", "drop"].forEach((name) => {
      zone.addEventListener(name, (event) => {
        event.preventDefault();
        zone.classList.remove("is-dragging");
      });
    });

    zone.addEventListener("drop", (event) => {
      const file = event.dataTransfer?.files?.[0];
      if (file) onFile(file);
    });
  }

  function updateFileSummary(summary, fileName, fileMeta, state) {
    summary.hidden = false;
    fileName.textContent = state.file.name;
    fileMeta.innerHTML = `
      <span>${state.image.naturalWidth} × ${state.image.naturalHeight}px</span>
      <span>${mimeLabel(state.file.type)}</span>
      <span>${formatBytes(state.file.size)}</span>
    `;
  }

  function outputMime(selectValue, inputMime) {
    if (selectValue === "same") return inputMime;
    return selectValue;
  }

  function qualityFor(mime, slider) {
    if (mime === "image/png") return undefined;
    return Number(slider.value) / 100;
  }

  function bindQualitySlider(slider, valueLabel) {
    const update = () => valueLabel.textContent = `${slider.value}%`;
    slider.addEventListener("input", update);
    update();
  }

  function setQualityEnabled(mime, slider, note) {
    const enabled = mime !== "image/png";
    slider.disabled = !enabled;
    if (note) {
      note.textContent = enabled
        ? "La calidad afecta a JPG y WEBP."
        : "PNG no utiliza el control de calidad del navegador; se volverá a codificar sin pérdida.";
    }
  }

  // --------------------------------------------------
  // CONVERSOR
  // --------------------------------------------------
  if (tool === "converter") {
    const state = createFileState();

    const dropZone = document.getElementById("dropZone");
    const fileInput = document.getElementById("fileInput");
    const summary = document.getElementById("fileSummary");
    const fileName = document.getElementById("fileName");
    const fileMeta = document.getElementById("fileMeta");
    const previewImg = document.getElementById("previewImg");
    const previewPlaceholder = document.getElementById("previewPlaceholder");
    const resultImg = document.getElementById("resultImg");
    const resultPlaceholder = document.getElementById("resultPlaceholder");
    const format = document.getElementById("outputFormat");
    const quality = document.getElementById("quality");
    const qualityValue = document.getElementById("qualityValue");
    const qualityNote = document.getElementById("qualityNote");
    const convertBtn = document.getElementById("convertBtn");
    const downloadBtn = document.getElementById("downloadBtn");
    const status = document.getElementById("status");
    const resultStats = document.getElementById("resultStats");

    bindQualitySlider(quality, qualityValue);
    setQualityEnabled(format.value, quality, qualityNote);

    format.addEventListener("change", () => {
      setQualityEnabled(format.value, quality, qualityNote);
      downloadBtn.disabled = true;
      state.resultBlob = null;
      resetPreview(resultImg, resultPlaceholder);
      resultStats.hidden = true;
    });

    async function onFile(file) {
      try {
        showStatus(status, "Leyendo imagen...");
        await loadImageFile(file, state);
        updateFileSummary(summary, fileName, fileMeta, state);
        setPreview(previewImg, previewPlaceholder, state.inputUrl);
        convertBtn.disabled = false;
        downloadBtn.disabled = true;
        resetPreview(resultImg, resultPlaceholder);
        resultStats.hidden = true;
        showStatus(status, "Imagen preparada. Elige el formato de salida.", "success");
      } catch (error) {
        showStatus(status, error.message, "error");
      }
    }

    setupDropZone(dropZone, fileInput, onFile);

    convertBtn.addEventListener("click", async () => {
      if (!state.image || !state.file) return;
      try {
        convertBtn.disabled = true;
        showStatus(status, "Convirtiendo imagen...");

        const mime = format.value;
        const canvas = drawImageToCanvas(
          state.image,
          state.image.naturalWidth,
          state.image.naturalHeight,
          mime
        );
        const blob = await canvasToBlob(canvas, mime, qualityFor(mime, quality));
        state.resultBlob = blob;

        if (state.resultUrl) URL.revokeObjectURL(state.resultUrl);
        state.resultUrl = URL.createObjectURL(blob);
        setPreview(resultImg, resultPlaceholder, state.resultUrl);

        resultStats.hidden = false;
        resultStats.innerHTML = `
          <div class="result-stat"><span>Formato</span><strong>${mimeLabel(mime)}</strong></div>
          <div class="result-stat"><span>Tamaño original</span><strong>${formatBytes(state.file.size)}</strong></div>
          <div class="result-stat"><span>Tamaño resultante</span><strong>${formatBytes(blob.size)}</strong></div>
        `;

        downloadBtn.disabled = false;
        showStatus(status, "Conversión completada. La imagen no salió de tu navegador.", "success");
      } catch (error) {
        showStatus(status, error.message, "error");
      } finally {
        convertBtn.disabled = false;
      }
    });

    downloadBtn.addEventListener("click", () => {
      if (!state.resultBlob || !state.file) return;
      const mime = format.value;
      downloadBlob(
        state.resultBlob,
        `${safeStem(state.file.name)}-convertida.${extForMime(mime)}`
      );
    });

    window.addEventListener("beforeunload", () => clearStateUrls(state));
  }

  // --------------------------------------------------
  // REDIMENSIONAR
  // --------------------------------------------------
  if (tool === "resize") {
    const state = createFileState();

    const dropZone = document.getElementById("dropZone");
    const fileInput = document.getElementById("fileInput");
    const summary = document.getElementById("fileSummary");
    const fileName = document.getElementById("fileName");
    const fileMeta = document.getElementById("fileMeta");
    const previewImg = document.getElementById("previewImg");
    const previewPlaceholder = document.getElementById("previewPlaceholder");
    const resultImg = document.getElementById("resultImg");
    const resultPlaceholder = document.getElementById("resultPlaceholder");
    const widthInput = document.getElementById("widthInput");
    const heightInput = document.getElementById("heightInput");
    const lockRatio = document.getElementById("lockRatio");
    const format = document.getElementById("outputFormat");
    const quality = document.getElementById("quality");
    const qualityValue = document.getElementById("qualityValue");
    const qualityNote = document.getElementById("qualityNote");
    const resizeBtn = document.getElementById("resizeBtn");
    const downloadBtn = document.getElementById("downloadBtn");
    const status = document.getElementById("status");
    const resultStats = document.getElementById("resultStats");

    bindQualitySlider(quality, qualityValue);

    function currentMime() {
      if (!state.file) return format.value === "same" ? "image/png" : format.value;
      return outputMime(format.value, state.file.type);
    }

    function refreshQuality() {
      setQualityEnabled(currentMime(), quality, qualityNote);
    }

    format.addEventListener("change", refreshQuality);
    refreshQuality();

    widthInput.addEventListener("input", () => {
      if (lockRatio.checked && state.image && Number(widthInput.value) > 0) {
        heightInput.value = Math.max(1, Math.round(Number(widthInput.value) / state.ratio));
      }
    });

    heightInput.addEventListener("input", () => {
      if (lockRatio.checked && state.image && Number(heightInput.value) > 0) {
        widthInput.value = Math.max(1, Math.round(Number(heightInput.value) * state.ratio));
      }
    });

    async function onFile(file) {
      try {
        showStatus(status, "Leyendo imagen...");
        await loadImageFile(file, state);
        updateFileSummary(summary, fileName, fileMeta, state);
        setPreview(previewImg, previewPlaceholder, state.inputUrl);
        widthInput.value = state.image.naturalWidth;
        heightInput.value = state.image.naturalHeight;
        format.value = "same";
        refreshQuality();
        resizeBtn.disabled = false;
        downloadBtn.disabled = true;
        resetPreview(resultImg, resultPlaceholder);
        resultStats.hidden = true;
        showStatus(status, "Imagen preparada. Introduce las nuevas dimensiones.", "success");
      } catch (error) {
        showStatus(status, error.message, "error");
      }
    }

    setupDropZone(dropZone, fileInput, onFile);

    resizeBtn.addEventListener("click", async () => {
      if (!state.image || !state.file) return;

      try {
        const width = Math.round(Number(widthInput.value));
        const height = Math.round(Number(heightInput.value));
        validateDimensions(width, height);

        resizeBtn.disabled = true;
        showStatus(status, "Redimensionando imagen...");

        const mime = currentMime();
        const canvas = drawImageToCanvas(state.image, width, height, mime);
        const blob = await canvasToBlob(canvas, mime, qualityFor(mime, quality));
        state.resultBlob = blob;

        if (state.resultUrl) URL.revokeObjectURL(state.resultUrl);
        state.resultUrl = URL.createObjectURL(blob);
        setPreview(resultImg, resultPlaceholder, state.resultUrl);

        resultStats.hidden = false;
        resultStats.innerHTML = `
          <div class="result-stat"><span>Antes</span><strong>${state.image.naturalWidth} × ${state.image.naturalHeight}px</strong></div>
          <div class="result-stat"><span>Después</span><strong>${width} × ${height}px</strong></div>
          <div class="result-stat"><span>Tamaño</span><strong>${formatBytes(blob.size)}</strong></div>
        `;

        downloadBtn.disabled = false;
        showStatus(status, "Redimensionado completado.", "success");
      } catch (error) {
        showStatus(status, error.message, "error");
      } finally {
        resizeBtn.disabled = false;
      }
    });

    downloadBtn.addEventListener("click", () => {
      if (!state.resultBlob || !state.file) return;
      const mime = currentMime();
      downloadBlob(
        state.resultBlob,
        `${safeStem(state.file.name)}-${widthInput.value}x${heightInput.value}.${extForMime(mime)}`
      );
    });

    window.addEventListener("beforeunload", () => clearStateUrls(state));
  }

  // --------------------------------------------------
  // COMPRIMIR
  // --------------------------------------------------
  if (tool === "compress") {
    const state = createFileState();

    const dropZone = document.getElementById("dropZone");
    const fileInput = document.getElementById("fileInput");
    const summary = document.getElementById("fileSummary");
    const fileName = document.getElementById("fileName");
    const fileMeta = document.getElementById("fileMeta");
    const previewImg = document.getElementById("previewImg");
    const previewPlaceholder = document.getElementById("previewPlaceholder");
    const resultImg = document.getElementById("resultImg");
    const resultPlaceholder = document.getElementById("resultPlaceholder");
    const format = document.getElementById("outputFormat");
    const quality = document.getElementById("quality");
    const qualityValue = document.getElementById("qualityValue");
    const qualityNote = document.getElementById("qualityNote");
    const compressBtn = document.getElementById("compressBtn");
    const downloadBtn = document.getElementById("downloadBtn");
    const status = document.getElementById("status");
    const resultStats = document.getElementById("resultStats");

    bindQualitySlider(quality, qualityValue);

    function currentMime() {
      if (!state.file) return format.value === "same" ? "image/webp" : format.value;
      return outputMime(format.value, state.file.type);
    }

    function refreshQuality() {
      setQualityEnabled(currentMime(), quality, qualityNote);
    }

    format.addEventListener("change", refreshQuality);
    refreshQuality();

    async function onFile(file) {
      try {
        showStatus(status, "Leyendo imagen...");
        await loadImageFile(file, state);
        updateFileSummary(summary, fileName, fileMeta, state);
        setPreview(previewImg, previewPlaceholder, state.inputUrl);
        format.value = "same";
        refreshQuality();
        compressBtn.disabled = false;
        downloadBtn.disabled = true;
        resetPreview(resultImg, resultPlaceholder);
        resultStats.hidden = true;
        showStatus(status, "Imagen preparada para comprimir.", "success");
      } catch (error) {
        showStatus(status, error.message, "error");
      }
    }

    setupDropZone(dropZone, fileInput, onFile);

    compressBtn.addEventListener("click", async () => {
      if (!state.image || !state.file) return;

      try {
        compressBtn.disabled = true;
        showStatus(status, "Comprimiendo imagen...");

        const mime = currentMime();
        const canvas = drawImageToCanvas(
          state.image,
          state.image.naturalWidth,
          state.image.naturalHeight,
          mime
        );
        const blob = await canvasToBlob(canvas, mime, qualityFor(mime, quality));
        state.resultBlob = blob;

        if (state.resultUrl) URL.revokeObjectURL(state.resultUrl);
        state.resultUrl = URL.createObjectURL(blob);
        setPreview(resultImg, resultPlaceholder, state.resultUrl);

        const delta = ((state.file.size - blob.size) / state.file.size) * 100;
        const deltaText = delta >= 0
          ? `${delta.toFixed(1)}% menor`
          : `${Math.abs(delta).toFixed(1)}% mayor`;

        resultStats.hidden = false;
        resultStats.innerHTML = `
          <div class="result-stat"><span>Original</span><strong>${formatBytes(state.file.size)}</strong></div>
          <div class="result-stat"><span>Resultado</span><strong>${formatBytes(blob.size)}</strong></div>
          <div class="result-stat"><span>Diferencia</span><strong>${deltaText}</strong></div>
        `;

        downloadBtn.disabled = false;

        if (delta < 0) {
          showStatus(
            status,
            "La imagen resultante pesa más que la original. Prueba WEBP/JPG o baja la calidad.",
            "error"
          );
        } else {
          showStatus(status, `Compresión completada: ${deltaText}.`, "success");
        }
      } catch (error) {
        showStatus(status, error.message, "error");
      } finally {
        compressBtn.disabled = false;
      }
    });

    downloadBtn.addEventListener("click", () => {
      if (!state.resultBlob || !state.file) return;
      const mime = currentMime();
      downloadBlob(
        state.resultBlob,
        `${safeStem(state.file.name)}-comprimida.${extForMime(mime)}`
      );
    });

    window.addEventListener("beforeunload", () => clearStateUrls(state));
  }

  // --------------------------------------------------
  // GENERADOR DE GRADIENTES
  // --------------------------------------------------
  if (tool === "gradient") {
    const type = document.getElementById("gradientType");
    const angle = document.getElementById("gradientAngle");
    const angleValue = document.getElementById("angleValue");
    const angleGroup = document.getElementById("angleGroup");
    const color1 = document.getElementById("color1");
    const color2 = document.getElementById("color2");
    const color1Hex = document.getElementById("color1Hex");
    const color2Hex = document.getElementById("color2Hex");
    const position1 = document.getElementById("position1");
    const position2 = document.getElementById("position2");
    const preview = document.getElementById("gradientPreview");
    const cssOutput = document.getElementById("cssOutput");
    const copyBtn = document.getElementById("copyBtn");
    const randomBtn = document.getElementById("randomBtn");
    const downloadBtn = document.getElementById("downloadGradientBtn");
    const widthInput = document.getElementById("gradientWidth");
    const heightInput = document.getElementById("gradientHeight");
    const status = document.getElementById("status");

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    function gradientCss() {
      const p1 = clamp(Number(position1.value), 0, 100);
      const p2 = clamp(Number(position2.value), 0, 100);
      if (type.value === "radial") {
        return `radial-gradient(circle, ${color1.value} ${p1}%, ${color2.value} ${p2}%)`;
      }
      return `linear-gradient(${angle.value}deg, ${color1.value} ${p1}%, ${color2.value} ${p2}%)`;
    }

    function updateGradient() {
      angleValue.textContent = `${angle.value}°`;
      angleGroup.hidden = type.value === "radial";
      color1Hex.textContent = color1.value.toUpperCase();
      color2Hex.textContent = color2.value.toUpperCase();

      position1.value = clamp(Number(position1.value), 0, 100);
      position2.value = clamp(Number(position2.value), 0, 100);

      const css = gradientCss();
      preview.style.background = css;
      cssOutput.value = `background: ${css};`;
    }

    [type, angle, color1, color2, position1, position2].forEach((control) => {
      control.addEventListener("input", updateGradient);
      control.addEventListener("change", updateGradient);
    });

    randomBtn.addEventListener("click", () => {
      const randomColor = () =>
        `#${Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, "0")}`;
      color1.value = randomColor();
      color2.value = randomColor();
      updateGradient();
      showStatus(status, "Nuevos colores generados.", "success");
    });

    copyBtn.addEventListener("click", async () => {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(cssOutput.value);
        } else {
          cssOutput.focus();
          cssOutput.select();
          document.execCommand("copy");
          cssOutput.setSelectionRange(0, 0);
        }
        showStatus(status, "CSS copiado.", "success");
      } catch {
        cssOutput.focus();
        cssOutput.select();
        showStatus(status, "No se pudo copiar automáticamente. El código está seleccionado.", "error");
      }
    });

    function sortedStops() {
      const items = [
        { pos: clamp(Number(position1.value), 0, 100) / 100, color: color1.value },
        { pos: clamp(Number(position2.value), 0, 100) / 100, color: color2.value },
      ];
      items.sort((a, b) => a.pos - b.pos);
      return items;
    }

    downloadBtn.addEventListener("click", async () => {
      try {
        const width = Math.round(Number(widthInput.value));
        const height = Math.round(Number(heightInput.value));
        validateDimensions(width, height);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("No se pudo crear el lienzo.");

        let gradient;
        if (type.value === "radial") {
          const cx = width / 2;
          const cy = height / 2;
          const radius = Math.hypot(width, height) / 2;
          gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        } else {
          const rad = Number(angle.value) * Math.PI / 180;
          const cx = width / 2;
          const cy = height / 2;
          const length = Math.hypot(width, height) / 2;
          const dx = Math.sin(rad) * length;
          const dy = -Math.cos(rad) * length;
          gradient = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
        }

        sortedStops().forEach((stop) => gradient.addColorStop(stop.pos, stop.color));
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        const blob = await canvasToBlob(canvas, "image/png");
        downloadBlob(blob, `gradiente-${width}x${height}.png`);
        showStatus(status, `Gradiente PNG generado a ${width} × ${height}px.`, "success");
      } catch (error) {
        showStatus(status, error.message, "error");
      }
    });

    updateGradient();
  }
})();
