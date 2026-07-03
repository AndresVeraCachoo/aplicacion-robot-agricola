import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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

export const calculateAverage = (data, key) => {
  const validD = data.filter((d) => d[key] !== null && d[key] !== undefined);
  if (validD.length === 0) return null;
  const sum = validD.reduce((acc, curr) => acc + Number(curr[key]), 0);
  return sum / validD.length;
};

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

export const exportToPDF = async (sessionName, addToast, t) => {
  const element = document.getElementById("mission-report-content");
  if (!element) return;
  try {
    const canvas = await html2canvas(element, { scale: 2, useCORS: true });
    const pdf = new jsPDF("p", "mm", "a4");
    pdf.addImage(
      canvas.toDataURL("image/png"),
      "PNG",
      0,
      0,
      pdf.internal.pageSize.getWidth(),
      (canvas.height * pdf.internal.pageSize.getWidth()) / canvas.width,
    );
    pdf.save(`Reporte_Mision_${sessionName.replaceAll(/\s+/g, "_")}.pdf`);
    addToast(t("data.pdfSuccess"), "success");
  } catch {
    addToast(t("data.pdfError"), "error");
  }
};

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
