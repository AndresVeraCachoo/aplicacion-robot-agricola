import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import httpClient from "../../../config/httpClient";

/**
 * Agrupa los datos agronómicos por misión o ejecución.
 *
 * @param {Array<Object>} data - Datos agronómicos recibidos de la API.
 * @param {Array<Object>} missions - Lista de misiones disponibles.
 * @param {Function} t - Función de traducción de i18next.
 * @returns {Array<Object>} Lista de sesiones agrupadas y ordenadas por fecha.
 */
export const groupSessions = (data, missions, t) => {
  const map = new Map();
  data.forEach((d) => {
    const isManual = !d.executionId && !d.missionName;
    let key;
    if (isManual) {
      key = "miss-null";
    } else if (d.executionId) {
      key = `exec-${d.executionId}`;
    } else {
      key = `miss-${d.missionName}`;
    }
    
    if (!map.has(key)) {
      const template = isManual ? null : missions.find((m) => m.name === d.missionName);
      map.set(key, {
        id: key,
        name: isManual ? t("data.manual", "Manual") : d.missionName,
        template,
        dataPoints: [],
        startTime: d.timestamp,
        endTime: d.timestamp,
      });
    }
    const session = map.get(key);
    session.dataPoints.push(d);
    if (new Date(d.timestamp) < new Date(session.startTime))
      session.startTime = d.timestamp;
    if (new Date(d.timestamp) > new Date(session.endTime))
      session.endTime = d.timestamp;
  });

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime(),
  );
};

/**
 * Calcula la duración estimada y el uso aproximado de batería para un conjunto de datos.
 *
 * @param {Array<Object>} missionData - Puntos de datos de una sesión específica.
 * @returns {{ durationStr: string, batteryEst: string }} Objeto con la duración formateada y uso estimado de batería.
 */
export const calculateStats = (missionData) => {
  if (missionData.length === 0) return { durationStr: "--", batteryEst: "--" };
  const timestamps = missionData.map((d) => new Date(d.timestamp).getTime());
  const diffSeconds = Math.max(
    1,
    Math.floor((Math.max(...timestamps) - Math.min(...timestamps)) / 1000),
  );
  const hours = Math.floor(diffSeconds / 3600);
  const mins = Math.floor((diffSeconds % 3600) / 60);
  const secs = diffSeconds % 60;
  let durationStr = `${secs}s`;
  if (hours > 0) durationStr = `${hours}h ${mins}m ${secs}s`;
  else if (mins > 0) durationStr = `${mins}m ${secs}s`;
  return {
    durationStr,
    batteryEst: `${Math.min(100, diffSeconds * 0.5).toFixed(1)}%`,
  };
};

/**
 * Calcula el promedio de una métrica específica en los datos de la misión.
 *
 * @param {Array<Object>} data - Arreglo con los datos agronómicos de la misión.
 * @param {string} key - Clave de la métrica a promediar (e.g., 'humidity', 'ph').
 * @returns {number|null} El valor promedio calculado, o null si no hay datos válidos.
 */
export const calculateAverage = (data, key) => {
  const validD = data.filter((d) => d[key] !== null && d[key] !== undefined);
  if (validD.length === 0) return null;
  const sum = validD.reduce((acc, curr) => acc + Number(curr[key]), 0);
  return sum / validD.length;
};

/**
 * Genera y descarga un archivo CSV con los datos de la sesión seleccionada.
 *
 * @param {Array<Object>} missionData - Datos a incluir en el CSV.
 * @param {string} sessionName - Nombre de la sesión para el nombre del archivo.
 * @param {string} lng - Idioma actual (e.g., 'es', 'en').
 * @param {Function} addToast - Función para mostrar notificaciones.
 * @param {Function} t - Función de traducción de i18next.
 */
export const exportToCSV = (missionData, sessionName, lng, addToast, t) => {
  if (missionData.length === 0) return;
  const headers =
    "Time,Latitude,Longitude,Humidity_%,Temperature_C,pH,Nitrogen,Phosphorus,Potassium,Solar_Rad_W\n";
  
  const fallback = t("data.notCollected", "No recogido");
  const rows = missionData
    .map(
      (d) =>
        `"${new Date(d.timestamp).toLocaleString(lng)}",${d.lat},${d.lon},${d.humidity ?? fallback},${d.soilTemperature ?? fallback},${d.ph ?? fallback},${d.nitrogen ?? fallback},${d.phosphorus ?? fallback},${d.potassium ?? fallback},${d.solarRadiation ?? fallback}`,
    )
    .join("\n");
  const link = document.createElement("a");
  link.href =
    "data:text/csv;charset=utf-8," + encodeURIComponent(headers + rows);
  link.download = `mission_data_${sessionName.replaceAll(/\s+/g, "_")}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  addToast(t("data.csvSuccess"), "success");
};

const addPageIfNeeded = (pdf, currentY, elementHeight, pageHeight, margin) => {
  if (currentY + elementHeight + 15 > pageHeight - margin) {
    pdf.addPage();
    return margin;
  }
  return currentY;
};

const addChartToPdf = async (pdf, elementId, label, imgWidth, margin, currentY, pageHeight) => {
  const chartElement = document.getElementById(elementId);
  if (!chartElement) return currentY;
  await new Promise(r => setTimeout(r, 50));
  const canvasChart = await html2canvas(chartElement, { scale: 1.5, useCORS: true, scrollY: -window.scrollY, scrollX: 0 });
  const chartHeight = (canvasChart.height * imgWidth) / canvasChart.width;
  const y = addPageIfNeeded(pdf, currentY, chartHeight, pageHeight, margin);
  pdf.setFontSize(14);
  pdf.setTextColor(0, 0, 0);
  pdf.text(label, margin, y);
  pdf.addImage(canvasChart.toDataURL("image/png"), "PNG", margin, y + 8, imgWidth, chartHeight);
  return y + 8 + chartHeight + 10;
};

/**
 * Genera el documento PDF con los datos agronómicos y el gráfico interactivo.
 * Esta función es de uso interno dentro del módulo.
 *
 * @param {Array<Object>} filteredMissionData - Datos de la misión filtrados.
 * @param {string} sessionName - Nombre de la sesión seleccionada.
 * @param {Function} t - Función de traducción de i18next.
 * @returns {Promise<jsPDF>} La instancia de jsPDF generada lista para guardarse.
 */
const generateMissionPDFDoc = async (filteredMissionData, sessionName, t) => {
  const element = document.getElementById("mission-report-content");
  if (!element) throw new Error("Element not found");

  const canvas = await html2canvas(element, { scale: 2, useCORS: true, scrollY: -window.scrollY, scrollX: 0 });
  const pdf = new jsPDF("p", "mm", "a4");

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  pdf.setTextColor(20, 83, 45); 
  pdf.text("AgroSkopos - " + t("data.missionReport", "Reporte de Misión"), margin, 20);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(14);
  pdf.setTextColor(100, 100, 100);
  pdf.text(`${t("data.mission", "Misión")}: ${sessionName}`, margin, 30);

  pdf.setFontSize(10);
  pdf.text(`${t("data.generatedOn", "Generado el")}: ${new Date().toLocaleString()}`, margin, 36);

  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, 40, pageWidth - margin, 40);

  pdf.setFontSize(14);
  pdf.setTextColor(0, 0, 0);
  pdf.text(t("data.globalStats", "Estadísticas y Ruta"), margin, 50);

  const imgWidth = pageWidth - margin * 2;
  let currentY = 55;

  const mapImgHeight = (canvas.height * imgWidth) / canvas.width;
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", margin, currentY, imgWidth, mapImgHeight);
  currentY += mapImgHeight + 10;

  const metricsInfo = [
    { id: "humidity", label: "Humedad del Suelo (%)" },
    { id: "temperature", label: "Temperatura del Suelo (°C)" },
    { id: "ph", label: "pH del Suelo" },
    { id: "radiation", label: "Radiación Solar (W/m²)" },
    { id: "nitrogen", label: "Nitrógeno (mg/kg)" },
    { id: "phosphorus", label: "Fósforo (mg/kg)" },
    { id: "potassium", label: "Potasio (mg/kg)" },
  ];

  for (const metric of metricsInfo) {
    currentY = await addChartToPdf(pdf, `mission-chart-${metric.id}`, metric.label, imgWidth, margin, currentY, pageHeight);
  }

  const compElement = document.getElementById("mission-chart-comparative");
  if (compElement) {
    await new Promise(r => setTimeout(r, 50));
    const canvasChart = await html2canvas(compElement, { scale: 1.5, useCORS: true, scrollY: -window.scrollY, scrollX: 0 });
    const chartHeight = (canvasChart.height * imgWidth) / canvasChart.width;
    currentY = addPageIfNeeded(pdf, currentY, chartHeight, pageHeight, margin);
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);
    pdf.text(t("data.comparativeAnalysis", "Análisis Comparativo (Seleccionado)"), margin, currentY);
    currentY += 8;
    pdf.addImage(canvasChart.toDataURL("image/png"), "PNG", margin, currentY, imgWidth, chartHeight);
    currentY += chartHeight + 10;
  }

  let tableStartY = currentY;
  
  if (filteredMissionData && filteredMissionData.length > 0) {
    if (tableStartY > pageHeight - 40) {
      pdf.addPage();
      tableStartY = margin;
    }
    pdf.setFontSize(14);
    pdf.text(t("data.dataLog", "Registro de Datos"), margin, tableStartY - 5);

    const fallback = "-";
    const tableBody = filteredMissionData.map(d => [
      new Date(d.timestamp).toLocaleTimeString(),
      d.lat == null ? fallback : Number(d.lat).toFixed(6),
      d.lon == null ? fallback : Number(d.lon).toFixed(6),
      d.humidity ?? fallback,
      d.soilTemperature ?? fallback,
      d.ph ?? fallback,
      d.nitrogen ?? fallback,
      d.phosphorus ?? fallback,
      d.potassium ?? fallback
    ]);

    autoTable(pdf, {
      startY: tableStartY,
      head: [["Hora", "Lat", "Lon", "Hum (%)", "Temp (°C)", "pH", "N", "P", "K"]],
      body: tableBody,
      theme: "grid",
      headStyles: { fillColor: [22, 101, 52] },
      styles: { fontSize: 8, cellPadding: 2, halign: 'center' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: margin, right: margin }
    });
  }

  const pageCount = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(150);
    pdf.text(
      `AgroSkopos App - ${t("data.page", "Página")} ${i} / ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  }

  return pdf;
};

/**
 * Gestiona el proceso completo de generación y guardado de un reporte PDF.
 * Muestra notificaciones de estado (toast) al iniciar y finalizar.
 *
 * @param {Array<Object>} filteredMissionData - Datos agronómicos a exportar.
 * @param {string} sessionName - Nombre de la misión o sesión actual.
 * @param {Function} addToast - Función para mostrar notificaciones UI.
 * @param {Function} t - Función de traducción de i18next.
 */
export const exportToPDF = async (filteredMissionData, sessionName, addToast, t) => {
  try {
    addToast(t("data.generatingReport", "Generando reporte, por favor espera..."), "info");
    // Pequeña pausa para permitir que el toast se renderice antes de bloquear el hilo
    await new Promise(r => setTimeout(r, 100));

    const pdf = await generateMissionPDFDoc(filteredMissionData, sessionName, t);
    pdf.save(`${sessionName}_Reporte.pdf`);
    addToast(t("data.exportSuccess", "Exportado correctamente"), "success");
  } catch (err) {
    console.error("Error exportando PDF:", err);
    addToast(t("data.pdfError"), "error");
  }
};

export const emailCSV = async (missionData, sessionName, lng, addToast, t) => {
  if (missionData.length === 0) return;
  const headers = "Time,Latitude,Longitude,Humidity_%,Temperature_C,pH,Nitrogen,Phosphorus,Potassium,Solar_Rad_W\n";
  const fallback = t("data.notCollected", "No recogido");
  
  const rows = missionData
    .map((d) => `"${new Date(d.timestamp).toLocaleString(lng)}",${d.lat},${d.lon},${d.humidity ?? fallback},${d.soilTemperature ?? fallback},${d.ph ?? fallback},${d.nitrogen ?? fallback},${d.phosphorus ?? fallback},${d.potassium ?? fallback},${d.solarRadiation ?? fallback}`)
    .join("\n");
  
  const csvContent = headers + rows;
  const base64Content = btoa(String.fromCodePoint(...new TextEncoder().encode(csvContent)));

  addToast(t("data.emailing", "Encolando reporte para envío..."), "info");
  try {
    await httpClient.post("/export/email", {
      fileBase64: base64Content,
      filename: `Reporte_Mision_${sessionName.replaceAll(/\s+/g, "_")}.csv`,
      fileType: "text/csv"
    });
    addToast(t("data.emailSuccess", "El correo se enviará en breve."), "success");
  } catch (error) {
    addToast(error.response?.data?.error || t("data.emailError", "Error al enviar el correo"), "error");
  }
};

export const emailPDF = async (filteredMissionData, sessionName, addToast, t) => {
  try {
    addToast(t("data.generatingReport", "Generando reporte, por favor espera..."), "info");
    await new Promise(r => setTimeout(r, 100));

    const pdf = await generateMissionPDFDoc(filteredMissionData, sessionName, t);
    // Extraer base64 y limpiar cabecera URI
    const pdfDataUri = pdf.output("datauristring");
    const base64Content = pdfDataUri.split(",")[1];

    addToast(t("data.emailing", "Encolando reporte para envío..."), "info");
    await httpClient.post("/export/email", {
      fileBase64: base64Content,
      filename: `Reporte_Mision_${sessionName.replaceAll(/\s+/g, "_")}.pdf`,
      fileType: "application/pdf"
    });
    
    addToast(t("data.emailSuccess", "El correo se enviará en breve."), "success");
  } catch (error) {
    addToast(error.response?.data?.error || t("data.emailError", "Error al enviar el correo"), "error");
  }
};

/**
 * Calcula el centro geográfico aproximado del mapa basado en los datos de la sesión
 * o devuelve una coordenada por defecto en caso de no haber datos.
 *
 * @param {Object} selectedSession - Objeto de la sesión actual (puede contener la plantilla de la misión).
 * @param {Array<Object>} filteredMissionData - Array de coordenadas/datos recopilados.
 * @returns {{ center: [number, number], polygon: Array<Array<[number, number]>>|null }} Coordenadas centrales y el polígono del área de trabajo (si aplica).
 */
export const getMapCenterAndPolygon = (selectedSession, filteredMissionData) => {
  const polygonCoords =
    selectedSession?.template?.area_trabajo?.coordinates[0]?.map((c) => [
      c[1],
      c[0],
    ]) || [];
  let mapCenter = [42.36317, -3.69882];
  if (polygonCoords.length > 0) mapCenter = polygonCoords[0];
  else if (filteredMissionData.length > 0)
    mapCenter = [filteredMissionData[0].lat, filteredMissionData[0].lon];
  return { polygonCoords, mapCenter };
};
