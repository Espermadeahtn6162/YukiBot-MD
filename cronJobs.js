import cron from 'node-cron';

export function iniciarAutomatizaciones(sock) {
  // ⚠️ ID DEL GRUPO DE LOS INSANOS
  const GRUPO_INSANOS_ID = '120363424612325673@g.us';

  // 1. BANCO DE DATOS RANDOMS (3:00 AM)
  const datosRandoms = [
    "¿Sabías que las medusas Turritopsis dohrnii son biológicamente inmortales? Cuando envejecen, reinician su ciclo vital a pólipo bebé.",
    "Los tiburones existieron en la Tierra antes que los árboles (400M de años vs 350M de años).",
    "En Suiza es ilegal por ley tener un solo conejillo de Indias; se deprimen si no tienen un compañero.",
    "Cleopatra vivió más cerca en el tiempo del lanzamiento del iPhone (2007) que de la construcción de las Pirámides de Guiza.",
    "La miel pura de abeja nunca se vence. Se han probado muestras de tumbas egipcias de 3,000 años y siguen comestibles.",
    "Nintendo fue fundada en 1889 como una empresa que fabricaba barajas de cartas tradicionales japonesas (Hanafuda).",
    "Una nube de tormenta estándar puede pesar lo mismo que unos 100 elefantes adultos juntos.",
    "Si doblaras un papel por la mitad 42 veces seguidas, su grosor llegaría hasta la Luna.",
    "El corazón de una ballena azul es tan grande como un auto compacto y podrías nadar por sus arterias.",
    "Las estatuas Moáis de la Isla de Pascua tienen cuerpos enteros enterrados bajo la tierra.",
    "Un día en Venus dura más que un año entero venusiano (243 días terrestres en girar sobre su eje).",
    "El nombre completo de Barbie es Barbara Millicent Roberts.",
    "Los gatos carecen del receptor del gusto necesario para sentir el sabor dulce.",
    "Las huellas dactilares de los koalas son casi idénticas a las humanas."
  ];

  // 2. VARIACIONES PARA LAS 5:00 AM
  const saludosOtaku = [
    "Buenas noches Daniel-Kun... y a los demás que ya deberían estar durmiendo 💤",
    "Oyasumi~ Buenas noches Daniel-Kun, ya suelta el teléfono o la China va a ganar más protogemas que tú.",
    "5:00 AM. Buenas noches Daniel-Kun. Moisés ya casi se despierta y tú apenas vas a cerrar los ojos xd.",
    "Buenas noches Daniel-Kun 🌙 Que descansen los pocos sobrevivientes de este chat."
  ];

  // 3. VARIACIONES PARA LAS 9:00 AM (ALEMÁN)
  const saludosAleman = [
    "Guten Morgen! 🇩🇪 Levántense ya, que el día no se va a perder solo.",
    "Guten Morgen a todos! ☀️ Un día más, un café más. ¿Ya se despertó Jesús o sigue durmiendo?",
    "Guten Morgen! 🥨 Recuerden tomar agua y sobrevivir a la rutina de hoy.",
    "Guten Morgen! 🇩🇪 Mode activado. Que tengan un excelente día los que ya están en pie."
  ];

  // 4. VARIACIONES SENTIMENTALES PARA LAS 12:00 AM (MEDIANOCHE)
  const frasesProyeccion = [
    "🥀 *12:00 AM — Hora de proyectarse...*\n\nSon las doce y ya el pecho empieza a pesar. Toca desahogarse, pensar en lo que fue, en lo que no pudo ser y en la persona que uno no se saca de la cabeza por más que intente.",
    "🖤 *12:00 AM — Hora de proyectarse...*\n\nLlegó la hora donde nadie miente. A esta hora extrañas a quien de verdad quieres, repasas las conversaciones viejas y te preguntas si también estará pensando en ti.",
    "🕯️ *12:00 AM — Hora de proyectarse...*\n\nUn salud por los que estamos intentando sanar algo de lo que no hablamos con nadie. Suelten lo que traen guardado, que la noche es larga.",
    "🫀 *12:00 AM — Hora de proyectarse...*\n\nA veces uno solo necesita soltar el orgullo, admitir que le hace falta alguien y dejar que el corazón hable un rato. ¿A quién le estás dedicando este silencio hoy?",
    "🩹 *12:00 AM — Hora de proyectarse...*\n\nMedianoche. Mente a mil, recuerdos dando vueltas y mil cosas que dieron ganas de decir pero se quedaron en un borrador. Si vas a desahogarte, que sea hoy."
  ];


  // FUNCIÓN ENVIAR SOLO AL GRUPO DE LOS INSANOS
  const enviarAlGrupoInsano = async (mensaje) => {
    try {
      if (GRUPO_INSANOS_ID.includes('AQUI_VA_TU_ID')) {
        console.log('⚠️ Falta colocar el ID del grupo de los insanos en cronJobs.js');
        return;
      }
      await sock.sendMessage(GRUPO_INSANOS_ID, { text: mensaje });
    } catch (err) {
      console.error("Error enviando mensaje al grupo de los insanos:", err);
    }
  };

  // ==========================================
  // PROGRAMACIÓN DE HORARIOS (CRON)
  // ==========================================

  // 🔥 12:00 AM — Hora de Proyectarse
  cron.schedule('5 0 * * *', () => {
    const frase = frasesProyeccion[Math.floor(Math.random() * frasesProyeccion.length)];
    enviarAlGrupoInsano(frase);
  }, { timezone: "America/Caracas" });

  // 👁️ 03:00 AM — La Hora Random
  cron.schedule('0 3 * * *', () => {
    const datoHoy = datosRandoms[Math.floor(Math.random() * datosRandoms.length)];
    enviarAlGrupoInsano(`👁️ *3:00 AM — La Hora Random*\n\n> ${datoHoy}`);
  }, { timezone: "America/Caracas" });

  // 🥧 03:14 AM — La Hora Pi (π)
  cron.schedule('14 3 * * *', () => {
    const piDigits = "3.1415926535897932384626433832795028841971693993751058209749445923078164";
    enviarAlGrupoInsano(`🥧 *3:14 AM — La Hora Pi (π)*\n\n\`\`\`${piDigits}\`\`\`\n\n> Recordatorio: $\\pi$ es infinito, pero las horas de sueño no. ¡A dormir! 📐`);
  }, { timezone: "America/Caracas" });

  // ⛩️ 05:00 AM — El Cierre Otaku
  cron.schedule('0 5 * * *', () => {
    const saludo = saludosOtaku[Math.floor(Math.random() * saludosOtaku.length)];
    enviarAlGrupoInsano(`💤 *5:00 AM — Cierre de jornada*\n\n${saludo}`);
  }, { timezone: "America/Caracas" });

  // 🇩🇪 09:00 AM — Guten Morgen
  cron.schedule('0 9 * * *', () => {
    const saludo = saludosAleman[Math.floor(Math.random() * saludosAleman.length)];
    enviarAlGrupoInsano(`☕ *9:00 AM*\n\n${saludo}`);
  }, { timezone: "America/Caracas" });

  console.log('✅ Automatizaciones (incluyendo las 12:00 AM) activadas correctamente.');
}
