import React from "react";
import PropTypes from "prop-types";

const NotCollected = ({ t }) => (
  <span className="not-collected-text">
    {t("data.notCollected", "No recogido")}
  </span>
);

NotCollected.propTypes = {
  t: PropTypes.func.isRequired,
};

export default NotCollected;
