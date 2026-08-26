
(() => {
  "use strict";

  const openButton = document.getElementById("openCalculator");
  const backdrop = document.getElementById("calculatorBackdrop");
  const closeButton = document.getElementById("calculatorClose");
  const sciToggle = document.getElementById("calculatorScientificToggle");
  const sciPanel = document.getElementById("calculatorScientificPanel");
  const angleGroup = document.getElementById("calculatorAngleGroup");
  const input = document.getElementById("calculatorInput");
  const expressionLabel = document.getElementById("calculatorExpression");
  const historyToggle = document.getElementById("calculatorHistoryToggle");
  const historyBox = document.getElementById("calculatorHistory");
  const historyList = document.getElementById("calculatorHistoryList");
  const clearHistory = document.getElementById("calculatorClearHistory");
  const angleButtons = [...document.querySelectorAll("[data-calc-angle]")];

  if (!openButton || !backdrop || !input) return;

  let angleMode = "DEG";
  let history = [];
  let justCalculated = false;

  const FUNCTIONS = new Set([
    "sin", "cos", "tan",
    "asin", "acos", "atan",
    "sqrt", "log", "ln", "abs", "exp"
  ]);

  function openCalculator() {
    backdrop.hidden = false;
    document.body.style.overflow = "hidden";

    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
  }

  function closeCalculator() {
    backdrop.hidden = true;
    document.body.style.overflow = "";
    openButton.focus();
  }

  openButton.addEventListener("click", openCalculator);
  closeButton.addEventListener("click", closeCalculator);

  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) closeCalculator();
  });

  sciToggle.addEventListener("click", () => {
    const open = sciPanel.hidden;
    sciPanel.hidden = !open;
    angleGroup.hidden = !open;
    sciToggle.setAttribute("aria-pressed", String(open));
  });

  historyToggle.addEventListener("click", () => {
    historyBox.hidden = !historyBox.hidden;
  });

  clearHistory.addEventListener("click", () => {
    history = [];
    renderHistory();
  });

  angleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      angleMode = button.dataset.calcAngle;

      angleButtons.forEach((item) => {
        item.classList.toggle("active", item === button);
      });
    });
  });

  function normalize(text) {
    return String(text)
      .replace(/,/g, ".")
      .replace(/÷/g, "/")
      .replace(/×/g, "*")
      .replace(/−/g, "-")
      .replace(/\s+/g, "");
  }

  function factorial(value) {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error("El factorial necesita un entero igual o mayor que 0.");
    }

    if (value > 170) {
      throw new Error("El número es demasiado grande para factorial.");
    }

    let result = 1;

    for (let i = 2; i <= value; i++) {
      result *= i;
    }

    return result;
  }

  class MathParser {
    constructor(text) {
      this.text = normalize(text);
      this.pos = 0;
    }

    current() {
      return this.text[this.pos] || "";
    }

    eat(token) {
      if (this.text.startsWith(token, this.pos)) {
        this.pos += token.length;
        return true;
      }

      return false;
    }

    parse() {
      if (!this.text) return 0;

      const result = this.expression();

      if (this.pos !== this.text.length) {
        throw new Error(`No entiendo "${this.current()}".`);
      }

      if (!Number.isFinite(result)) {
        throw new Error("El resultado no es finito.");
      }

      return result;
    }

    expression() {
      let value = this.term();

      while (true) {
        if (this.eat("+")) value += this.term();
        else if (this.eat("-")) value -= this.term();
        else break;
      }

      return value;
    }

    term() {
      let value = this.power();

      while (true) {
        if (this.eat("*")) {
          value *= this.power();
        } else if (this.eat("/")) {
          const divisor = this.power();

          if (divisor === 0) {
            throw new Error("No se puede dividir entre cero.");
          }

          value /= divisor;
        } else if (this.eat("%")) {
          value /= 100;
        } else {
          break;
        }
      }

      return value;
    }

    power() {
      let value = this.unary();

      if (this.eat("^")) {
        value = Math.pow(value, this.power());
      }

      return value;
    }

    unary() {
      if (this.eat("+")) return this.unary();
      if (this.eat("-")) return -this.unary();

      return this.postfix();
    }

    postfix() {
      let value = this.primary();

      while (this.eat("!")) {
        value = factorial(value);
      }

      return value;
    }

    primary() {
      if (this.eat("(")) {
        const value = this.expression();

        if (!this.eat(")")) {
          throw new Error("Falta cerrar un paréntesis.");
        }

        return value;
      }

      const ch = this.current();

      if ((ch >= "0" && ch <= "9") || ch === ".") {
        return this.number();
      }

      if (/[a-zA-Z]/.test(ch)) {
        return this.identifier();
      }

      throw new Error(`Expresión no válida cerca de "${ch || "fin"}".`);
    }

    number() {
      const start = this.pos;
      let dotCount = 0;

      while (this.pos < this.text.length) {
        const ch = this.current();

        if (ch >= "0" && ch <= "9") {
          this.pos++;
          continue;
        }

        if (ch === ".") {
          dotCount++;

          if (dotCount > 1) break;

          this.pos++;
          continue;
        }

        break;
      }

      const value = Number(this.text.slice(start, this.pos));

      if (!Number.isFinite(value)) {
        throw new Error("Número no válido.");
      }

      return value;
    }

    identifier() {
      const start = this.pos;

      while (/[a-zA-Z]/.test(this.current())) {
        this.pos++;
      }

      const name = this.text.slice(start, this.pos).toLowerCase();

      if (name === "pi") return Math.PI;
      if (name === "e") return Math.E;

      if (!FUNCTIONS.has(name)) {
        throw new Error(`Función desconocida: ${name}`);
      }

      if (!this.eat("(")) {
        throw new Error(`${name} necesita paréntesis.`);
      }

      const value = this.expression();

      if (!this.eat(")")) {
        throw new Error(`Falta cerrar ${name}(...).`);
      }

      const toRadians = (v) => angleMode === "DEG" ? v * Math.PI / 180 : v;
      const fromRadians = (v) => angleMode === "DEG" ? v * 180 / Math.PI : v;

      switch (name) {
        case "sin": return Math.sin(toRadians(value));
        case "cos": return Math.cos(toRadians(value));
        case "tan": return Math.tan(toRadians(value));
        case "asin": return fromRadians(Math.asin(value));
        case "acos": return fromRadians(Math.acos(value));
        case "atan": return fromRadians(Math.atan(value));
        case "sqrt":
          if (value < 0) throw new Error("No existe raíz real de un número negativo.");
          return Math.sqrt(value);
        case "log":
          if (value <= 0) throw new Error("log necesita un número mayor que 0.");
          return Math.log10(value);
        case "ln":
          if (value <= 0) throw new Error("ln necesita un número mayor que 0.");
          return Math.log(value);
        case "abs": return Math.abs(value);
        case "exp": return Math.exp(value);
        default: throw new Error(`Función no disponible: ${name}`);
      }
    }
  }

  function calculate(text) {
    return new MathParser(text).parse();
  }

  function formatResult(value) {
    if (Object.is(value, -0)) value = 0;

    const abs = Math.abs(value);

    if ((abs !== 0 && abs < 1e-10) || abs >= 1e14) {
      return value.toExponential(10).replace(/\.?0+e/, "e");
    }

    return Number(value.toPrecision(14)).toString();
  }

  function setInput(value, select = false) {
    input.value = value || "0";
    input.focus();

    if (select) {
      input.select();
    } else {
      const end = input.value.length;
      input.setSelectionRange(end, end);
    }
  }

  function insert(text) {
    if (justCalculated && /^[0-9.(a-z]/i.test(text)) {
      input.value = "";
    }

    justCalculated = false;

    if (input.value === "0" && /^[0-9.(a-z]/i.test(text)) {
      input.value = "";
    }

    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;

    input.value =
      input.value.slice(0, start) +
      text +
      input.value.slice(end);

    const next = start + text.length;

    input.focus();
    input.setSelectionRange(next, next);
  }

  function backspace() {
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;

    if (start !== end) {
      input.value = input.value.slice(0, start) + input.value.slice(end);
      setInput(input.value || "0");
      return;
    }

    if (start > 0) {
      input.value = input.value.slice(0, start - 1) + input.value.slice(start);

      if (!input.value) input.value = "0";

      input.focus();
      input.setSelectionRange(Math.max(0, start - 1), Math.max(0, start - 1));
    }
  }

  function toggleSign() {
    const value = input.value.trim();

    if (!value || value === "0") return;

    if (value.startsWith("-(") && value.endsWith(")")) {
      setInput(value.slice(2, -1));
    } else {
      setInput(`-(${value})`);
    }
  }

  function evaluate() {
    const expression = input.value.trim();

    try {
      const result = formatResult(calculate(expression));

      expressionLabel.textContent = `${expression} =`;
      setInput(result);

      history.unshift({
        expression,
        result
      });

      history = history.slice(0, 20);
      justCalculated = true;

      renderHistory();
    } catch (error) {
      expressionLabel.textContent = error.message || "Expresión no válida.";
      input.classList.add("is-error");

      window.setTimeout(() => {
        input.classList.remove("is-error");
      }, 500);
    }
  }

  function renderHistory() {
    historyList.innerHTML = "";

    if (!history.length) {
      const empty = document.createElement("span");
      empty.className = "calculator-history-empty";
      empty.textContent = "Todavía no hay operaciones.";
      historyList.append(empty);
      return;
    }

    history.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "calculator-history-entry";

      const expression = document.createElement("small");
      expression.textContent = item.expression;

      const result = document.createElement("strong");
      result.textContent = `= ${item.result}`;

      button.append(expression, result);

      button.addEventListener("click", () => {
        expressionLabel.textContent = item.expression;
        setInput(item.result);
        justCalculated = true;
      });

      historyList.append(button);
    });
  }

  backdrop.querySelectorAll("[data-calc-insert]").forEach((button) => {
    button.addEventListener("click", () => {
      insert(button.dataset.calcInsert);
    });
  });

  backdrop.querySelectorAll("[data-calc-action]").forEach((button) => {
    button.addEventListener("click", () => {
      switch (button.dataset.calcAction) {
        case "clear":
          input.value = "0";
          expressionLabel.textContent = "";
          justCalculated = false;
          input.focus();
          break;

        case "backspace":
          backspace();
          break;

        case "sign":
          toggleSign();
          break;

        case "equals":
          evaluate();
          break;
      }
    });
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === "=") {
      event.preventDefault();
      evaluate();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeCalculator();
      return;
    }

    const controlKey =
      event.ctrlKey ||
      event.metaKey ||
      ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Home", "End", "Tab"].includes(event.key);

    const characterAllowed = /^[0-9+\-*/%^().,!a-zA-Z]$/.test(event.key);

    if (!controlKey && !characterAllowed) {
      event.preventDefault();
    }
  });

  input.addEventListener("input", () => {
    if (!input.value) input.value = "0";
    justCalculated = false;
  });

  document.addEventListener("keydown", (event) => {
    if (!backdrop.hidden && event.key === "Escape" && document.activeElement !== input) {
      closeCalculator();
    }
  });

  renderHistory();
})();

// ToolHub · CRIS profile widget loader
(() => {
  if (document.querySelector('script[data-cris-profile-widget]')) return;
  const script = document.createElement('script');
  script.src = 'assets/profile/cris-profile-widget.js';
  script.defer = true;
  script.dataset.crisProfileWidget = '1';
  document.body.appendChild(script);
})();
