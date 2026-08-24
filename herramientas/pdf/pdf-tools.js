
(() => {
  "use strict";

  const tool = document.body.dataset.pdfTool;
  const { PDFDocument, StandardFonts, rgb, degrees } = window.PDFLib || {};
  const pdfjs = window.pdfjsLib;
  const Zip = window.JSZip;

  if (pdfjs) {
    pdfjs.GlobalWorkerOptions.workerSrc =
      "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
  }

  const MAX_FILE_SIZE = 250 * 1024 * 1024;

  function $(id) {
    return document.getElementById(id);
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes)) return "—";
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
    return (name.replace(/\.[^/.]+$/, "").trim() || "documento")
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
  }

  function showStatus(element, message, type = "") {
    if (!element) return;
    element.textContent = message;
    element.className = `status-box${type ? ` ${type}` : ""}`;
  }

  function validatePdfFile(file) {
    if (!file) throw new Error("Selecciona un archivo PDF.");

    const looksLikePdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!looksLikePdf) {
      throw new Error("El archivo seleccionado no parece ser un PDF.");
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error("El PDF supera el límite local de 250 MB de esta herramienta.");
    }
  }

  function friendlyPdfError(error) {
    const message = String(error?.message || error || "");

    if (/password|PasswordException|NEED_PASSWORD|INCORRECT_PASSWORD/i.test(message)) {
      return new Error(
        "Este PDF está protegido con contraseña. ToolHub no puede modificarlo sin la contraseña."
      );
    }

    if (/encrypted|encryption/i.test(message)) {
      return new Error(
        "Este PDF tiene protección o restricciones internas. ToolHub creará automáticamente una copia compatible en alta calidad."
      );
    }

    if (/Expected instance of .*undefined|got instance of undefined/i.test(message)) {
      return new Error(
        "Este PDF usa una estructura interna que no puede modificarse directamente. ToolHub utilizará el modo compatible de alta calidad."
      );
    }

    return error instanceof Error
      ? error
      : new Error("No se pudo procesar el PDF.");
  }

  /*
   * Modo de compatibilidad para PDF que pdf-lib no puede modificar
   * directamente por restricciones/cifrado interno.
   *
   * IMPORTANTE:
   * - Las herramientas normales priorizan calidad, no compresión.
   * - Renderizamos a 2.4x y JPEG 98%.
   * - El tamaño físico original de la página se conserva.
   * - El documento queda rasterizado, pero el texto pequeño permanece
   *   mucho más nítido que en la reconstrucción 1x usada anteriormente.
   */
  const COMPATIBILITY_RENDER_SCALE = 2.4;
  const COMPATIBILITY_JPEG_QUALITY = 0.98;

  async function rebuildPdfForCompatibility(file) {
    const statusElement = $("status");
    const pdfJsDoc = await loadPdfJs(file);
    const output = await PDFDocument.create();
    const canvas = document.createElement("canvas");

    showStatus(
      statusElement,
      `PDF con restricciones detectado. Creando copia compatible en alta calidad (0/${pdfJsDoc.numPages})...`
    );

    for (let pageNumber = 1; pageNumber <= pdfJsDoc.numPages; pageNumber++) {
      const page = await pdfJsDoc.getPage(pageNumber);
      const originalViewport = page.getViewport({ scale: 1 });

      const viewport = page.getViewport({
        scale: COMPATIBILITY_RENDER_SCALE,
      });

      canvas.width = Math.max(1, Math.ceil(viewport.width));
      canvas.height = Math.max(1, Math.ceil(viewport.height));

      const ctx = canvas.getContext("2d", {
        alpha: false,
        willReadFrequently: false,
      });

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      await page.render({
        canvasContext: ctx,
        viewport,
        background: "white",
        intent: "print",
      }).promise;

      const blob = await blobFromCanvas(
        canvas,
        "image/jpeg",
        COMPATIBILITY_JPEG_QUALITY
      );

      const jpgBytes = new Uint8Array(await blob.arrayBuffer());
      const image = await output.embedJpg(jpgBytes);

      const outPage = output.addPage([
        originalViewport.width,
        originalViewport.height,
      ]);

      outPage.drawImage(image, {
        x: 0,
        y: 0,
        width: originalViewport.width,
        height: originalViewport.height,
      });

      showStatus(
        statusElement,
        `Modo compatible de alta calidad: procesando página ${pageNumber} de ${pdfJsDoc.numPages}...`
      );

      /*
       * Liberar memoria del canvas entre páginas es importante en
       * documentos largos (manuales de 100+ páginas).
       */
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (page.cleanup) {
        page.cleanup();
      }

      if (pageNumber % 2 === 0) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    }

    canvas.width = 1;
    canvas.height = 1;

    showStatus(
      statusElement,
      "Copia compatible de alta calidad creada. Continuando con la operación...",
      "success"
    );

    return output;
  }

  async function loadPdfLib(file) {
    validatePdfFile(file);
    const bytes = await file.arrayBuffer();

    try {
      return await PDFDocument.load(bytes);
    } catch (error) {
      const message = String(error?.message || "");

      if (/password|PasswordException|NEED_PASSWORD|INCORRECT_PASSWORD/i.test(message)) {
        throw friendlyPdfError(error);
      }

      if (/encrypted|encryption/i.test(message)) {
        return await rebuildPdfForCompatibility(file);
      }

      throw friendlyPdfError(error);
    }
  }

  async function loadPdfJs(file) {
    validatePdfFile(file);

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());

      const task = pdfjs.getDocument({
        data: bytes,
        stopAtErrors: false,
      });

      return await task.promise;
    } catch (error) {
      throw friendlyPdfError(error);
    }
  }

  function downloadBytes(bytes, filename, mime = "application/pdf") {
    const blob = bytes instanceof Blob
      ? bytes
      : new Blob([bytes], { type: mime });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function setupDropZone(zone, input, onFiles, multiple = false) {
    if (!zone || !input) return;

    zone.addEventListener("click", () => input.click());

    zone.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        input.click();
      }
    });

    input.addEventListener("change", () => {
      const files = [...(input.files || [])];

      if (files.length) {
        onFiles(multiple ? files : files.slice(0, 1));
      }

      input.value = "";
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
      const files = [...(event.dataTransfer?.files || [])];
      if (files.length) {
        onFiles(multiple ? files : files.slice(0, 1));
      }
    });
  }

  function parsePageRange(text, pageCount) {
    const value = String(text || "").trim();

    if (!value) {
      return Array.from({ length: pageCount }, (_, index) => index);
    }

    const result = new Set();

    for (const rawPart of value.split(",")) {
      const part = rawPart.trim();
      if (!part) continue;

      const match = part.match(/^(\d+)(?:\s*-\s*(\d+))?$/);

      if (!match) {
        throw new Error(`Rango no válido: "${part}". Usa por ejemplo 1-3,5,8.`);
      }

      let start = Number(match[1]);
      let end = match[2] ? Number(match[2]) : start;

      if (
        start < 1 ||
        end < 1 ||
        start > pageCount ||
        end > pageCount
      ) {
        throw new Error(
          `El rango "${part}" está fuera de las ${pageCount} páginas.`
        );
      }

      if (end < start) {
        [start, end] = [end, start];
      }

      for (let page = start; page <= end; page++) {
        result.add(page - 1);
      }
    }

    return [...result].sort((a, b) => a - b);
  }

  async function renderPdfPage(pdfJsDoc, pageNumber, canvas, maxWidth = 760) {
    const page = await pdfJsDoc.getPage(pageNumber);
    const raw = page.getViewport({ scale: 1 });
    const scale = Math.min(
      1.8,
      Math.max(0.65, maxWidth / raw.width)
    );
    const viewport = page.getViewport({ scale });

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    const ctx = canvas.getContext("2d", { alpha: false });

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport,
      background: "white",
    }).promise;

    return {
      page,
      viewport,
      pageWidth: raw.width,
      pageHeight: raw.height,
      scale,
    };
  }

  function canvasClickToPdf(event, canvas, pageWidth, pageHeight) {
    const rect = canvas.getBoundingClientRect();

    const xRatio =
      (event.clientX - rect.left) / rect.width;

    const yRatio =
      (event.clientY - rect.top) / rect.height;

    return {
      x: Math.max(
        0,
        Math.min(pageWidth, xRatio * pageWidth)
      ),
      y: Math.max(
        0,
        Math.min(pageHeight, pageHeight - yRatio * pageHeight)
      ),
      canvasX: xRatio * canvas.width,
      canvasY: yRatio * canvas.height,
    };
  }

  function pdfRectFromCanvas(
    start,
    end,
    canvas,
    pageWidth,
    pageHeight
  ) {
    const rect = canvas.getBoundingClientRect();

    const x1 =
      ((start.clientX - rect.left) / rect.width) *
      pageWidth;

    const x2 =
      ((end.clientX - rect.left) / rect.width) *
      pageWidth;

    const y1 =
      pageHeight -
      ((start.clientY - rect.top) / rect.height) *
        pageHeight;

    const y2 =
      pageHeight -
      ((end.clientY - rect.top) / rect.height) *
        pageHeight;

    return {
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1),
    };
  }

  function hexToRgb(hex) {
    const clean = String(hex || "#000000").replace("#", "");

    if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
      return rgb(0, 0, 0);
    }

    return rgb(
      parseInt(clean.slice(0, 2), 16) / 255,
      parseInt(clean.slice(2, 4), 16) / 255,
      parseInt(clean.slice(4, 6), 16) / 255
    );
  }

  function cssHexToRgb(hex) {
    const clean = String(hex || "#000000").replace("#", "");

    if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
      return "rgb(0,0,0)";
    }

    return `rgb(${parseInt(clean.slice(0,2),16)},${parseInt(clean.slice(2,4),16)},${parseInt(clean.slice(4,6),16)})`;
  }

  function blobFromCanvas(canvas, mime, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("No se pudo generar la imagen intermedia."));
      }, mime, quality);
    });
  }

  // ==============================================================
  // DIVIDIR
  // ==============================================================
  if (tool === "split") {
    let file = null;
    let pageCount = 0;

    const dropZone = $("dropZone");
    const fileInput = $("fileInput");
    const summary = $("fileSummary");
    const fileName = $("fileName");
    const fileMeta = $("fileMeta");
    const rangeInput = $("pageRange");
    const mode = $("splitMode");
    const action = $("splitBtn");
    const status = $("status");

    setupDropZone(
      dropZone,
      fileInput,
      async ([selected]) => {
        try {
          validatePdfFile(selected);
          showStatus(status, "Leyendo PDF...");

          const doc = await loadPdfJs(selected);

          file = selected;
          pageCount = doc.numPages;

          summary.hidden = false;
          fileName.textContent = selected.name;
          fileMeta.innerHTML =
            `<span>${pageCount} páginas</span>` +
            `<span>${formatBytes(selected.size)}</span>`;

          rangeInput.value = `1-${pageCount}`;
          action.disabled = false;

          showStatus(
            status,
            "PDF preparado para dividir.",
            "success"
          );
        } catch (error) {
          showStatus(
            status,
            friendlyPdfError(error).message,
            "error"
          );
        }
      }
    );

    action.addEventListener("click", async () => {
      if (!file) return;

      try {
        action.disabled = true;
        showStatus(status, "Dividiendo PDF...");

        const indexes =
          parsePageRange(rangeInput.value, pageCount);

        if (!indexes.length) {
          throw new Error("Selecciona al menos una página.");
        }

        const source = await loadPdfLib(file);
        const stem = safeStem(file.name);

        if (mode.value === "single") {
          const output = await PDFDocument.create();
          const pages =
            await output.copyPages(source, indexes);

          pages.forEach((page) => output.addPage(page));

          const bytes = await output.save({
            useObjectStreams: true,
          });

          downloadBytes(
            bytes,
            `${stem}-paginas-${indexes
              .map((i) => i + 1)
              .join("_")}.pdf`
          );
        } else {
          const zip = new Zip();

          for (let i = 0; i < indexes.length; i++) {
            const output = await PDFDocument.create();
            const [page] =
              await output.copyPages(source, [indexes[i]]);

            output.addPage(page);

            const bytes = await output.save({
              useObjectStreams: true,
            });

            zip.file(
              `${stem}-pagina-${indexes[i] + 1}.pdf`,
              bytes
            );

            showStatus(
              status,
              `Preparando página ${i + 1} de ${indexes.length}...`
            );
          }

          const blob = await zip.generateAsync({
            type: "blob",
          });

          downloadBytes(
            blob,
            `${stem}-paginas.zip`,
            "application/zip"
          );
        }

        showStatus(
          status,
          "División completada.",
          "success"
        );
      } catch (error) {
        showStatus(
          status,
          friendlyPdfError(error).message,
          "error"
        );
      } finally {
        action.disabled = false;
      }
    });
  }

  // ==============================================================
  // UNIR
  // ==============================================================
  if (tool === "merge") {
    const files = [];

    const dropZone = $("dropZone");
    const fileInput = $("fileInput");
    const list = $("pdfFileList");
    const action = $("mergeBtn");
    const status = $("status");

    function renderList() {
      list.innerHTML = "";

      files.forEach((file, index) => {
        const row = document.createElement("div");
        row.className = "pdf-file-row";

        const info = document.createElement("div");
        const strong = document.createElement("strong");
        strong.textContent = `${index + 1}. ${file.name}`;

        const small = document.createElement("small");
        small.textContent = formatBytes(file.size);

        info.append(strong, small);

        const actions = document.createElement("div");
        actions.className = "pdf-file-actions";

        const up = document.createElement("button");
        up.type = "button";
        up.className = "mini-button";
        up.textContent = "↑";
        up.title = "Subir";
        up.disabled = index === 0;

        up.addEventListener("click", () => {
          [files[index - 1], files[index]] =
            [files[index], files[index - 1]];

          renderList();
        });

        const down = document.createElement("button");
        down.type = "button";
        down.className = "mini-button";
        down.textContent = "↓";
        down.title = "Bajar";
        down.disabled = index === files.length - 1;

        down.addEventListener("click", () => {
          [files[index + 1], files[index]] =
            [files[index], files[index + 1]];

          renderList();
        });

        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "mini-button danger";
        remove.textContent = "×";
        remove.title = "Quitar";

        remove.addEventListener("click", () => {
          files.splice(index, 1);
          renderList();
        });

        actions.append(up, down, remove);
        row.append(info, actions);
        list.append(row);
      });

      action.disabled = files.length < 2;

      if (files.length) {
        showStatus(
          status,
          `${files.length} PDF preparados.`,
          "success"
        );
      } else {
        showStatus(status, "Añade al menos dos PDF.");
      }
    }

    setupDropZone(
      dropZone,
      fileInput,
      (selectedFiles) => {
        try {
          selectedFiles.forEach(validatePdfFile);
          files.push(...selectedFiles);
          renderList();
        } catch (error) {
          showStatus(
            status,
            friendlyPdfError(error).message,
            "error"
          );
        }
      },
      true
    );

    action.addEventListener("click", async () => {
      if (files.length < 2) return;

      try {
        action.disabled = true;

        const output = await PDFDocument.create();

        for (let i = 0; i < files.length; i++) {
          showStatus(
            status,
            `Uniendo PDF ${i + 1} de ${files.length}...`
          );

          const source = await loadPdfLib(files[i]);
          const indexes = source.getPageIndices();
          const pages =
            await output.copyPages(source, indexes);

          pages.forEach((page) => output.addPage(page));
        }

        const bytes = await output.save({
          useObjectStreams: true,
        });

        downloadBytes(
          bytes,
          "toolhub-pdf-unido.pdf"
        );

        showStatus(
          status,
          "PDF unidos correctamente.",
          "success"
        );
      } catch (error) {
        showStatus(
          status,
          friendlyPdfError(error).message,
          "error"
        );
      } finally {
        action.disabled = files.length < 2;
      }
    });

    renderList();
  }

  // ==============================================================
  // OPTIMIZAR
  // ==============================================================
  if (tool === "optimize") {
    let file = null;

    const dropZone = $("dropZone");
    const fileInput = $("fileInput");
    const summary = $("fileSummary");
    const fileName = $("fileName");
    const fileMeta = $("fileMeta");
    const mode = $("optimizeMode");
    const quality = $("jpegQuality");
    const qualityValue = $("jpegQualityValue");
    const scale = $("renderScale");
    const rasterControls = $("rasterControls");
    const action = $("optimizeBtn");
    const status = $("status");
    const result = $("resultBox");
    const progress = $("progress");

    function refreshMode() {
      rasterControls.classList.toggle(
        "hidden-control",
        mode.value !== "raster"
      );
    }

    quality.addEventListener("input", () => {
      qualityValue.textContent = `${quality.value}%`;
    });

    mode.addEventListener("change", refreshMode);
    refreshMode();

    setupDropZone(
      dropZone,
      fileInput,
      async ([selected]) => {
        try {
          validatePdfFile(selected);

          const doc = await loadPdfJs(selected);

          file = selected;

          summary.hidden = false;
          fileName.textContent = selected.name;
          fileMeta.innerHTML =
            `<span>${doc.numPages} páginas</span>` +
            `<span>${formatBytes(selected.size)}</span>`;

          action.disabled = false;
          result.hidden = true;

          showStatus(
            status,
            "PDF preparado para optimizar.",
            "success"
          );
        } catch (error) {
          showStatus(
            status,
            friendlyPdfError(error).message,
            "error"
          );
        }
      }
    );

    action.addEventListener("click", async () => {
      if (!file) return;

      try {
        action.disabled = true;
        result.hidden = true;
        progress.hidden = false;
        progress.value = 0;

        let bytes;

        if (mode.value === "lossless") {
          showStatus(
            status,
            "Reorganizando y guardando el PDF..."
          );

          const source = await loadPdfLib(file);

          bytes = await source.save({
            useObjectStreams: true,
          });

          progress.value = 100;
        } else {
          showStatus(
            status,
            "Comprimiendo páginas como imágenes..."
          );

          const pdfJsDoc = await loadPdfJs(file);
          const output = await PDFDocument.create();
          const canvas = document.createElement("canvas");

          const renderScale = Number(scale.value);
          const jpegQuality =
            Number(quality.value) / 100;

          for (
            let pageNumber = 1;
            pageNumber <= pdfJsDoc.numPages;
            pageNumber++
          ) {
            const page =
              await pdfJsDoc.getPage(pageNumber);

            const originalViewport =
              page.getViewport({ scale: 1 });

            const viewport =
              page.getViewport({ scale: renderScale });

            canvas.width =
              Math.floor(viewport.width);

            canvas.height =
              Math.floor(viewport.height);

            const ctx =
              canvas.getContext("2d", { alpha: false });

            ctx.fillStyle = "#ffffff";
            ctx.fillRect(
              0,
              0,
              canvas.width,
              canvas.height
            );

            await page.render({
              canvasContext: ctx,
              viewport,
              background: "white",
            }).promise;

            const blob =
              await blobFromCanvas(
                canvas,
                "image/jpeg",
                jpegQuality
              );

            const jpgBytes =
              new Uint8Array(
                await blob.arrayBuffer()
              );

            const image =
              await output.embedJpg(jpgBytes);

            const outPage =
              output.addPage([
                originalViewport.width,
                originalViewport.height,
              ]);

            outPage.drawImage(image, {
              x: 0,
              y: 0,
              width: originalViewport.width,
              height: originalViewport.height,
            });

            progress.value =
              Math.round(
                (pageNumber / pdfJsDoc.numPages) * 100
              );

            showStatus(
              status,
              `Comprimiendo página ${pageNumber} de ${pdfJsDoc.numPages}...`
            );
          }

          bytes = await output.save({
            useObjectStreams: true,
          });
        }

        const before = file.size;
        const after = bytes.length;
        const delta =
          ((before - after) / before) * 100;

        downloadBytes(
          bytes,
          `${safeStem(file.name)}-optimizado.pdf`
        );

        result.hidden = false;
        result.innerHTML = `
          <strong>Original:</strong> ${formatBytes(before)} ·
          <strong>Resultado:</strong> ${formatBytes(after)} ·
          <strong>Diferencia:</strong>
          ${
            delta >= 0
              ? `${delta.toFixed(1)}% menos`
              : `${Math.abs(delta).toFixed(1)}% más`
          }.
        `;

        showStatus(
          status,
          delta >= 0
            ? "Optimización completada."
            : "El resultado pesa más que el original. Prueba una calidad o escala menor.",
          delta >= 0 ? "success" : "error"
        );
      } catch (error) {
        showStatus(
          status,
          friendlyPdfError(error).message,
          "error"
        );
      } finally {
        progress.hidden = true;
        action.disabled = false;
      }
    });
  }

  // ==============================================================
  // PDF A WORD
  // ==============================================================
  if (tool === "word") {
    let file = null;
    let pageCount = 0;

    const dropZone = $("dropZone");
    const fileInput = $("fileInput");
    const summary = $("fileSummary");
    const fileName = $("fileName");
    const fileMeta = $("fileMeta");
    const rangeInput = $("pageRange");
    const action = $("wordBtn");
    const status = $("status");
    const progress = $("progress");
    const result = $("resultBox");

    function xmlEscape(text) {
      return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
    }

    function lineText(items) {
      return items
        .sort((a, b) => a.x - b.x)
        .map((item) => item.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
    }

    async function extractLines(page) {
      const content =
        await page.getTextContent();

      const rows = [];

      for (const item of content.items || []) {
        const text =
          String(item.str || "").trim();

        if (!text) continue;

        const x =
          Number(item.transform?.[4] || 0);

        const y =
          Number(item.transform?.[5] || 0);

        let row =
          rows.find(
            (candidate) =>
              Math.abs(candidate.y - y) <= 3
          );

        if (!row) {
          row = { y, items: [] };
          rows.push(row);
        }

        row.items.push({ x, text });
      }

      rows.sort((a, b) => b.y - a.y);

      return rows
        .map((row) => lineText(row.items))
        .filter(Boolean);
    }

    async function buildDocx(pages, title) {
      const zip = new Zip();

      zip.file(
        "[Content_Types].xml",
`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`
      );

      zip.folder("_rels").file(
        ".rels",
`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`
      );

      zip
        .folder("word")
        .folder("_rels")
        .file(
          "document.xml.rels",
`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
        );

      zip
        .folder("word")
        .file(
          "styles.xml",
`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
    <w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr>
  </w:style>
</w:styles>`
        );

      let body = "";

      pages.forEach(
        (pageLines, pageIndex) => {
          pageLines.forEach((line) => {
            body +=
              `<w:p><w:r><w:t xml:space="preserve">` +
              `${xmlEscape(line)}` +
              `</w:t></w:r></w:p>`;
          });

          if (pageIndex < pages.length - 1) {
            body +=
              `<w:p><w:r><w:br w:type="page"/>` +
              `</w:r></w:p>`;
          }
        }
      );

      zip.folder("word").file(
        "document.xml",
`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${body}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`
      );

      const now = new Date().toISOString();

      zip.folder("docProps").file(
        "core.xml",
`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties
 xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
 xmlns:dc="http://purl.org/dc/elements/1.1/"
 xmlns:dcterms="http://purl.org/dc/terms/"
 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${xmlEscape(title)}</dc:title>
  <dc:creator>ToolHub</dc:creator>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
</cp:coreProperties>`
      );

      zip.folder("docProps").file(
        "app.xml",
`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>ToolHub</Application>
</Properties>`
      );

      return zip.generateAsync({
        type: "blob",
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
    }

    setupDropZone(
      dropZone,
      fileInput,
      async ([selected]) => {
        try {
          validatePdfFile(selected);

          showStatus(
            status,
            "Analizando PDF..."
          );

          const doc =
            await loadPdfJs(selected);

          file = selected;
          pageCount = doc.numPages;

          summary.hidden = false;
          fileName.textContent = selected.name;
          fileMeta.innerHTML =
            `<span>${pageCount} páginas</span>` +
            `<span>${formatBytes(selected.size)}</span>`;

          rangeInput.value =
            `1-${pageCount}`;

          action.disabled = false;
          result.hidden = true;

          showStatus(
            status,
            "PDF preparado para extraer texto a Word.",
            "success"
          );
        } catch (error) {
          showStatus(
            status,
            friendlyPdfError(error).message,
            "error"
          );
        }
      }
    );

    action.addEventListener(
      "click",
      async () => {
        if (!file) return;

        try {
          action.disabled = true;
          progress.hidden = false;
          progress.value = 0;
          result.hidden = true;

          const doc =
            await loadPdfJs(file);

          const indexes =
            parsePageRange(
              rangeInput.value,
              pageCount
            );

          const pages = [];
          let totalLines = 0;

          for (
            let i = 0;
            i < indexes.length;
            i++
          ) {
            const pageNumber =
              indexes[i] + 1;

            showStatus(
              status,
              `Extrayendo texto de la página ${pageNumber}...`
            );

            const page =
              await doc.getPage(pageNumber);

            const lines =
              await extractLines(page);

            totalLines += lines.length;
            pages.push(lines);

            progress.value =
              Math.round(
                ((i + 1) / indexes.length) * 100
              );
          }

          if (!totalLines) {
            throw new Error(
              "No se encontró texto seleccionable. El PDF puede ser escaneado y necesitar OCR."
            );
          }

          showStatus(
            status,
            "Creando documento Word..."
          );

          const blob =
            await buildDocx(
              pages,
              safeStem(file.name)
            );

          downloadBytes(
            blob,
            `${safeStem(file.name)}.docx`,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          );

          result.hidden = false;
          result.innerHTML =
            `<strong>${totalLines}</strong> líneas de texto extraídas de ` +
            `<strong>${indexes.length}</strong> páginas.`;

          showStatus(
            status,
            "Documento Word creado correctamente.",
            "success"
          );
        } catch (error) {
          showStatus(
            status,
            friendlyPdfError(error).message,
            "error"
          );
        } finally {
          action.disabled = false;
          progress.hidden = true;
        }
      }
    );
  }

  // ==============================================================
  // EDITAR PDF · REHECHO
  // ==============================================================
  if (tool === "edit") {
    let file = null;
    let pdfJsDoc = null;
    let pageInfo = null;
    let selectedPoint = null;
    let dragStart = null;
    let pendingRect = null;
    let operations = [];
    let editingIndex = -1;

    const dropZone = $("dropZone");
    const fileInput = $("fileInput");
    const summary = $("fileSummary");
    const fileName = $("fileName");
    const fileMeta = $("fileMeta");

    const canvas = $("pdfCanvas");
    const pageInput = $("pageNumber");
    const type = $("editType");

    const textControls = $("textControls");
    const coverControls = $("coverControls");
    const rotationControls = $("rotationControls");

    const textValue = $("editText");
    const fontSize = $("fontSize");
    const textColor = $("textColor");
    const coverColor = $("coverColor");
    const rotation = $("rotation");

    const pointReadout = $("pointReadout");
    const addBtn = $("addOperation");
    const applyBtn = $("applyEdits");
    const clearBtn = $("clearOperations");
    const cancelEditBtn = $("cancelEdit");
    const list = $("operationList");
    const status = $("status");

    function currentPageNumber() {
      if (!pdfJsDoc) return 1;

      const value =
        Number(pageInput.value) || 1;

      return Math.max(
        1,
        Math.min(pdfJsDoc.numPages, value)
      );
    }

    function scaleX(x) {
      return pageInfo
        ? (x / pageInfo.pageWidth) * canvas.width
        : 0;
    }

    function scaleYFromPdf(y) {
      return pageInfo
        ? ((pageInfo.pageHeight - y) /
            pageInfo.pageHeight) *
            canvas.height
        : 0;
    }

    function rectToCanvas(op) {
      return {
        x:
          (op.x / pageInfo.pageWidth) *
          canvas.width,
        y:
          ((pageInfo.pageHeight -
              (op.y + op.height)) /
            pageInfo.pageHeight) *
          canvas.height,
        width:
          (op.width / pageInfo.pageWidth) *
          canvas.width,
        height:
          (op.height / pageInfo.pageHeight) *
          canvas.height,
      };
    }

    async function renderCurrentPage() {
      if (!pdfJsDoc) return;

      const pageNumber =
        currentPageNumber();

      pageInput.value = pageNumber;

      pageInfo =
        await renderPdfPage(
          pdfJsDoc,
          pageNumber,
          canvas,
          700
        );

      drawOperationPreview();
    }

    function drawMultilinePreview(ctx, op) {
      const scale =
        canvas.width /
        pageInfo.pageWidth;

      const fontPx =
        Math.max(8, op.size * scale);

      ctx.save();
      ctx.fillStyle =
        cssHexToRgb(op.color);

      ctx.font =
        `${fontPx}px sans-serif`;

      ctx.textBaseline = "top";

      const x = scaleX(op.x);
      const firstY =
        scaleYFromPdf(op.y);

      const lines =
        String(op.text).split(/\r?\n/);

      lines.forEach((line, index) => {
        ctx.fillText(
          line,
          x,
          firstY +
            index * fontPx * 1.25
        );
      });

      ctx.restore();
    }

    function drawOperationPreview() {
      if (!pageInfo) return;

      const ctx =
        canvas.getContext("2d");

      const currentPage =
        currentPageNumber();

      for (const op of operations) {
        if (op.page !== currentPage) continue;

        if (op.type === "text") {
          drawMultilinePreview(ctx, op);
        }

        if (op.type === "cover") {
          const r =
            rectToCanvas(op);

          ctx.save();
          ctx.fillStyle =
            cssHexToRgb(op.color);

          ctx.globalAlpha = 0.85;

          ctx.fillRect(
            r.x,
            r.y,
            r.width,
            r.height
          );

          ctx.strokeStyle =
            "#ff3d7f";

          ctx.lineWidth = 2;

          ctx.strokeRect(
            r.x,
            r.y,
            r.width,
            r.height
          );

          ctx.restore();
        }

        if (op.type === "rotate") {
          ctx.save();
          ctx.fillStyle =
            "rgba(51,148,255,.9)";

          ctx.font =
            "bold 16px sans-serif";

          ctx.fillText(
            `Rotación pendiente: ${op.rotation}°`,
            18,
            28
          );

          ctx.restore();
        }
      }

      if (
        selectedPoint &&
        type.value === "text"
      ) {
        ctx.save();
        ctx.strokeStyle = "#ff3d7f";
        ctx.fillStyle = "#ff3d7f";
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(
          selectedPoint.canvasX,
          selectedPoint.canvasY,
          8,
          0,
          Math.PI * 2
        );
        ctx.stroke();

        ctx.restore();
      }

      if (
        pendingRect &&
        type.value === "cover"
      ) {
        const r =
          rectToCanvas(pendingRect);

        ctx.save();
        ctx.fillStyle =
          cssHexToRgb(
            coverColor.value
          );

        ctx.globalAlpha = 0.55;

        ctx.fillRect(
          r.x,
          r.y,
          r.width,
          r.height
        );

        ctx.strokeStyle = "#ff3d7f";
        ctx.lineWidth = 2;

        ctx.strokeRect(
          r.x,
          r.y,
          r.width,
          r.height
        );

        ctx.restore();
      }
    }

    function refreshType() {
      textControls.classList.toggle(
        "hidden-control",
        type.value !== "text"
      );

      coverControls.classList.toggle(
        "hidden-control",
        type.value !== "cover"
      );

      rotationControls.classList.toggle(
        "hidden-control",
        type.value !== "rotate"
      );

      selectedPoint = null;
      pendingRect = null;

      if (type.value === "text") {
        pointReadout.innerHTML =
          "<strong>Texto:</strong> haz clic en la página donde quieres que empiece el texto.";

        addBtn.textContent =
          "Añadir texto";

        addBtn.disabled = true;
      }

      if (type.value === "cover") {
        pointReadout.innerHTML =
          "<strong>Tapar zona:</strong> arrastra con el ratón sobre la zona que quieres cubrir.";

        addBtn.textContent =
          "Añadir zona tapada";

        addBtn.disabled = true;
      }

      if (type.value === "rotate") {
        pointReadout.innerHTML =
          "<strong>Rotar:</strong> la rotación afecta a toda la página seleccionada.";

        addBtn.textContent =
          "Añadir rotación";

        addBtn.disabled = !file;
      }

      renderCurrentPage();
    }

    function resetEditorForm() {
      editingIndex = -1;
      selectedPoint = null;
      pendingRect = null;
      addBtn.textContent =
        type.value === "text"
          ? "Añadir texto"
          : type.value === "cover"
            ? "Añadir zona tapada"
            : "Añadir rotación";
      cancelEditBtn.hidden = true;
      refreshType();
    }

    async function beginEditOperation(index) {
      const op = operations[index];
      if (!op) return;

      editingIndex = index;
      pageInput.value = op.page;
      type.value = op.type;

      await renderCurrentPage();

      if (op.type === "text") {
        textValue.value = op.text;
        fontSize.value = op.size;
        textColor.value = op.color;

        selectedPoint = {
          x: op.x,
          y: op.y,
          canvasX: scaleX(op.x),
          canvasY: scaleYFromPdf(op.y),
        };
      }

      if (op.type === "cover") {
        coverColor.value = op.color;
        pendingRect = {
          x: op.x,
          y: op.y,
          width: op.width,
          height: op.height,
        };
      }

      if (op.type === "rotate") {
        rotation.value = String(op.rotation);
      }

      textControls.classList.toggle("hidden-control", op.type !== "text");
      coverControls.classList.toggle("hidden-control", op.type !== "cover");
      rotationControls.classList.toggle("hidden-control", op.type !== "rotate");

      addBtn.textContent = "Guardar modificación";
      addBtn.disabled = false;
      cancelEditBtn.hidden = false;

      pointReadout.innerHTML =
        `<strong>Editando cambio ${index + 1}:</strong> modifica los valores y pulsa “Guardar modificación”.`;

      await renderCurrentPage();
      drawOperationPreview();
    }

    function renderOperations() {
      list.innerHTML = "";

      operations.forEach(
        (op, index) => {
          const row =
            document.createElement("div");

          row.className =
            "pdf-operation";

          const detail =
            document.createElement("div");

          detail.className =
            "pdf-operation-detail";

          if (op.type === "text") {
            const preview =
              op.text.length > 80
                ? `${op.text.slice(0, 80)}…`
                : op.text;

            detail.innerHTML =
              `<strong>${index + 1}. Texto · pág. ${op.page}</strong>` +
              `<small>${preview.replace(/</g, "&lt;")}</small>`;
          }

          if (op.type === "cover") {
            detail.innerHTML =
              `<strong>${index + 1}. Tapar zona · pág. ${op.page}</strong>` +
              `<small>${op.width.toFixed(0)} × ${op.height.toFixed(0)} pt</small>`;
          }

          if (op.type === "rotate") {
            detail.innerHTML =
              `<strong>${index + 1}. Rotar página ${op.page}</strong>` +
              `<small>${op.rotation}°</small>`;
          }

          const actions = document.createElement("div");
          actions.className = "pdf-file-actions";

          const edit = document.createElement("button");
          edit.type = "button";
          edit.className = "mini-button";
          edit.textContent = "Editar";
          edit.addEventListener("click", async () => {
            await beginEditOperation(index);
          });

          const remove =
            document.createElement("button");

          remove.type = "button";
          remove.className =
            "mini-button danger";
          remove.textContent = "×";

          remove.addEventListener(
            "click",
            async () => {
              operations.splice(
                index,
                1
              );

              if (editingIndex === index) {
                editingIndex = -1;
                cancelEditBtn.hidden = true;
              } else if (editingIndex > index) {
                editingIndex -= 1;
              }

              renderOperations();
              await renderCurrentPage();
            }
          );

          actions.append(edit, remove);
          row.append(detail, actions);
          list.append(row);
        }
      );

      applyBtn.disabled =
        operations.length === 0;

      clearBtn.disabled =
        operations.length === 0;
    }

    setupDropZone(
      dropZone,
      fileInput,
      async ([selected]) => {
        try {
          validatePdfFile(selected);

          showStatus(
            status,
            "Cargando PDF..."
          );

          const doc =
            await loadPdfJs(selected);

          file = selected;
          pdfJsDoc = doc;

          pageInput.max =
            doc.numPages;

          pageInput.value = 1;

          operations = [];
          editingIndex = -1;
          cancelEditBtn.hidden = true;
          renderOperations();

          summary.hidden = false;
          fileName.textContent =
            selected.name;

          fileMeta.innerHTML =
            `<span>${doc.numPages} páginas</span>` +
            `<span>${formatBytes(selected.size)}</span>`;

          await renderCurrentPage();

          refreshType();

          showStatus(
            status,
            "PDF preparado. Puedes añadir varios cambios antes de descargar.",
            "success"
          );
        } catch (error) {
          showStatus(
            status,
            friendlyPdfError(error).message,
            "error"
          );
        }
      }
    );

    pageInput.addEventListener(
      "change",
      async () => {
        selectedPoint = null;
        pendingRect = null;
        await renderCurrentPage();
        refreshType();
      }
    );

    type.addEventListener(
      "change",
      () => {
        if (editingIndex >= 0) {
          editingIndex = -1;
          cancelEditBtn.hidden = true;
        }
        refreshType();
      }
    );

    canvas.addEventListener(
      "click",
      async (event) => {
        if (
          !pageInfo ||
          type.value !== "text"
        ) {
          return;
        }

        await renderCurrentPage();

        selectedPoint =
          canvasClickToPdf(
            event,
            canvas,
            pageInfo.pageWidth,
            pageInfo.pageHeight
          );

        drawOperationPreview();

        pointReadout.innerHTML =
          `<strong>Texto:</strong> posición X ${selectedPoint.x.toFixed(0)} · Y ${selectedPoint.y.toFixed(0)}`;

        addBtn.disabled = false;
      }
    );

    canvas.addEventListener(
      "pointerdown",
      (event) => {
        if (
          !pageInfo ||
          type.value !== "cover"
        ) {
          return;
        }

        dragStart = {
          clientX: event.clientX,
          clientY: event.clientY,
        };

        canvas.setPointerCapture(
          event.pointerId
        );
      }
    );

    canvas.addEventListener(
      "pointermove",
      async (event) => {
        if (
          !dragStart ||
          type.value !== "cover" ||
          !pageInfo
        ) {
          return;
        }

        pendingRect =
          pdfRectFromCanvas(
            dragStart,
            {
              clientX: event.clientX,
              clientY: event.clientY,
            },
            canvas,
            pageInfo.pageWidth,
            pageInfo.pageHeight
          );

        await renderCurrentPage();
        drawOperationPreview();
      }
    );

    canvas.addEventListener(
      "pointerup",
      async (event) => {
        if (
          !dragStart ||
          type.value !== "cover" ||
          !pageInfo
        ) {
          return;
        }

        pendingRect =
          pdfRectFromCanvas(
            dragStart,
            {
              clientX: event.clientX,
              clientY: event.clientY,
            },
            canvas,
            pageInfo.pageWidth,
            pageInfo.pageHeight
          );

        dragStart = null;

        if (
          pendingRect.width < 4 ||
          pendingRect.height < 4
        ) {
          pendingRect = null;
          addBtn.disabled = true;

          pointReadout.innerHTML =
            "<strong>Tapar zona:</strong> arrastra una zona más grande.";
        } else {
          addBtn.disabled = false;

          pointReadout.innerHTML =
            `<strong>Zona seleccionada:</strong> ${pendingRect.width.toFixed(0)} × ${pendingRect.height.toFixed(0)} pt`;
        }

        await renderCurrentPage();
        drawOperationPreview();
      }
    );

    addBtn.addEventListener(
      "click",
      async () => {
        if (!file) return;

        const page =
          currentPageNumber();

        let newOperation = null;

        if (type.value === "text") {
          const text = textValue.value.trim();

          if (!text) {
            showStatus(status, "Escribe el texto que quieres añadir.", "error");
            return;
          }

          if (!selectedPoint) {
            showStatus(status, "Haz clic en la página para elegir dónde colocar el texto.", "error");
            return;
          }

          newOperation = {
            type: "text",
            page,
            x: selectedPoint.x,
            y: selectedPoint.y,
            text,
            size: Math.max(6, Math.min(96, Number(fontSize.value) || 18)),
            color: textColor.value,
          };
        }

        if (type.value === "cover") {
          if (!pendingRect) {
            showStatus(status, "Arrastra sobre la página la zona que quieres tapar.", "error");
            return;
          }

          newOperation = {
            type: "cover",
            page,
            ...pendingRect,
            color: coverColor.value,
          };
        }

        if (type.value === "rotate") {
          newOperation = {
            type: "rotate",
            page,
            rotation: Number(rotation.value),
          };
        }

        const wasEditing = editingIndex >= 0;

        if (wasEditing) {
          operations[editingIndex] = newOperation;
        } else {
          operations.push(newOperation);
        }

        editingIndex = -1;
        cancelEditBtn.hidden = true;
        selectedPoint = null;
        pendingRect = null;

        renderOperations();
        await renderCurrentPage();
        refreshType();

        showStatus(
          status,
          wasEditing
            ? "Cambio actualizado correctamente."
            : "Cambio añadido. Puedes añadir más antes de descargar.",
          "success"
        );
      }
    );

    cancelEditBtn.addEventListener(
      "click",
      async () => {
        editingIndex = -1;
        cancelEditBtn.hidden = true;
        selectedPoint = null;
        pendingRect = null;
        await renderCurrentPage();
        refreshType();
        showStatus(status, "Edición cancelada.");
      }
    );

    clearBtn.addEventListener(
      "click",
      async () => {
        operations = [];
        editingIndex = -1;
        cancelEditBtn.hidden = true;
        selectedPoint = null;
        pendingRect = null;

        renderOperations();
        await renderCurrentPage();

        showStatus(
          status,
          "Lista de cambios vaciada."
        );
      }
    );

    async function drawMultilinePdfText(
      page,
      font,
      op
    ) {
      const lines =
        String(op.text).split(/\r?\n/);

      const lineHeight =
        op.size * 1.25;

      lines.forEach(
        (line, index) => {
          if (!line) return;

          page.drawText(
            line,
            {
              x: op.x,
              y:
                op.y -
                op.size -
                index * lineHeight,
              size: op.size,
              font,
              color:
                hexToRgb(op.color),
            }
          );
        }
      );
    }

    applyBtn.addEventListener(
      "click",
      async () => {
        if (
          !file ||
          !operations.length
        ) {
          return;
        }

        try {
          applyBtn.disabled = true;

          showStatus(
            status,
            "Aplicando cambios..."
          );

          const doc =
            await loadPdfLib(file);

          const font =
            await doc.embedFont(
              StandardFonts.Helvetica
            );

          for (const op of operations) {
            const page =
              doc.getPage(op.page - 1);

            if (op.type === "text") {
              await drawMultilinePdfText(
                page,
                font,
                op
              );
            }

            if (op.type === "cover") {
              page.drawRectangle({
                x: op.x,
                y: op.y,
                width: op.width,
                height: op.height,
                color:
                  hexToRgb(op.color),
                opacity: 1,
              });
            }

            if (op.type === "rotate") {
              const current =
                page.getRotation().angle || 0;

              page.setRotation(
                degrees(
                  (current +
                    op.rotation) %
                    360
                )
              );
            }
          }

          const bytes =
            await doc.save({
              useObjectStreams: true,
            });

          downloadBytes(
            bytes,
            `${safeStem(file.name)}-editado.pdf`
          );

          showStatus(
            status,
            "PDF editado y descargado.",
            "success"
          );
        } catch (error) {
          showStatus(
            status,
            friendlyPdfError(error).message,
            "error"
          );
        } finally {
          applyBtn.disabled =
            operations.length === 0;
        }
      }
    );

    renderOperations();
  }

  // ==============================================================
  // FIRMAR PDF · TEXTO O IMAGEN
  // ==============================================================
  if (tool === "sign") {
    let file = null;
    let pdfJsDoc = null;
    let pageInfo = null;
    let selectedPoint = null;
    let signatureImageFile = null;
    let signatureImagePreview = null;

    const dropZone = $("dropZone");
    const fileInput = $("fileInput");
    const summary = $("fileSummary");
    const fileName = $("fileName");
    const fileMeta = $("fileMeta");

    const pageInput = $("pageNumber");
    const pdfCanvas = $("pdfCanvas");

    const signatureType =
      document.querySelectorAll(
        'input[name="signatureType"]'
      );

    const textControls =
      $("signatureTextControls");

    const imageControls =
      $("signatureImageControls");

    const signatureText =
      $("signatureText");

    const signatureFontSize =
      $("signatureFontSize");

    const signatureColor =
      $("signatureColor");

    const signatureImageInput =
      $("signatureImageInput");

    const imagePreviewName =
      $("signatureImageName");

    const signatureWidth =
      $("signatureWidth");

    const signatureWidthValue =
      $("signatureWidthValue");

    const signBtn = $("signBtn");
    const pointReadout =
      $("pointReadout");

    const status = $("status");

    function currentSignatureType() {
      return (
        [...signatureType]
          .find((radio) => radio.checked)
          ?.value || "text"
      );
    }

    function refreshSignatureType() {
      const type =
        currentSignatureType();

      textControls.classList.toggle(
        "hidden-control",
        type !== "text"
      );

      imageControls.classList.toggle(
        "hidden-control",
        type !== "image"
      );

      renderCurrentPage();
    }

    signatureType.forEach((radio) => {
      radio.addEventListener(
        "change",
        refreshSignatureType
      );
    });

    signatureImageInput.addEventListener(
      "change",
      () => {
        signatureImageFile =
          signatureImageInput.files?.[0] ||
          null;

        if (signatureImagePreview) {
          URL.revokeObjectURL(
            signatureImagePreview
          );

          signatureImagePreview = null;
        }

        if (signatureImageFile) {
          signatureImagePreview =
            URL.createObjectURL(
              signatureImageFile
            );

          imagePreviewName.textContent =
            signatureImageFile.name;
        } else {
          imagePreviewName.textContent =
            "Ninguna imagen seleccionada.";
        }

        renderCurrentPage();
      }
    );

    signatureWidth.addEventListener(
      "input",
      () => {
        signatureWidthValue.textContent =
          `${signatureWidth.value} pt`;

        renderCurrentPage();
      }
    );

    [
      signatureText,
      signatureFontSize,
      signatureColor,
    ].forEach((control) => {
      control.addEventListener(
        "input",
        renderCurrentPage
      );
    });

    async function renderSignaturePreview() {
      if (!pageInfo || !selectedPoint) return;

      const ctx =
        pdfCanvas.getContext("2d");

      const x =
        (selectedPoint.x /
          pageInfo.pageWidth) *
        pdfCanvas.width;

      const y =
        ((pageInfo.pageHeight -
            selectedPoint.y) /
          pageInfo.pageHeight) *
        pdfCanvas.height;

      ctx.save();

      if (
        currentSignatureType() === "text"
      ) {
        const text =
          signatureText.value.trim();

        if (text) {
          const scale =
            pdfCanvas.width /
            pageInfo.pageWidth;

          const size =
            Math.max(
              12,
              Number(
                signatureFontSize.value
              ) || 28
            ) * scale;

          ctx.fillStyle =
            cssHexToRgb(
              signatureColor.value
            );

          ctx.font =
            `italic ${size}px cursive`;

          ctx.textBaseline = "top";

          ctx.fillText(
            text,
            x,
            y
          );
        }
      } else if (signatureImagePreview) {
        await new Promise((resolve) => {
          const image = new Image();

          image.onload = () => {
            const pdfWidth =
              Number(
                signatureWidth.value
              ) || 160;

            const scale =
              pdfCanvas.width /
              pageInfo.pageWidth;

            const width =
              pdfWidth * scale;

            const height =
              width *
              (image.height /
                image.width);

            ctx.globalAlpha = 0.92;

            ctx.drawImage(
              image,
              x,
              y,
              width,
              height
            );

            resolve();
          };

          image.onerror = resolve;
          image.src =
            signatureImagePreview;
        });
      }

      ctx.strokeStyle =
        "#ff3d7f";

      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.arc(
        x,
        y,
        7,
        0,
        Math.PI * 2
      );
      ctx.stroke();

      ctx.restore();
    }

    async function renderCurrentPage() {
      if (!pdfJsDoc) return;

      const pageNumber =
        Math.max(
          1,
          Math.min(
            pdfJsDoc.numPages,
            Number(pageInput.value) || 1
          )
        );

      pageInput.value =
        pageNumber;

      pageInfo =
        await renderPdfPage(
          pdfJsDoc,
          pageNumber,
          pdfCanvas,
          700
        );

      await renderSignaturePreview();
    }

    setupDropZone(
      dropZone,
      fileInput,
      async ([selected]) => {
        try {
          validatePdfFile(selected);

          showStatus(
            status,
            "Cargando PDF..."
          );

          const doc =
            await loadPdfJs(selected);

          file = selected;
          pdfJsDoc = doc;

          pageInput.max =
            doc.numPages;

          pageInput.value = 1;

          summary.hidden = false;
          fileName.textContent =
            selected.name;

          fileMeta.innerHTML =
            `<span>${doc.numPages} páginas</span>` +
            `<span>${formatBytes(selected.size)}</span>`;

          selectedPoint = null;

          await renderCurrentPage();

          pointReadout.innerHTML =
            "<strong>Posición:</strong> haz clic en la página donde quieres colocar la firma.";

          signBtn.disabled = true;

          showStatus(
            status,
            "PDF preparado. Elige texto o imagen y después haz clic en la posición.",
            "success"
          );
        } catch (error) {
          showStatus(
            status,
            friendlyPdfError(error).message,
            "error"
          );
        }
      }
    );

    pageInput.addEventListener(
      "change",
      async () => {
        selectedPoint = null;
        signBtn.disabled = true;

        await renderCurrentPage();

        pointReadout.innerHTML =
          "<strong>Posición:</strong> haz clic en la página donde quieres colocar la firma.";
      }
    );

    pdfCanvas.addEventListener(
      "click",
      async (event) => {
        if (!pageInfo) return;

        await renderCurrentPage();

        selectedPoint =
          canvasClickToPdf(
            event,
            pdfCanvas,
            pageInfo.pageWidth,
            pageInfo.pageHeight
          );

        await renderSignaturePreview();

        pointReadout.innerHTML =
          `<strong>Posición elegida:</strong> X ${selectedPoint.x.toFixed(0)} · Y ${selectedPoint.y.toFixed(0)}`;

        signBtn.disabled = false;
      }
    );

    signBtn.addEventListener(
      "click",
      async () => {
        if (!file || !selectedPoint) return;

        try {
          signBtn.disabled = true;

          showStatus(
            status,
            "Añadiendo firma visual..."
          );

          const doc =
            await loadPdfLib(file);

          const page =
            doc.getPage(
              Number(pageInput.value) - 1
            );

          if (
            currentSignatureType() === "text"
          ) {
            const value =
              signatureText.value.trim();

            if (!value) {
              throw new Error(
                "Escribe el texto de la firma."
              );
            }

            const font =
              await doc.embedFont(
                StandardFonts.HelveticaOblique
              );

            const size =
              Math.max(
                10,
                Math.min(
                  96,
                  Number(
                    signatureFontSize.value
                  ) || 28
                )
              );

            page.drawText(
              value,
              {
                x: selectedPoint.x,
                y:
                  selectedPoint.y -
                  size,
                size,
                font,
                color:
                  hexToRgb(
                    signatureColor.value
                  ),
              }
            );
          } else {
            if (!signatureImageFile) {
              throw new Error(
                "Selecciona una imagen PNG o JPG para la firma."
              );
            }

            const bytes =
              new Uint8Array(
                await signatureImageFile.arrayBuffer()
              );

            let image;

            if (
              signatureImageFile.type ===
              "image/png"
            ) {
              image =
                await doc.embedPng(bytes);
            } else if (
              signatureImageFile.type ===
              "image/jpeg"
            ) {
              image =
                await doc.embedJpg(bytes);
            } else {
              throw new Error(
                "La imagen de firma debe ser PNG o JPG."
              );
            }

            const width =
              Math.max(
                30,
                Number(
                  signatureWidth.value
                ) || 160
              );

            const height =
              width *
              (image.height /
                image.width);

            page.drawImage(
              image,
              {
                x: selectedPoint.x,
                y:
                  selectedPoint.y -
                  height,
                width,
                height,
              }
            );
          }

          const bytes =
            await doc.save({
              useObjectStreams: true,
            });

          downloadBytes(
            bytes,
            `${safeStem(file.name)}-firmado.pdf`
          );

          showStatus(
            status,
            "Firma visual añadida correctamente.",
            "success"
          );
        } catch (error) {
          showStatus(
            status,
            friendlyPdfError(error).message,
            "error"
          );
        } finally {
          signBtn.disabled =
            !selectedPoint;
        }
      }
    );

    refreshSignatureType();
  }

  // ==============================================================
  // MARCA DE AGUA · TEXTO + IMAGEN + PREVIEW
  // ==============================================================
  if (tool === "watermark") {
    let file = null;
    let pdfJsDoc = null;
    let pageInfo = null;
    let pageCount = 0;

    let customPosition = null;
    let watermarkImageFile = null;
    let watermarkImageUrl = null;

    const dropZone = $("dropZone");
    const fileInput = $("fileInput");
    const summary = $("fileSummary");
    const fileName = $("fileName");
    const fileMeta = $("fileMeta");

    const enableText =
      $("enableTextWatermark");

    const enableImage =
      $("enableImageWatermark");

    const textControls =
      $("textWatermarkControls");

    const imageControls =
      $("imageWatermarkControls");

    const text =
      $("watermarkText");

    const color =
      $("watermarkColor");

    const fontSize =
      $("watermarkSize");

    const imageInput =
      $("watermarkImage");

    const imageWidth =
      $("watermarkImageWidth");

    const imageWidthValue =
      $("watermarkImageWidthValue");

    const opacity =
      $("watermarkOpacity");

    const opacityValue =
      $("watermarkOpacityValue");

    const rotation =
      $("watermarkRotation");

    const pageRange =
      $("pageRange");

    const previewPage =
      $("previewPage");

    const canvas =
      $("watermarkCanvas");

    const positionReadout =
      $("watermarkPositionReadout");

    const positionButtons =
      [...document.querySelectorAll(
        "[data-watermark-position]"
      )];

    const action =
      $("watermarkBtn");

    const status =
      $("status");

    let positionMode = "center";

    function refreshEnabled() {
      textControls.classList.toggle(
        "hidden-control",
        !enableText.checked
      );

      imageControls.classList.toggle(
        "hidden-control",
        !enableImage.checked
      );

      renderPreview();
    }

    enableText.addEventListener(
      "change",
      refreshEnabled
    );

    enableImage.addEventListener(
      "change",
      refreshEnabled
    );

    opacity.addEventListener(
      "input",
      () => {
        opacityValue.textContent =
          `${opacity.value}%`;

        renderPreview();
      }
    );

    imageWidth.addEventListener(
      "input",
      () => {
        imageWidthValue.textContent =
          `${imageWidth.value}%`;

        renderPreview();
      }
    );

    [
      text,
      color,
      fontSize,
      rotation,
    ].forEach((control) => {
      control.addEventListener(
        "input",
        renderPreview
      );

      control.addEventListener(
        "change",
        renderPreview
      );
    });

    imageInput.addEventListener(
      "change",
      () => {
        watermarkImageFile =
          imageInput.files?.[0] || null;

        if (watermarkImageUrl) {
          URL.revokeObjectURL(
            watermarkImageUrl
          );

          watermarkImageUrl = null;
        }

        if (watermarkImageFile) {
          watermarkImageUrl =
            URL.createObjectURL(
              watermarkImageFile
            );
        }

        renderPreview();
      }
    );

    positionButtons.forEach(
      (button) => {
        button.addEventListener(
          "click",
          () => {
            positionMode =
              button.dataset.watermarkPosition;

            customPosition = null;

            positionButtons.forEach(
              (item) =>
                item.classList.toggle(
                  "active",
                  item === button
                )
            );

            renderPreview();
          }
        );
      }
    );

    function pdfPosition(
      width,
      height
    ) {
      const margin = 36;

      if (
        positionMode === "custom" &&
        customPosition
      ) {
        return {
          x: customPosition.x,
          y: customPosition.y,
        };
      }

      if (
        positionMode === "top-left"
      ) {
        return {
          x: margin,
          y: height - margin,
        };
      }

      if (
        positionMode === "top-right"
      ) {
        return {
          x: width - margin,
          y: height - margin,
        };
      }

      if (
        positionMode === "bottom-left"
      ) {
        return {
          x: margin,
          y: margin,
        };
      }

      if (
        positionMode === "bottom-right"
      ) {
        return {
          x: width - margin,
          y: margin,
        };
      }

      return {
        x: width / 2,
        y: height / 2,
      };
    }

    async function renderPreview() {
      if (!pdfJsDoc) return;

      const pageNumber =
        Math.max(
          1,
          Math.min(
            pdfJsDoc.numPages,
            Number(previewPage.value) || 1
          )
        );

      previewPage.value =
        pageNumber;

      pageInfo =
        await renderPdfPage(
          pdfJsDoc,
          pageNumber,
          canvas,
          700
        );

      const ctx =
        canvas.getContext("2d");

      const pos =
        pdfPosition(
          pageInfo.pageWidth,
          pageInfo.pageHeight
        );

      const canvasX =
        (pos.x /
          pageInfo.pageWidth) *
        canvas.width;

      const canvasY =
        ((pageInfo.pageHeight -
            pos.y) /
          pageInfo.pageHeight) *
        canvas.height;

      const alpha =
        Number(opacity.value) /
        100;

      const angle =
        Number(rotation.value) *
        Math.PI /
        180;

      ctx.save();

      ctx.translate(
        canvasX,
        canvasY
      );

      ctx.rotate(-angle);

      ctx.globalAlpha = alpha;

      if (
        enableImage.checked &&
        watermarkImageUrl
      ) {
        await new Promise(
          (resolve) => {
            const image = new Image();

            image.onload = () => {
              const width =
                canvas.width *
                (Number(
                  imageWidth.value
                ) /
                  100);

              const height =
                width *
                (image.height /
                  image.width);

              ctx.drawImage(
                image,
                -width / 2,
                -height / 2,
                width,
                height
              );

              resolve();
            };

            image.onerror = resolve;

            image.src =
              watermarkImageUrl;
          }
        );
      }

      if (enableText.checked) {
        const value =
          text.value.trim();

        if (value) {
          const scale =
            canvas.width /
            pageInfo.pageWidth;

          const size =
            Math.max(
              8,
              Number(fontSize.value) ||
                54
            ) * scale;

          ctx.fillStyle =
            cssHexToRgb(
              color.value
            );

          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.font =
            `bold ${size}px sans-serif`;

          const offset =
            enableImage.checked &&
            watermarkImageUrl
              ? size * 1.15
              : 0;

          ctx.fillText(
            value,
            0,
            offset
          );
        }
      }

      ctx.restore();

      ctx.save();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#ff3d7f";
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.arc(
        canvasX,
        canvasY,
        7,
        0,
        Math.PI * 2
      );
      ctx.stroke();

      ctx.restore();

      positionReadout.innerHTML =
        `<strong>Posición actual:</strong> X ${pos.x.toFixed(0)} · Y ${pos.y.toFixed(0)} · ${positionMode === "custom" ? "Personalizada" : positionMode}`;
    }

    setupDropZone(
      dropZone,
      fileInput,
      async ([selected]) => {
        try {
          validatePdfFile(selected);

          showStatus(
            status,
            "Cargando PDF..."
          );

          const jsDoc =
            await loadPdfJs(selected);

          file = selected;
          pdfJsDoc = jsDoc;
          pageCount =
            jsDoc.numPages;

          summary.hidden = false;
          fileName.textContent =
            selected.name;

          fileMeta.innerHTML =
            `<span>${pageCount} páginas</span>` +
            `<span>${formatBytes(selected.size)}</span>`;

          pageRange.value =
            `1-${pageCount}`;

          previewPage.max =
            pageCount;

          previewPage.value = 1;

          action.disabled = false;

          await renderPreview();

          showStatus(
            status,
            "PDF preparado. Configura texto, imagen y posición.",
            "success"
          );
        } catch (error) {
          showStatus(
            status,
            friendlyPdfError(error).message,
            "error"
          );
        }
      }
    );

    previewPage.addEventListener(
      "change",
      renderPreview
    );

    canvas.addEventListener(
      "click",
      async (event) => {
        if (!pageInfo) return;

        const point =
          canvasClickToPdf(
            event,
            canvas,
            pageInfo.pageWidth,
            pageInfo.pageHeight
          );

        customPosition = {
          x: point.x,
          y: point.y,
        };

        positionMode = "custom";

        positionButtons.forEach(
          (button) =>
            button.classList.toggle(
              "active",
              button.dataset.watermarkPosition ===
                "custom"
            )
        );

        await renderPreview();
      }
    );

    action.addEventListener(
      "click",
      async () => {
        if (!file) return;

        try {
          if (
            !enableText.checked &&
            !enableImage.checked
          ) {
            throw new Error(
              "Activa una marca de texto, una imagen o ambas."
            );
          }

          action.disabled = true;

          showStatus(
            status,
            "Aplicando marca de agua..."
          );

          const doc =
            await loadPdfLib(file);

          const indexes =
            parsePageRange(
              pageRange.value,
              pageCount
            );

          const alpha =
            Number(opacity.value) /
            100;

          const angle =
            Number(rotation.value);

          const font =
            enableText.checked
              ? await doc.embedFont(
                  StandardFonts.HelveticaBold
                )
              : null;

          let embeddedImage = null;
          let imageRatio = 1;

          if (enableImage.checked) {
            if (!watermarkImageFile) {
              throw new Error(
                "Selecciona una imagen PNG o JPG para la marca de agua."
              );
            }

            const bytes =
              new Uint8Array(
                await watermarkImageFile.arrayBuffer()
              );

            if (
              watermarkImageFile.type ===
              "image/png"
            ) {
              embeddedImage =
                await doc.embedPng(bytes);
            } else if (
              watermarkImageFile.type ===
              "image/jpeg"
            ) {
              embeddedImage =
                await doc.embedJpg(bytes);
            } else {
              throw new Error(
                "La imagen debe ser PNG o JPG."
              );
            }

            imageRatio =
              embeddedImage.height /
              embeddedImage.width;
          }

          for (const index of indexes) {
            const page =
              doc.getPage(index);

            const {
              width,
              height,
            } = page.getSize();

            const pos =
              pdfPosition(
                width,
                height
              );

            let imageHeight = 0;

            if (
              enableImage.checked &&
              embeddedImage
            ) {
              const targetWidth =
                width *
                (Number(
                  imageWidth.value
                ) /
                  100);

              const targetHeight =
                targetWidth *
                imageRatio;

              imageHeight =
                targetHeight;

              page.drawImage(
                embeddedImage,
                {
                  x:
                    pos.x -
                    targetWidth / 2,
                  y:
                    pos.y -
                    targetHeight / 2,
                  width:
                    targetWidth,
                  height:
                    targetHeight,
                  opacity:
                    alpha,
                  rotate:
                    degrees(angle),
                }
              );
            }

            if (enableText.checked) {
              const value =
                text.value.trim();

              if (!value) {
                throw new Error(
                  "Escribe el texto de la marca de agua."
                );
              }

              const size =
                Math.max(
                  8,
                  Math.min(
                    200,
                    Number(
                      fontSize.value
                    ) || 54
                  )
                );

              const textWidth =
                font.widthOfTextAtSize(
                  value,
                  size
                );

              const offset =
                imageHeight
                  ? size * 1.15
                  : 0;

              page.drawText(
                value,
                {
                  x:
                    pos.x -
                    textWidth / 2,
                  y:
                    pos.y -
                    size / 2 -
                    offset,
                  size,
                  font,
                  color:
                    hexToRgb(
                      color.value
                    ),
                  opacity:
                    alpha,
                  rotate:
                    degrees(angle),
                }
              );
            }
          }

          const bytes =
            await doc.save({
              useObjectStreams: true,
            });

          downloadBytes(
            bytes,
            `${safeStem(file.name)}-marca-agua.pdf`
          );

          showStatus(
            status,
            "Marca de agua aplicada correctamente.",
            "success"
          );
        } catch (error) {
          showStatus(
            status,
            friendlyPdfError(error).message,
            "error"
          );
        } finally {
          action.disabled = false;
        }
      }
    );

    refreshEnabled();
  }
})();
