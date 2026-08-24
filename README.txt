TOOLHUB v6 - GENERADOR DE MATCAP + IA OPCIONAL

PROPIETARIO ÚNICO
匚尺丨丂

CAMBIOS
- Corregido el espaciado de la tarjeta "Imágenes".
- Añadido Generador de MatCap.
- MatCap procedural local para Unity/VRChat.
- Presets: Corrosivo vino, Cyber azul, Metal oscuro, Tóxico y Suave.
- Controles de color, luz, ambiente, difuso, especular, dureza, rim, metálico,
  contraste, saturación, distorsión y ruido.
- Exportación PNG en 512, 1024 y 2048.
- Asistente OpenAI opcional.
- Memoria propia de MatCap guardada en localStorage.
- Política de privacidad actualizada para explicar la función de IA.

MEMORIA
ToolHub NO puede acceder a la memoria personal de ChatGPT.
La web usa su propia memoria de MatCap en este navegador.
La IA recibe esa memoria cuando el usuario activa "Recordar mis preferencias".

PRIVACIDAD
- El MatCap se genera localmente.
- No se envían imágenes ni archivos a OpenAI.
- Al usar "Aplicar con IA" se envían:
  1. el texto que escribes;
  2. los parámetros del MatCap;
  3. la memoria de MatCap si está activada.

GENERADOR LOCAL
Puede funcionar con Live Server incluso sin OpenAI.

PARA ACTIVAR LA IA
1. Instala Node.js.
2. Abre una terminal en esta carpeta.
3. Ejecuta:
   npm install

4. Copia .env.example como .env
5. Abre .env y pon tu clave:
   OPENAI_API_KEY=tu_clave_real

6. Ejecuta:
   npm start

7. Abre:
   http://localhost:3000

SEGURIDAD
- Nunca pongas la API key en index.html, matcap.js ni otro archivo público.
- No publiques .env.
- La API de OpenAI tiene facturación independiente de ChatGPT Plus.

RUTA
herramientas/imagenes/matcap.html

V17:
- Shader Studio para Unity con preview estática/animada y exportación .shader.
- MatCap Studio Pro con controles avanzados y overlay de textura.
- Asistente local gratuito sin API.
- Ollama opcional para IA local gratuita real.
- OpenAI sigue siendo opcional.
