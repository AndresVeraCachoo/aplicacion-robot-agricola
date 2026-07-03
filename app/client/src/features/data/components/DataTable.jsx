import React from "react";
import PropTypes from "prop-types";

// Componente para valores no recogidos
const NotCollected = ({ t }) => (
  <span className="not-collected-text">
    {t("data.notCollected", "No recogido")}
  </span>
);

NotCollected.propTypes = {
  t: PropTypes.func.isRequired,
};

const formatDate = (iso, lng) =>
  iso
    ? new Date(iso).toLocaleString(lng || "es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "-";

const formatNum = (n, d = 2) =>
  n === null || n === undefined || Number.isNaN(Number(n)) ? "-" : Number(n).toFixed(d);

const getPhClass = (val) => {
  const ph = Number(val);
  if (!ph && ph !== 0) return "";
  if (ph < 6) return "ph-acid";
  if (ph > 8) return "ph-alkaline";
  return "ph-neutral";
};

/**
 * Table component to display agronomic records.
 */
const DataTable = ({
  displayData,
  currentPage,
  itemsPerPage,
  totalPages,
  setCurrentPage,
  jumpPage,
  setJumpPage,
  handleJumpToPage,
  filteredData,
  t,
  i18n,
}) => (
  <div className="table-card table-card-wrapper">
    <div className="table-header-internal">
      <h3>{filteredData ? t("data.searchResults") : t("data.recordsTable")}</h3>
    </div>
    <div className="table-responsive table-responsive-override">
      <table className="data-table data-table-override">
        <thead>
          <tr>
            <th>{t("data.time")}</th>
            <th>{t("data.missions")}</th>
            <th>{t("data.location")}</th>
            <th>{t("data.humidity")}</th>
            <th>{t("data.temp")}</th>
            <th>{t("data.ph")}</th>
            <th>{t("data.npk")}</th>
            <th>{t("data.solarRad")}</th>
          </tr>
        </thead>
        <tbody>
          {displayData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).length > 0 ? (
            displayData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((row, index) => (
              <tr key={row.id || `${row.timestamp}-${index}`}>
                <td className="time-cell">{formatDate(row.timestamp, i18n.language)}</td>
                <td>
                  {row.missionName ? (
                    <span className="mission-badge-auto">{row.missionName}</span>
                  ) : (
                    <span className="mission-badge-manual">{t("data.manual", "Manual")}</span>
                  )}
                </td>
                <td className="monospace-cell">
                  {formatNum(row.lat, 5)}, {formatNum(row.lon, 5)}
                </td>
                <td>
                  {row.humidity === null ? (
                    <NotCollected t={t} />
                  ) : (
                    <div className="humidity-bar-container">
                      <span>{formatNum(row.humidity, 0)}%</span>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${Math.min(row.humidity || 0, 100)}%` }}></div>
                      </div>
                    </div>
                  )}
                </td>
                <td>
                  {row.soilTemperature === null ? <NotCollected t={t} /> : `${formatNum(row.soilTemperature, 1)}°C`}
                </td>
                <td>
                  {row.ph === null ? <NotCollected t={t} /> : <span className={`ph-badge ${getPhClass(row.ph)}`}>{formatNum(row.ph, 1)}</span>}
                </td>
                <td className="npk-cell">
                  {row.nitrogen === null ? <NotCollected t={t} /> : `${formatNum(row.nitrogen, 0)} / ${formatNum(row.phosphorus, 0)} / ${formatNum(row.potassium, 0)}`}
                </td>
                <td>
                  {row.solarRadiation === null ? <NotCollected t={t} /> : `${formatNum(row.solarRadiation, 0)} W`}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="8" className="no-data">
                {filteredData ? t("data.noDataFilter") : t("data.waitingData")}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>

    {displayData.length > 0 && (
      <div className="pagination-footer">
        <div className="pagination-info">
          {t("data.page")} <strong>{currentPage}</strong> {t("data.of")} <strong>{totalPages}</strong>
        </div>
        <div className="pagination-controls">
          <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="pagination-btn">&larr;</button>
          <form onSubmit={handleJumpToPage} className="pagination-jump">
            <input type="number" min="1" max={totalPages} value={jumpPage} onChange={(e) => setJumpPage(e.target.value)} placeholder="..." className="pagination-jump-input" />
            <button type="submit" disabled={!jumpPage} className="pagination-jump-btn">{t("data.go")}</button>
          </form>
          <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="pagination-btn">&rarr;</button>
        </div>
        <div className="pagination-info pagination-info-right">
          {displayData.length} {t("data.totalRecords")}
        </div>
      </div>
    )}
  </div>
);

DataTable.propTypes = {
  displayData: PropTypes.array.isRequired,
  currentPage: PropTypes.number.isRequired,
  itemsPerPage: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  setCurrentPage: PropTypes.func.isRequired,
  jumpPage: PropTypes.string.isRequired,
  setJumpPage: PropTypes.func.isRequired,
  handleJumpToPage: PropTypes.func.isRequired,
  filteredData: PropTypes.array,
  t: PropTypes.func.isRequired,
  i18n: PropTypes.object.isRequired,
};

export default DataTable;
