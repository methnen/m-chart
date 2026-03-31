/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./components/admin-ui-src/components/AxisRows.js"
/*!********************************************************!*\
  !*** ./components/admin-ui-src/components/AxisRows.js ***!
  \********************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ AxisRows)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _context_ChartAdminContext__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../context/ChartAdminContext */ "./components/admin-ui-src/context/ChartAdminContext.js");
/* harmony import */ var _utils_measureTextWidth__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../utils/measureTextWidth */ "./components/admin-ui-src/utils/measureTextWidth.js");






// Chart types that show y-min controls (line, spline, area only)
const YMIN_TYPES = new Set(['line', 'spline', 'area']);

// Chart types that show axis title/unit rows
const AXIS_TYPES = new Set(['line', 'spline', 'area', 'column', 'stacked-column', 'bar', 'stacked-bar', 'scatter', 'bubble']);
function AxisRows() {
  var _postMeta$y_min_value;
  const {
    state,
    dispatch
  } = (0,_context_ChartAdminContext__WEBPACK_IMPORTED_MODULE_3__.useChartAdmin)();
  const {
    postMeta,
    unitTerms
  } = state;
  const showAxis = AXIS_TYPES.has(postMeta.type);
  const showYMin = YMIN_TYPES.has(postMeta.type);

  // Callback ref triggers a re-render when the input mounts, so the canvas measurement runs with the real element instead of the fallback
  const [yMinEl, setYMinEl] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(null);
  const yMinRef = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useCallback)(node => setYMinEl(node), []);
  const yMinValue = String((_postMeta$y_min_value = postMeta.y_min_value) !== null && _postMeta$y_min_value !== void 0 ? _postMeta$y_min_value : 0);
  const yMinWidth = yMinEl ? (0,_utils_measureTextWidth__WEBPACK_IMPORTED_MODULE_4__.measureTextWidth)(yMinValue, yMinEl) + 20 + 'px' : '73px';
  function handleChange(field, value) {
    dispatch({
      type: 'SET_POST_META',
      payload: {
        [field]: value
      }
    });
  }
  function handleYMinCheck(checked) {
    dispatch({
      type: 'SET_POST_META',
      payload: {
        y_min: checked
      }
    });
  }

  // Always render axis rows so field values survive type switches on form save.
  // Only hide them visually when the chart type doesn't need them.
  const axisStyle = showAxis ? {} : {
    display: 'none'
  };
  const yMinStyle = showAxis && showYMin ? {} : {
    display: 'none'
  };
  const unitOptions = (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("option", {
    value: ""
  }, (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('N/A', 'm-chart')), unitTerms.map(({
    group,
    units
  }) => (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.Fragment, {
    key: group
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("option", {
    value: "",
    disabled: true
  }, group), units.map(unit => (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("option", {
    key: unit.name,
    value: unit.name
  }, unit.name)))));
  return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "row three vertical-axis",
    style: axisStyle
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("label", {
    htmlFor: "m-chart-y-title"
  }, (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Vertical axis title', 'm-chart')), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("br", null), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("input", {
    className: "input",
    type: "text",
    name: "m-chart[y_title]",
    id: "m-chart-y-title",
    value: postMeta.y_title,
    style: {
      width: '100%'
    },
    onChange: e => handleChange('y_title', e.target.value)
  })), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
    className: "units"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("label", {
    htmlFor: "m-chart-y-units"
  }, (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Units', 'm-chart')), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("br", null), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("select", {
    name: "m-chart[y_units]",
    id: "m-chart-y-units",
    className: "select",
    value: postMeta.y_units,
    onChange: e => handleChange('y_units', e.target.value)
  }, unitOptions))), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "row four y-min",
    style: yMinStyle
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("label", {
    htmlFor: "m-chart-y-min"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("input", {
    type: "checkbox",
    name: "m-chart[y_min]",
    id: "m-chart-y-min",
    value: "1",
    checked: !!postMeta.y_min,
    onChange: e => handleYMinCheck(e.target.checked)
  }), (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)(' Force vertical axis minimum: ', 'm-chart')), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("input", {
    type: "number",
    name: "m-chart[y_min_value]",
    id: "m-chart-y-min-value",
    ref: yMinRef,
    value: postMeta.y_min_value,
    disabled: !postMeta.y_min,
    onChange: e => handleChange('y_min_value', e.target.value),
    style: {
      width: yMinWidth,
      minWidth: 0
    }
  }))), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "row five horizontal-axis",
    style: axisStyle
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("label", {
    htmlFor: "m-chart-x-title"
  }, (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Horizontal axis title', 'm-chart')), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("br", null), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("input", {
    className: "input",
    type: "text",
    name: "m-chart[x_title]",
    id: "m-chart-x-title",
    value: postMeta.x_title,
    style: {
      width: '100%'
    },
    onChange: e => handleChange('x_title', e.target.value)
  })), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
    className: "units"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("label", {
    htmlFor: "m-chart-x-units"
  }, (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Units', 'm-chart')), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("br", null), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("select", {
    name: "m-chart[x_units]",
    id: "m-chart-x-units",
    className: "select",
    value: postMeta.x_units,
    onChange: e => handleChange('x_units', e.target.value)
  }, unitOptions))));
}

/***/ },

/***/ "./components/admin-ui-src/components/ChartMetaBox.js"
/*!************************************************************!*\
  !*** ./components/admin-ui-src/components/ChartMetaBox.js ***!
  \************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ ChartMetaBox)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _hooks_useChartRefresh__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../hooks/useChartRefresh */ "./components/admin-ui-src/hooks/useChartRefresh.js");
/* harmony import */ var _hooks_useFormSubmissionGuard__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../hooks/useFormSubmissionGuard */ "./components/admin-ui-src/hooks/useFormSubmissionGuard.js");
/* harmony import */ var _ChartPreview__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./ChartPreview */ "./components/admin-ui-src/components/ChartPreview.js");
/* harmony import */ var _ChartSettings__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./ChartSettings */ "./components/admin-ui-src/components/ChartSettings.js");







/**
 * Root component for the chart meta box.
 *
 * Owns the title state (read from the classic WP #title input) and wires useChartRefresh so chart args are re-fetched whenever settings or data change
 * The subtitle input is now a React-controlled SubtitleField component mounted via a separate portal — no DOM bridge needed here.
 */
function ChartMetaBox() {
  const [title, setTitle] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(() => {
    const el = document.getElementById('title');
    return el ? el.value : '';
  });

  // Keep the React title state in sync with the native WP title input
  // Needed because React doesn't own this input since it's created by core WordPress
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    const el = document.getElementById('title');
    if (!el) {
      return;
    }
    const handler = e => setTitle(e.target.value);
    el.addEventListener('input', handler);
    return () => el.removeEventListener('input', handler);
  }, []);
  (0,_hooks_useChartRefresh__WEBPACK_IMPORTED_MODULE_2__.useChartRefresh)(title);
  (0,_hooks_useFormSubmissionGuard__WEBPACK_IMPORTED_MODULE_3__.useFormSubmissionGuard)();
  return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_ChartPreview__WEBPACK_IMPORTED_MODULE_4__["default"], null), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_ChartSettings__WEBPACK_IMPORTED_MODULE_5__["default"], null));
}

/***/ },

/***/ "./components/admin-ui-src/components/ChartPreview.js"
/*!************************************************************!*\
  !*** ./components/admin-ui-src/components/ChartPreview.js ***!
  \************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ ChartPreview)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _context_ChartAdminContext__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../context/ChartAdminContext */ "./components/admin-ui-src/context/ChartAdminContext.js");
/* harmony import */ var _hooks_useImageGeneration__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../hooks/useImageGeneration */ "./components/admin-ui-src/hooks/useImageGeneration.js");





/**
 * Shallow-copies chart args to avoid mutating React state when Chart.js or MChartHelper modifies the chart config during initialization
 * Tooltip callbacks and datalabels formatter are applied by MChartHelper via its beforeUpdate hook (runs each render)
 * Bubble preprocessing runs once via beforeInit
 */
function prepareArgs(args) {
  if (!args) {
    return args;
  }
  return {
    ...args,
    data: {
      ...args.data
    },
    options: {
      ...args.options,
      plugins: {
        ...args.options?.plugins,
        tooltip: {
          ...args.options?.plugins?.tooltip
        },
        datalabels: {
          ...args.options?.plugins?.datalabels
        }
      }
    }
  };
}

/**
 * Default Chart.js renderer — create or update the Chart.js instance
 *
 * Applies chartjs-specific arg preparation before rendering
 * Returned instance is stored in chartRef by the caller
 *
 * @param {HTMLCanvasElement}   canvas          Target canvas element
 * @param {Object}              args            Raw chart args from state
 * @param {Function}            onComplete      Callback to fire after render completes
 * @param {Object|null}         existingInstance Existing Chart.js instance, or null on first render
 *
 * @return {Object}             he Chart.js instance
 */
function defaultChartjsRender(canvas, args, onComplete, existingInstance) {
  const prepared = prepareArgs(args);

  // Guard against null/undefined datasets or labels (Chart.js requires arrays).
  if (!prepared.data?.datasets) {
    prepared.data = {
      ...prepared.data,
      datasets: []
    };
  }
  if (null === prepared.data?.labels) {
    prepared.data = {
      ...prepared.data,
      labels: []
    };
  }
  const options = {
    ...prepared.options,
    animation: {
      onComplete
    }
  };

  // Only create the new chart if there isn't an existing one already
  if (!existingInstance) {
    return new window.Chart(canvas, {
      type: prepared.type,
      data: prepared.data,
      options
    });
  }
  existingInstance.data = prepared.data;
  existingInstance.config.type = prepared.type;
  existingInstance.options = options;
  existingInstance.update();
  return existingInstance;
}

/**
 * React-managed chart preview for the admin meta box
 *
 * The chart instance is managed imperatively via refs and is never recreated on re-render — only updated when chartArgs changes
 *
 * Rendering is delegated via the 'm_chart.render_chart' wp.hooks filter so library plugins can replace the default Chart.js renderer
 * The filter receives ( canvas, args, onComplete, existingInstance ) as extra arguments
 * If no filter handles rendering (i.e. returns false), Chart.js is used
 *
 * The onComplete callback must be called by the renderer once the chart has finished which will fire 'm_chart.render_done' to trigger image generation and/or re-enable the form
 */
function ChartPreview() {
  const {
    state,
    dispatch
  } = (0,_context_ChartAdminContext__WEBPACK_IMPORTED_MODULE_2__.useChartAdmin)();
  const {
    postId,
    chartArgs,
    performance,
    imageSupport,
    postMeta
  } = state;
  const canvasRef = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useRef)(null);
  const chartRef = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useRef)(null);
  const renderFlagRef = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useRef)(false);
  const isFirstRender = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useRef)(true);

  // Keep a ref so onComplete closures always see the latest values
  const needsImagesRef = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useRef)(false);
  needsImagesRef.current = 'default' === performance && 'yes' === imageSupport;
  const generateImage = (0,_hooks_useImageGeneration__WEBPACK_IMPORTED_MODULE_3__.useImageGeneration)(chartRef);

  // Cleanup — destroy chart instance on unmount.
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, []);

  // Create or update the chart instance whenever chartArgs changes
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    if (!chartArgs || !canvasRef.current) {
      return;
    }
    function onComplete() {
      // Only fire once per update cycle
      if (!renderFlagRef.current) {
        return;
      }
      renderFlagRef.current = false;
      if (window.wp?.hooks) {
        window.wp.hooks.doAction('m_chart.render_done', postId, 1, chartRef.current);
      }
      if (needsImagesRef.current) {
        generateImage();
      } else {
        // No image generation — enable form submission immediately
        // This also covers the initial page load where useChartRefresh skips its first run
        dispatch({
          type: 'SET_FORM_ENABLED',
          payload: true
        });
        isFirstRender.current = false;
      }
    }
    renderFlagRef.current = true;

    // Allow library plugins to replace the renderer via wp.hooks
    // Plugins hook 'm_chart.render_chart' and return their chart instance
    // Returning false (the default) falls through to the built-in Chart.js renderer
    let instance = false;
    if (window.wp?.hooks) {
      // See defaultChartjsRender for the filter arguments
      instance = window.wp.hooks.applyFilters('m_chart.render_chart', false, canvasRef.current, chartArgs, onComplete, chartRef.current);
    }
    chartRef.current = false !== instance ? instance : defaultChartjsRender(canvasRef.current, chartArgs, onComplete, chartRef.current);
  }, [chartArgs]); // eslint-disable-line react-hooks/exhaustive-deps

  return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "m-chart-container",
    style: {
      height: postMeta.height + 'px'
    }
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("canvas", {
    ref: canvasRef
  }));
}

/***/ },

/***/ "./components/admin-ui-src/components/ChartSettings.js"
/*!*************************************************************!*\
  !*** ./components/admin-ui-src/components/ChartSettings.js ***!
  \*************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ ChartSettings)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _TypeAndThemeRow__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./TypeAndThemeRow */ "./components/admin-ui-src/components/TypeAndThemeRow.js");
/* harmony import */ var _ParseAndFlagsRow__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./ParseAndFlagsRow */ "./components/admin-ui-src/components/ParseAndFlagsRow.js");
/* harmony import */ var _AxisRows__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./AxisRows */ "./components/admin-ui-src/components/AxisRows.js");
/* harmony import */ var _ShortcodeAndImageRow__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./ShortcodeAndImageRow */ "./components/admin-ui-src/components/ShortcodeAndImageRow.js");





function DefaultSettings() {
  return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_TypeAndThemeRow__WEBPACK_IMPORTED_MODULE_1__["default"], null), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_ParseAndFlagsRow__WEBPACK_IMPORTED_MODULE_2__["default"], null), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_AxisRows__WEBPACK_IMPORTED_MODULE_3__["default"], null), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_ShortcodeAndImageRow__WEBPACK_IMPORTED_MODULE_4__["default"], null));
}
function ChartSettings() {
  // Allow library plugins to replace the settings component via wp.hooks
  const Settings = window.wp?.hooks ? wp.hooks.applyFilters('m_chart.settings_component', DefaultSettings) : DefaultSettings;
  return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "settings"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(Settings, null));
}

/***/ },

/***/ "./components/admin-ui-src/components/CsvControls.js"
/*!***********************************************************!*\
  !*** ./components/admin-ui-src/components/CsvControls.js ***!
  \***********************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ CsvControls)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _context_ChartAdminContext__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../context/ChartAdminContext */ "./components/admin-ui-src/context/ChartAdminContext.js");
/* harmony import */ var _JspreadsheetWrapper__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./JspreadsheetWrapper */ "./components/admin-ui-src/components/JspreadsheetWrapper.js");






/**
 * CSV import and export controls for the active spreadsheet sheet
 *
 * Import uses fetch + FormData (replaces the hidden #m-chart-csv-import-form)
 * Export uses a dynamically-created temporary form POST to trigger a file download (replaces the hidden #m-chart-csv-export-form)
 *
 * Props:
 *   getActiveWorksheet {Function}  Returns the active Jspreadsheet worksheet instance
 */
function CsvControls({
  getActiveWorksheet
}) {
  const {
    state,
    dispatch
  } = (0,_context_ChartAdminContext__WEBPACK_IMPORTED_MODULE_3__.useChartAdmin)();
  const {
    postId,
    nonce,
    ajaxUrl,
    setNames,
    activeSheet,
    csvDelimiters,
    defaultDelimiter
  } = state;
  const [selectedFile, setSelectedFile] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(null);
  const [csvDelimiter, setCsvDelimiter] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(defaultDelimiter);
  const [fileError, setFileError] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const [importError, setImportError] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)('');
  const [isImporting, setIsImporting] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const fileInputRef = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useRef)(null);
  function handleSelectFile(e) {
    e.preventDefault();
    setFileError(false);
    setImportError('');
    fileInputRef.current?.click();
  }
  function handleFileChange(e) {
    const file = e.target.files[0];

    // Make sure it's a CSV file
    if (!file || !/\.csv$/i.test(file.name)) {
      setFileError(true);
      setSelectedFile(null);
      return;
    }
    setFileError(false);
    setSelectedFile(file);
  }
  function handleCancel(e) {
    e.preventDefault();
    setSelectedFile(null);

    // We're hiding the actual file input so we need to reset it for the user
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }
  async function handleImport(e) {
    e.preventDefault();
    if (!selectedFile) {
      return;
    }

    // Save the file value so we can reset the iput
    const file = selectedFile;

    // Set the UI to show we're importing the file
    setSelectedFile(null);
    setIsImporting(true);
    setImportError('');

    // Reset the actual file input back to empty
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Create a form data object so we can submit it to the endpoint
    const formData = new FormData();
    formData.append('import_csv_file', file);
    formData.append('post_id', postId);
    formData.append('csv_delimiter', csvDelimiter);
    formData.append('nonce', nonce);

    // Try submitting the data to the endpoint
    try {
      const response = await fetch(`${ajaxUrl}?action=m_chart_import_csv`, {
        method: 'POST',
        body: formData
      });
      const json = await response.json();
      if (!json.success) {
        setImportError(json.data || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Import failed', 'm-chart'));
        return;
      }

      // Get the active worksheet
      const worksheet = getActiveWorksheet();
      if (worksheet) {
        // Set the active worksheet to the new data
        worksheet.setData(json.data);

        // setData() does not trigger onafterchanges so we need to run spreadsheetAutoWidth ourselves
        (0,_JspreadsheetWrapper__WEBPACK_IMPORTED_MODULE_4__.spreadsheetAutoWidth)(worksheet);
        dispatch({
          type: 'SET_SHEET_DATA',
          payload: {
            index: activeSheet,
            data: worksheet.getData()
          }
        });
      }
    } catch (err) {
      setImportError((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.sprintf)((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Import error: %s', 'm-chart'), err.message));
    } finally {
      // When we're done reset everything in the CSV ui back to default
      setIsImporting(false);
    }
  }
  function handleExport(e) {
    e.preventDefault();

    // Get the active worksheet
    const worksheet = getActiveWorksheet();
    if (!worksheet) {
      return;
    }
    const data = worksheet.getData();
    const title = document.getElementById('title')?.value || '';
    const setName = setNames[activeSheet] || '';

    // Build a FormData object so we can submit it to the endpoint
    const formData = new FormData();
    formData.append('post_id', postId);
    formData.append('data', JSON.stringify(data));
    formData.append('title', title);
    formData.append('set_name', setName);

    // Create a temporary form and submit it
    // We have to do it this way to trigger a download
    const form = document.createElement('form');
    form.action = `${ajaxUrl}?action=m_chart_export_csv`;
    form.method = 'post';
    form.style.display = 'none';

    // Loop through the formData and append it to the temporary form
    for (const [name, value] of formData.entries()) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
    }

    // Do the thing
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  }
  const showConfirmation = selectedFile && !isImporting;
  return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    id: "m-chart-csv"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "export"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("br", null), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("a", {
    href: "#export-csv",
    title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Export CSV', 'm-chart'),
    className: "button",
    onClick: handleExport
  }, (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Export', 'm-chart'))), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "import"
  }, (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('CSV Import/Export', 'm-chart'), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("br", null), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "controls"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("input", {
    ref: fileInputRef,
    type: "file",
    accept: ".csv",
    style: {
      display: 'none'
    },
    onChange: handleFileChange
  }), !showConfirmation && !isImporting && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("a", {
    href: "#select-csv",
    title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Select CSV File', 'm-chart'),
    className: "button select",
    onClick: handleSelectFile
  }, (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Select File', 'm-chart')), showConfirmation && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "confirmation"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("a", {
    href: "#import-csv",
    title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Import', 'm-chart'),
    className: "button",
    onClick: handleImport
  }, (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Import', 'm-chart')), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("select", {
    name: "m-chart[csv_delimiter]",
    value: csvDelimiter,
    onChange: e => setCsvDelimiter(e.target.value)
  }, Object.entries(csvDelimiters).map(([val, label]) => (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("option", {
    key: val,
    value: val
  }, (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.sprintf)((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('%s Delimited', 'm-chart'), label))))), fileError && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
    className: "file error"
  }, (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('You can only import CSV files', 'm-chart')), importError && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
    className: "import error"
  }, importError), isImporting && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
    className: "import in-progress"
  }, (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Importing file', 'm-chart')), showConfirmation && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "file-info"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("a", {
    href: "#cancel",
    title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Cancel Import', 'm-chart'),
    className: "dashicons dashicons-dismiss",
    onClick: handleCancel
  }), (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.sprintf)((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('File: %s', 'm-chart'), selectedFile.name), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("br", null), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("span", {
    className: "warning"
  }, (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Importing this file will replace all existing data in this sheet', 'm-chart'))))));
}

/***/ },

/***/ "./components/admin-ui-src/components/JspreadsheetWrapper.js"
/*!*******************************************************************!*\
  !*** ./components/admin-ui-src/components/JspreadsheetWrapper.js ***!
  \*******************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ JspreadsheetWrapper),
/* harmony export */   spreadsheetAutoWidth: () => (/* binding */ spreadsheetAutoWidth)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _context_ChartAdminContext__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../context/ChartAdminContext */ "./components/admin-ui-src/context/ChartAdminContext.js");




// Jspreadsheet CE has a bunch of default menu items this is the list of the ones we actually want
const CONTEXT_MENU_ITEMS = ['Insert a new row before', 'Insert a new row after', 'Delete selected rows', 'Insert a new column before', 'Insert a new column after', 'Delete selected columns'];

/**
 * Resizes columns to fit their content using canvas-based text measurement
 *
 * @param {object} worksheet  Jspreadsheet CE worksheet instance
 * @param {Array}  [records]  Subset of changed records; omit for a full refresh
 */
function spreadsheetAutoWidth(worksheet, records = false) {
  // If no records to refresh were passed we'll just do all of them
  if (!records) {
    records = worksheet.records[0];
  }

  // If there are no records even after the above we stop here
  if (!records || !records.length) {
    return;
  }
  const columns = [...new Set(records.map(r => r.x))];
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  columns.forEach(column => {
    let maxWidth = 0;
    const padding = 13;
    const minWidth = 100 - padding;
    for (let i = 0; i < worksheet.records.length; i++) {
      const cell = worksheet.records[i]?.[column]?.element;
      if (cell) {
        context.font = window.getComputedStyle(cell).font;
        const metrics = context.measureText(cell.innerText);
        if (metrics.width > maxWidth) {
          maxWidth = metrics.width;
        }
      }
    }
    maxWidth = minWidth > maxWidth ? minWidth : maxWidth;
    worksheet.setWidth(column, maxWidth + padding);
  });
}

/**
 * Thin React wrapper around a Jspreadsheet CE worksheet
 *
 * The Jspreadsheet instance is created once on mount and never recreated on re-render
 * Show/hide between active/inactive sheets is done via CSS so that DOM state and undo history are preserved
 *
 * Props:
 *   sheetId       {number}   Stable identity key (used for registration)
 *   sheetIndex    {number}   Current position in the sheets array (may change after deletes)
 *   isActive      {boolean}  Whether this sheet is currently displayed
 *   data          {Array}    Initial 2-D array of cell values
 *   onMounted     {Function} Called with (sheetId, worksheetInstance) after init
 *   onUnmounted   {Function} Called with (sheetId) before unmount
 */
function JspreadsheetWrapper({
  sheetId,
  sheetIndex,
  isActive,
  data,
  onMounted,
  onUnmounted
}) {
  const {
    dispatch
  } = (0,_context_ChartAdminContext__WEBPACK_IMPORTED_MODULE_2__.useChartAdmin)();
  const containerRef = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useRef)(null);
  const worksheetRef = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useRef)(null);

  // Keep a ref so the onafterchanges closure always dispatches the current index
  const sheetIndexRef = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useRef)(sheetIndex);
  sheetIndexRef.current = sheetIndex;
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    if (!containerRef.current || worksheetRef.current) {
      return;
    }

    // Need to load an empty data array if there's none to start already
    const initialData = data && data.length ? data : [['']];

    // Create the sheet instance
    const instance = window.jspreadsheet(containerRef.current, {
      worksheets: [{
        data: initialData,
        allowComments: false,
        minDimensions: [37, 17]
      }],
      // Filter out all of the contextual menu items we don't want
      contextMenu(obj, x, y, e, items) {
        return items.filter(item => CONTEXT_MENU_ITEMS.includes(item.title));
      },
      // Run spreadsheetAutoWidth on the intiial load
      onload(spreadsheet) {
        const ws = spreadsheet.worksheets[spreadsheet.getWorksheetActive()];
        spreadsheetAutoWidth(ws);
      },
      // Run spreadsheetAutoWidth on changed recrds and also push any changes to the chart
      onafterchanges(worksheet, records) {
        spreadsheetAutoWidth(worksheet, records);
        dispatch({
          type: 'SET_SHEET_DATA',
          payload: {
            index: sheetIndexRef.current,
            data: worksheet.getData()
          }
        });
      }
    });
    worksheetRef.current = instance[0];
    onMounted(sheetId, worksheetRef.current);
    return () => {
      onUnmounted(sheetId);
      worksheetRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    ref: containerRef,
    className: "spreadsheet",
    style: {
      display: isActive ? '' : 'none'
    }
  });
}

/***/ },

/***/ "./components/admin-ui-src/components/ParseAndFlagsRow.js"
/*!****************************************************************!*\
  !*** ./components/admin-ui-src/components/ParseAndFlagsRow.js ***!
  \****************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ ParseAndFlagsRow)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _context_ChartAdminContext__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../context/ChartAdminContext */ "./components/admin-ui-src/context/ChartAdminContext.js");



const PARSE_OPTION_NAMES = {
  columns: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Columns', 'm-chart'),
  rows: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Rows', 'm-chart')
};

// Chart types that support the shared tooltip option
const SHARED_TYPES = new Set(['line', 'spline', 'area', 'radar', 'radar-area']);
function ParseAndFlagsRow() {
  const {
    state,
    dispatch
  } = (0,_context_ChartAdminContext__WEBPACK_IMPORTED_MODULE_2__.useChartAdmin)();
  const {
    postMeta
  } = state;
  const showShared = SHARED_TYPES.has(postMeta.type);
  function handleChange(field, value) {
    dispatch({
      type: 'SET_POST_META',
      payload: {
        [field]: value
      }
    });
  }
  function handleCheckbox(field, checked) {
    dispatch({
      type: 'SET_POST_META',
      payload: {
        [field]: checked
      }
    });
  }
  return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: `row two${showShared ? ' show-shared' : ''}`
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("label", {
    htmlFor: "m-chart-parse_in"
  }, (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Parse data in', 'm-chart')), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("br", null), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("select", {
    name: "m-chart[parse_in]",
    id: "m-chart-parse_in",
    className: "select",
    value: postMeta.parse_in,
    onChange: e => handleChange('parse_in', e.target.value)
  }, Object.entries(PARSE_OPTION_NAMES).map(([value, label]) => (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("option", {
    key: value,
    value: value
  }, label)))), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
    className: "labels"
  }, '\u00a0', (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("br", null), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("label", {
    htmlFor: "m-chart-labels"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("input", {
    type: "checkbox",
    name: "m-chart[labels]",
    id: "m-chart-labels",
    value: "1",
    checked: !!postMeta.labels,
    onChange: e => handleCheckbox('labels', e.target.checked)
  }), (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)(' Show labels', 'm-chart'))), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
    className: "legend"
  }, '\u00a0', (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("br", null), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("label", {
    htmlFor: "m-chart-legend"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("input", {
    type: "checkbox",
    name: "m-chart[legend]",
    id: "m-chart-legend",
    value: "1",
    checked: !!postMeta.legend,
    onChange: e => handleCheckbox('legend', e.target.checked)
  }), (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)(' Show legend', 'm-chart'))), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
    className: "shared"
  }, '\u00a0', (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("br", null), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("label", {
    htmlFor: "m-chart-shared"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("input", {
    type: "checkbox",
    name: "m-chart[shared]",
    id: "m-chart-shared",
    value: "1",
    checked: !!postMeta.shared,
    onChange: e => handleCheckbox('shared', e.target.checked)
  }), (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)(' Shared tooltip', 'm-chart'))));
}

/***/ },

/***/ "./components/admin-ui-src/components/SheetTab.js"
/*!********************************************************!*\
  !*** ./components/admin-ui-src/components/SheetTab.js ***!
  \********************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ SheetTab)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _context_ChartAdminContext__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../context/ChartAdminContext */ "./components/admin-ui-src/context/ChartAdminContext.js");
/* harmony import */ var _hooks_useLongPress__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../hooks/useLongPress */ "./components/admin-ui-src/hooks/useLongPress.js");
/* harmony import */ var _utils_measureTextWidth__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../utils/measureTextWidth */ "./components/admin-ui-src/utils/measureTextWidth.js");






/**
 * A single sheet tab in the spreadsheet tab bar
 *
 * Supports:
 *   - Click to activate
 *   - Double-click or long-press (500ms) to enter rename mode
 *   - Enter / blur to commit rename
 *   - Dismiss icon to delete (guarded by window.confirm)
 */
function SheetTab({
  sheetId,
  sheetIndex,
  name,
  isActive,
  isSingle,
  isNew
}) {
  const {
    state,
    dispatch
  } = (0,_context_ChartAdminContext__WEBPACK_IMPORTED_MODULE_2__.useChartAdmin)();
  const [isRenaming, setIsRenaming] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(() => !!isNew);
  const [inputValue, setInputValue] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(name);
  const inputRef = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useRef)(null);
  const longPress = (0,_hooks_useLongPress__WEBPACK_IMPORTED_MODULE_3__.useLongPress)(() => setIsRenaming(true));

  // Clear the newSheetId flag once this tab has consumed it
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    if (isNew) {
      dispatch({
        type: 'CLEAR_NEW_SHEET_ID'
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync local input value and focus when entering rename mode
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    if (isRenaming) {
      setInputValue(name);
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }
  }, [isRenaming]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleClick(e) {
    e.preventDefault();
    if (!isActive) {
      dispatch({
        type: 'SET_ACTIVE_SHEET',
        payload: sheetIndex
      });
    }
  }
  function handleDoubleClick(e) {
    e.preventDefault();
    setIsRenaming(true);
  }
  function handleDelete(e) {
    e.preventDefault();
    e.stopPropagation();

    // If there's only one tab we don't let the user delete it
    if (isSingle) {
      return;
    }

    // If user rejects teh confirmation we stop
    if (!window.confirm(state.deleteConfirm)) {
      return;
    }

    // Activate a neighbouring sheet before deleting so the active index stays valid.
    if (isActive) {
      const newActive = sheetIndex > 0 ? sheetIndex - 1 : 1;
      dispatch({
        type: 'SET_ACTIVE_SHEET',
        payload: newActive
      });
    }
    dispatch({
      type: 'DELETE_SHEET',
      payload: {
        index: sheetIndex
      }
    });
  }
  function handleNameChange(e) {
    setInputValue(e.target.value);
  }
  function commitRename() {
    dispatch({
      type: 'RENAME_SHEET',
      payload: {
        index: sheetIndex,
        name: inputValue
      }
    });
    setIsRenaming(false);
  }
  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitRename();
    }
  }
  const inputWidth = inputRef.current ? (0,_utils_measureTextWidth__WEBPACK_IMPORTED_MODULE_4__.measureTextWidth)(inputValue, inputRef.current) + 'px' : Math.max(40, inputValue.length * 8 + 16) + 'px';
  const className = ['nav-tab', isActive ? 'nav-tab-active' : '', isSingle ? 'do-not-delete' : ''].filter(Boolean).join(' ');
  return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("a", {
    href: "#",
    className: className,
    id: `spreadsheet-tab-${sheetId}`,
    onClick: handleClick,
    onDoubleClick: handleDoubleClick,
    ...longPress
  }, !isSingle && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("span", {
    className: "dashicons dashicons-dismiss",
    onClick: handleDelete
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("span", {
    className: "tab-title",
    style: {
      display: isRenaming ? 'none' : ''
    }
  }, name), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("input", {
    ref: inputRef,
    type: "text",
    name: `m-chart[set_names][${sheetIndex}]`,
    className: "spreadsheet-tab-input",
    value: inputValue,
    style: {
      display: isRenaming ? '' : 'none',
      width: inputWidth
    },
    onChange: handleNameChange,
    onBlur: commitRename,
    onKeyDown: handleKeyDown
  }));
}

/***/ },

/***/ "./components/admin-ui-src/components/SheetTabs.js"
/*!*********************************************************!*\
  !*** ./components/admin-ui-src/components/SheetTabs.js ***!
  \*********************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ SheetTabs)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _context_ChartAdminContext__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../context/ChartAdminContext */ "./components/admin-ui-src/context/ChartAdminContext.js");
/* harmony import */ var _SheetTab__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./SheetTab */ "./components/admin-ui-src/components/SheetTab.js");





/**
 * Chart types that support multiple data sets (multiple spreadsheet sheets)
 * All other types use a single sheet and the tab bar is hidden
 */
const MULTI_SHEET_TYPES = new Set(['scatter', 'bubble', 'radar', 'radar-area']);

/**
 * The spreadsheet tab bar
 * Renders one SheetTab per sheet and an Add Sheet button
 * The entire bar is hidden when the current chart type only supports a single data set
 */
function SheetTabs() {
  const {
    state,
    dispatch
  } = (0,_context_ChartAdminContext__WEBPACK_IMPORTED_MODULE_2__.useChartAdmin)();
  const {
    postMeta,
    sheetIds,
    setNames,
    activeSheet,
    newSheetId
  } = state;

  // Allow library plugins to customize which chart types support multiple sheets
  const multiSheetTypes = window.wp?.hooks ? wp.hooks.applyFilters('m_chart.multi_sheet_types', [...MULTI_SHEET_TYPES]) : [...MULTI_SHEET_TYPES];
  const showTabs = new Set(multiSheetTypes).has(postMeta.type);
  function handleAddSheet(e) {
    e.preventDefault();
    dispatch({
      type: 'ADD_SHEET',
      payload: {}
    });
  }
  return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("nav", {
    id: "spreadsheet-tabs",
    className: `nav-tab-wrapper${showTabs ? '' : ' hide'}`
  }, sheetIds.map((id, index) => (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_SheetTab__WEBPACK_IMPORTED_MODULE_3__["default"], {
    key: id,
    sheetId: id,
    sheetIndex: index,
    name: setNames[index] || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.sprintf)((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Sheet %d', 'm-chart'), index + 1),
    isActive: index === activeSheet,
    isSingle: sheetIds.length === 1,
    isNew: id === newSheetId
  })), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("a", {
    href: "#add-sheet",
    className: "add-sheet",
    title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Add Sheet', 'm-chart'),
    onClick: handleAddSheet
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("span", {
    className: "dashicons dashicons-plus-alt"
  })));
}

/***/ },

/***/ "./components/admin-ui-src/components/ShortcodeAndImageRow.js"
/*!********************************************************************!*\
  !*** ./components/admin-ui-src/components/ShortcodeAndImageRow.js ***!
  \********************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ ShortcodeAndImageRow)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _context_ChartAdminContext__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../context/ChartAdminContext */ "./components/admin-ui-src/context/ChartAdminContext.js");




function ShortcodeAndImageRow() {
  const {
    state
  } = (0,_context_ChartAdminContext__WEBPACK_IMPORTED_MODULE_3__.useChartAdmin)();
  const {
    postId,
    postMeta,
    imageUrl,
    performance,
    imageSupport
  } = state;
  const shortcode = `[chart id="${postId}"]`;
  const showImageField = 'default' === performance && 'yes' === imageSupport;
  const imageDisabled = !showImageField;
  const [copied, setCopied] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  function handleCopy() {
    navigator.clipboard.writeText(shortcode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "row seven"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
    className: "shortcode"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("label", {
    htmlFor: "m-chart-shortcode"
  }, (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Shortcode', 'm-chart')), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("br", null), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("input", {
    className: "input",
    type: "text",
    name: "m-chart[shortcode]",
    id: "m-chart-shortcode",
    value: shortcode,
    style: {
      width: '100%'
    },
    onClick: e => e.target.select(),
    readOnly: true
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("button", {
    type: "button",
    className: "button",
    onClick: handleCopy
  }, copied ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Copied!', 'm-chart') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Copy', 'm-chart'))), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
    className: "image"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("label", {
    htmlFor: "m-chart-image"
  }, (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Image', 'm-chart')), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("br", null), imageUrl ? (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("input", {
    className: "input",
    type: "text",
    name: "m-chart[image]",
    id: "m-chart-image",
    value: imageUrl,
    style: {
      width: '100%'
    },
    onClick: e => e.target.select(),
    readOnly: true
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("a", {
    href: imageUrl,
    className: "button",
    target: "_blank",
    rel: "noreferrer"
  }, (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('View', 'm-chart'))) : imageDisabled ? (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("em", null, (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Image generation is disabled', 'm-chart')) : (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("em", null, (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Save/Update this post to generate the image version', 'm-chart'))), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("input", {
    type: "hidden",
    name: "m-chart[library]",
    id: "m-chart-library",
    value: postMeta.library
  }));
}

/***/ },

/***/ "./components/admin-ui-src/components/SpreadsheetMetaBox.js"
/*!******************************************************************!*\
  !*** ./components/admin-ui-src/components/SpreadsheetMetaBox.js ***!
  \******************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ SpreadsheetMetaBox)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _context_ChartAdminContext__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../context/ChartAdminContext */ "./components/admin-ui-src/context/ChartAdminContext.js");
/* harmony import */ var _JspreadsheetWrapper__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./JspreadsheetWrapper */ "./components/admin-ui-src/components/JspreadsheetWrapper.js");
/* harmony import */ var _SheetTabs__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./SheetTabs */ "./components/admin-ui-src/components/SheetTabs.js");
/* harmony import */ var _CsvControls__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./CsvControls */ "./components/admin-ui-src/components/CsvControls.js");







// WordPress submit button IDs that should trigger save behavior
const SUBMIT_BUTTON_IDS = ['publish', 'save-post'];

/**
 * Container for the spreadsheet meta box
 *
 * Manages Jspreadsheet worksheet instances via a ref map keyed by stable sheet ID
 * Handles form submission: writes all sheet data to the hidden textarea[name="m-chart[data]"] before the post form is submitted
 */
function SpreadsheetMetaBox() {
  const {
    state,
    dispatch
  } = (0,_context_ChartAdminContext__WEBPACK_IMPORTED_MODULE_2__.useChartAdmin)();
  const {
    sheetIds,
    spreadsheetData,
    activeSheet,
    formEnabled,
    pendingSubmit
  } = state;

  // Map of stable sheetId → worksheet instance (Jspreadsheet worksheet object)
  const worksheetInstances = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useRef)({});

  // Refs so event handlers always see the latest values without needing to be recreated
  const formEnabledRef = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useRef)(formEnabled);
  const sheetIdsRef = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useRef)(sheetIds);
  formEnabledRef.current = formEnabled;
  sheetIdsRef.current = sheetIds;

  // Called by JspreadsheetWrapper after it initialises its jspreadsheet instance
  const handleMounted = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useCallback)((sheetId, worksheet) => {
    worksheetInstances.current[sheetId] = worksheet;
  }, []);

  // Called by JspreadsheetWrapper just before it unmounts
  const handleUnmounted = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useCallback)(sheetId => {
    delete worksheetInstances.current[sheetId];
  }, []);

  // Returns the worksheet instance for the currently active sheet
  const getActiveWorksheet = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useCallback)(() => {
    var _worksheetInstances$c;
    const activeId = sheetIdsRef.current[state.activeSheet];
    return (_worksheetInstances$c = worksheetInstances.current[activeId]) !== null && _worksheetInstances$c !== void 0 ? _worksheetInstances$c : null;
  }, [state.activeSheet]);

  // Writes all sheet data to the hidden textarea so the form POST includes it
  const writeDataToForm = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useCallback)(() => {
    const form = document.getElementById('post');
    if (!form) {
      return;
    }
    const allData = sheetIdsRef.current.map(id => {
      var _worksheetInstances$c2;
      return (_worksheetInstances$c2 = worksheetInstances.current[id]?.getData()) !== null && _worksheetInstances$c2 !== void 0 ? _worksheetInstances$c2 : [['']];
    });
    const dataTextarea = form.querySelector('textarea[name="m-chart[data]"]');
    if (dataTextarea) {
      dataTextarea.value = JSON.stringify(allData);
    }
  }, []);

  // When formEnabled becomes true while a submit is pending, submit the form
  // Uses form.submit() to bypass event handlers since the data textarea is already written
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    if (formEnabled && pendingSubmit) {
      dispatch({
        type: 'SET_PENDING_SUBMIT',
        payload: false
      });

      // Write latest data right before submitting
      writeDataToForm();
      const form = document.getElementById('post');
      if (form) {
        form.submit();
      }
    }
  }, [formEnabled, pendingSubmit, dispatch, writeDataToForm]);

  // Detect submit intent at the click event on WP submit buttons
  // Click fires AFTER blur but BEFORE the form's submit event
  // This is the earliest reliable detection point
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    function handleClick(e) {
      // If the chart is still refreshing, intercept the click to defer submission
      // The form submit event hasn't fired yet so we prevent the default click behavior
      if (!formEnabledRef.current) {
        e.preventDefault();
        writeDataToForm();
        dispatch({
          type: 'SET_PENDING_SUBMIT',
          payload: true
        });
        return;
      }

      // Form is ready — write data and let the normal submit flow proceed
      writeDataToForm();
    }
    const buttons = SUBMIT_BUTTON_IDS.map(id => document.getElementById(id)).filter(Boolean);
    buttons.forEach(btn => btn.addEventListener('click', handleClick));
    return () => {
      buttons.forEach(btn => btn.removeEventListener('click', handleClick));
    };
  }, [dispatch, writeDataToForm]);

  // Intercept the form submit event as a fallback
  // Ensures the data textarea is always written before submission regardless of how
  // the submit was triggered (keyboard, other plugins, etc)
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    const form = document.getElementById('post');
    if (!form) {
      return;
    }
    function handleSubmit(e) {
      // If chart is still refreshing, block this submit — the click handler
      // already set pendingSubmit so it will auto-submit when ready
      if (!formEnabledRef.current) {
        e.preventDefault();
        return;
      }

      // Write data in case the submit wasn't triggered via our click handler
      writeDataToForm();
    }
    form.addEventListener('submit', handleSubmit);
    return () => form.removeEventListener('submit', handleSubmit);
  }, [writeDataToForm]);
  return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_SheetTabs__WEBPACK_IMPORTED_MODULE_4__["default"], null), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    id: "spreadsheets"
  }, sheetIds.map((id, index) => (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_JspreadsheetWrapper__WEBPACK_IMPORTED_MODULE_3__["default"], {
    key: id,
    sheetId: id,
    sheetIndex: index,
    isActive: index === activeSheet,
    data: spreadsheetData[index],
    onMounted: handleMounted,
    onUnmounted: handleUnmounted
  }))), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_CsvControls__WEBPACK_IMPORTED_MODULE_5__["default"], {
    getActiveWorksheet: getActiveWorksheet
  }));
}

/***/ },

/***/ "./components/admin-ui-src/components/SubtitleField.js"
/*!*************************************************************!*\
  !*** ./components/admin-ui-src/components/SubtitleField.js ***!
  \*************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ SubtitleField)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _context_ChartAdminContext__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../context/ChartAdminContext */ "./components/admin-ui-src/context/ChartAdminContext.js");




/**
 * Reach controlled subtitle input
 *
 * Renders with the m-chart[subtitle] name attribute so the value is submitted with the native WordPress post form and the existing PHP save logic still works
 */
function SubtitleField() {
  var _state$postMeta$subti;
  const {
    state,
    dispatch
  } = (0,_context_ChartAdminContext__WEBPACK_IMPORTED_MODULE_2__.useChartAdmin)();
  const value = (_state$postMeta$subti = state.postMeta?.subtitle) !== null && _state$postMeta$subti !== void 0 ? _state$postMeta$subti : '';
  return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("input", {
    className: "input",
    type: "text",
    name: "m-chart[subtitle]",
    id: "m-chart-subtitle",
    value: value,
    placeholder: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Enter subtitle here', 'm-chart'),
    style: {
      width: '100%'
    },
    onChange: e => dispatch({
      type: 'SET_SUBTITLE',
      payload: e.target.value
    })
  });
}

/***/ },

/***/ "./components/admin-ui-src/components/TypeAndThemeRow.js"
/*!***************************************************************!*\
  !*** ./components/admin-ui-src/components/TypeAndThemeRow.js ***!
  \***************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ TypeAndThemeRow)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _context_ChartAdminContext__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../context/ChartAdminContext */ "./components/admin-ui-src/context/ChartAdminContext.js");
/* harmony import */ var _utils_measureTextWidth__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../utils/measureTextWidth */ "./components/admin-ui-src/utils/measureTextWidth.js");





function TypeAndThemeRow() {
  var _postMeta$height;
  const {
    state,
    dispatch
  } = (0,_context_ChartAdminContext__WEBPACK_IMPORTED_MODULE_3__.useChartAdmin)();
  const {
    postMeta,
    typeOptions,
    typeOptionNames,
    themes
  } = state;
  const [heightEl, setHeightEl] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(null);
  const heightRef = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useCallback)(node => setHeightEl(node), []);
  const heightValue = String((_postMeta$height = postMeta.height) !== null && _postMeta$height !== void 0 ? _postMeta$height : '');
  const heightWidth = heightEl ? (0,_utils_measureTextWidth__WEBPACK_IMPORTED_MODULE_4__.measureTextWidth)(heightValue, heightEl) + 20 + 'px' : '73px';
  function handleChange(field, value) {
    dispatch({
      type: 'SET_POST_META',
      payload: {
        [field]: value
      }
    });
  }
  return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "row one"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("label", {
    htmlFor: "m-chart-type"
  }, (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Type', 'm-chart')), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("br", null), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("select", {
    name: "m-chart[type]",
    id: "m-chart-type",
    className: "select",
    value: postMeta.type,
    onChange: e => handleChange('type', e.target.value)
  }, typeOptions.map(type => (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("option", {
    key: type,
    value: type
  }, typeOptionNames[type] || type)))), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("label", {
    htmlFor: "m-chart-theme"
  }, (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Theme', 'm-chart')), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("br", null), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("select", {
    name: "m-chart[theme]",
    id: "m-chart-theme",
    value: postMeta.theme,
    onChange: e => handleChange('theme', e.target.value)
  }, themes.map(theme => (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("option", {
    key: theme.slug,
    value: theme.slug
  }, theme.name)))), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("label", {
    htmlFor: "m-chart-height"
  }, (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Height', 'm-chart')), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("br", null), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("input", {
    type: "number",
    name: "m-chart[height]",
    id: "m-chart-height",
    ref: heightRef,
    value: postMeta.height,
    min: "300",
    max: "1500",
    onChange: e => handleChange('height', e.target.value),
    style: {
      width: heightWidth,
      minWidth: 0
    }
  })));
}

/***/ },

/***/ "./components/admin-ui-src/context/ChartAdminContext.js"
/*!**************************************************************!*\
  !*** ./components/admin-ui-src/context/ChartAdminContext.js ***!
  \**************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ChartAdminProvider: () => (/* binding */ ChartAdminProvider),
/* harmony export */   useChartAdmin: () => (/* binding */ useChartAdmin)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_1__);


const {
  m_chart_admin
} = window;

/**
 * Initial state populated from the PHP-localised window.m_chart_admin object
 *
 * post_meta contains all chart meta fields except 'data' (spreadsheetData holds that)
 * Fields mirror the PHP $chart_meta_fields defaults in class-m-chart.php
 */

// Stable sheet IDs — never change once a sheet is created, survive deletion of siblings
const initialSheetCount = (m_chart_admin.spreadsheet_data || [[]]).length;
const initialSheetIds = Array.from({
  length: initialSheetCount
}, (_, i) => i);
const initialState = {
  slug: m_chart_admin.slug,
  postId: m_chart_admin.post_id,
  nonce: m_chart_admin.nonce,
  ajaxUrl: m_chart_admin.ajax_url,
  library: m_chart_admin.library,
  performance: m_chart_admin.performance,
  imageSupport: m_chart_admin.image_support,
  instantPreview: m_chart_admin.instant_preview_support,
  imageMultiplier: m_chart_admin.image_multiplier,
  imageWidth: m_chart_admin.image_width,
  deleteConfirm: m_chart_admin.delete_confirm,
  csvDelimiters: m_chart_admin.csv_delimiters || {
    ',': 'Comma'
  },
  defaultDelimiter: m_chart_admin.default_delimiter || ',',
  // Chart meta fields (type, theme, height, parse_in, labels, legend, etc.)
  postMeta: m_chart_admin.post_meta,
  // Array of 2D arrays, one per sheet (matches Jspreadsheet's getData() format)
  spreadsheetData: m_chart_admin.spreadsheet_data,
  // Array of human-readable names for each sheet tab
  setNames: m_chart_admin.set_names || [],
  // Stable IDs for each sheet — used as React keys to avoid spurious remounts
  sheetIds: initialSheetIds,
  // Counter for the next sheet ID to assign
  nextSheetId: initialSheetCount,
  // ID of the most recently added sheet — SheetTab uses this to auto-enter rename mode
  newSheetId: null,
  // Index of the currently active sheet tab
  activeSheet: 0,
  // Chart.js args object — seeded from PHP on load, updated by useChartRefresh
  chartArgs: m_chart_admin.chart_args || null,
  // True while waiting for ajax_get_chart_args to respond
  isRefreshing: false,
  // Controls whether the WordPress Save/Publish buttons are enabled
  formEnabled: false,
  // True when the user clicked Save/Update while the chart was still refreshing
  pendingSubmit: false,
  // Static config from PHP — library-specific options for the settings form
  typeOptions: m_chart_admin.type_options || [],
  typeOptionNames: m_chart_admin.type_option_names || {},
  themes: m_chart_admin.themes || [],
  unitTerms: m_chart_admin.unit_terms || [],
  imageUrl: m_chart_admin.image_url || ''
};
function reducer(state, action) {
  switch (action.type) {
    case 'SET_POST_META':
      return {
        ...state,
        postMeta: {
          ...state.postMeta,
          ...action.payload
        }
      };
    case 'SET_SHEET_DATA':
      {
        const spreadsheetData = [...state.spreadsheetData];
        spreadsheetData[action.payload.index] = action.payload.data;
        // Disable form immediately so a submit during the refresh window is gated
        return {
          ...state,
          spreadsheetData,
          formEnabled: false
        };
      }
    case 'ADD_SHEET':
      {
        const setNames = [...state.setNames, action.payload.name || ''];
        const spreadsheetData = [...state.spreadsheetData, [['']]];
        const sheetIds = [...state.sheetIds, state.nextSheetId];
        return {
          ...state,
          setNames,
          spreadsheetData,
          sheetIds,
          nextSheetId: state.nextSheetId + 1,
          activeSheet: spreadsheetData.length - 1,
          newSheetId: state.nextSheetId
        };
      }
    case 'CLEAR_NEW_SHEET_ID':
      return {
        ...state,
        newSheetId: null
      };
    case 'DELETE_SHEET':
      {
        if (state.spreadsheetData.length <= 1) {
          return state;
        }
        const idx = action.payload.index;
        const spreadsheetData = state.spreadsheetData.filter((_, i) => i !== idx);
        const setNames = state.setNames.filter((_, i) => i !== idx);
        const sheetIds = state.sheetIds.filter((_, i) => i !== idx);
        const activeSheet = Math.min(state.activeSheet, spreadsheetData.length - 1);
        return {
          ...state,
          spreadsheetData,
          setNames,
          sheetIds,
          activeSheet
        };
      }
    case 'RENAME_SHEET':
      {
        const setNames = [...state.setNames];
        setNames[action.payload.index] = action.payload.name;
        return {
          ...state,
          setNames
        };
      }
    case 'SET_ACTIVE_SHEET':
      return {
        ...state,
        activeSheet: action.payload
      };
    case 'SET_CHART_ARGS':
      return {
        ...state,
        chartArgs: action.payload
      };
    case 'SET_REFRESHING':
      return {
        ...state,
        isRefreshing: action.payload
      };
    case 'SET_FORM_ENABLED':
      return {
        ...state,
        formEnabled: action.payload
      };
    case 'SET_PENDING_SUBMIT':
      return {
        ...state,
        pendingSubmit: action.payload
      };
    case 'SET_SUBTITLE':
      return {
        ...state,
        postMeta: {
          ...state.postMeta,
          subtitle: action.payload
        }
      };
    default:
      return state;
  }
}
const ChartAdminContext = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.createContext)(null);
function ChartAdminProvider({
  children
}) {
  const [state, dispatch] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useReducer)(reducer, initialState);
  return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(ChartAdminContext.Provider, {
    value: {
      state,
      dispatch
    }
  }, children);
}

/**
 * Convenience hook — returns { state, dispatch } from the nearest provider
 */
function useChartAdmin() {
  const context = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useContext)(ChartAdminContext);
  if (!context) {
    throw new Error('useChartAdmin must be used within a ChartAdminProvider');
  }
  return context;
}

/***/ },

/***/ "./components/admin-ui-src/hooks/useChartRefresh.js"
/*!**********************************************************!*\
  !*** ./components/admin-ui-src/hooks/useChartRefresh.js ***!
  \**********************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   useChartRefresh: () => (/* binding */ useChartRefresh)
/* harmony export */ });
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _context_ChartAdminContext__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../context/ChartAdminContext */ "./components/admin-ui-src/context/ChartAdminContext.js");



/**
 * Fires an AJAX request to get updated chart args whenever postMeta, spreadsheetData, setNames, or title changes
 * We pass title as a parameter because it's core WP and not present in the React environment
 *
 * @param {string} title The current post title (read from #title DOM input).
 */
function useChartRefresh(title) {
  const {
    state,
    dispatch
  } = (0,_context_ChartAdminContext__WEBPACK_IMPORTED_MODULE_1__.useChartAdmin)();
  const {
    postId,
    nonce,
    ajaxUrl,
    library,
    postMeta,
    spreadsheetData,
    setNames,
    performance,
    imageSupport
  } = state;
  const timerRef = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  const abortRef = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  const isFirstRun = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useRef)(true);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    // Skip the initial mount — the chart is already rendered from the PHP-seeded args
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }

    // Cancel any pending debounce
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(async () => {
      // This should cancel any currently running requests so only the most recent request is run
      if (abortRef.current) {
        abortRef.current.abort();
      }
      abortRef.current = new AbortController();
      dispatch({
        type: 'SET_REFRESHING',
        payload: true
      });
      dispatch({
        type: 'SET_FORM_ENABLED',
        payload: false
      });
      try {
        // Start buidling the values we'll send to the m_chart_get_chart_args endpoint
        const body = new URLSearchParams();
        body.append('post_id', postId);
        body.append('nonce', nonce);
        body.append('library', library);
        body.append('title', title || '');

        // Build post_meta matching the format the m_chart_get_chart_args expects
        // Exclude set_names since it is sent separately as indexed PHP array values
        const meta = {
          ...postMeta
        };
        delete meta.set_names;
        meta.data = JSON.stringify(spreadsheetData);
        Object.entries(meta).forEach(([key, val]) => {
          let serialized;
          if (typeof val === 'boolean') {
            // PHP's (boolean) cast treats any non-empty string as true, including "false"
            // Use 1/0 so unchecked checkboxes are correctly read as false
            serialized = val ? '1' : '0';
          } else if (typeof val === 'object' && val !== null) {
            serialized = JSON.stringify(val);
          } else {
            serialized = val !== null && val !== void 0 ? val : '';
          }
          body.append(`post_meta[${key}]`, serialized);
        });

        // set_names must arrive in PHP as an array, not a JSON string
        // Sending post_meta[set_names][0], [1], … lets PHP parse it as an array
        (setNames || []).forEach((name, i) => {
          body.append(`post_meta[set_names][${i}]`, name);
        });

        // Make the actual request to the endpoint
        const response = await fetch(ajaxUrl + '?action=m_chart_get_chart_args', {
          method: 'POST',
          body,
          signal: abortRef.current.signal
        });
        const json = await response.json();

        // If the request succeeded we dispatch the returned data nd then trigger the m_chart.chart_args_success hook and pass it the new data and postId
        if (json.success) {
          dispatch({
            type: 'SET_CHART_ARGS',
            payload: json.data
          });
          if (window.wp && window.wp.hooks) {
            window.wp.hooks.doAction('m_chart.chart_args_success', json.data, postId);
          }

          // If no image generation is needed, enable the form now
          // Otherwise ChartPreview's animation.onComplete enables it after capture
          if ('default' !== performance || 'yes' !== imageSupport) {
            dispatch({
              type: 'SET_FORM_ENABLED',
              payload: true
            });
          }
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          // eslint-disable-next-line no-console
          console.error('m-chart: chart refresh failed', err);
        }
      } finally {
        dispatch({
          type: 'SET_REFRESHING',
          payload: false
        });
      }
    }, 300);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [postMeta, spreadsheetData, setNames, title]); // eslint-disable-line react-hooks/exhaustive-deps
}

/***/ },

/***/ "./components/admin-ui-src/hooks/useFormSubmissionGuard.js"
/*!*****************************************************************!*\
  !*** ./components/admin-ui-src/hooks/useFormSubmissionGuard.js ***!
  \*****************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   useFormSubmissionGuard: () => (/* binding */ useFormSubmissionGuard)
/* harmony export */ });
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _context_ChartAdminContext__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../context/ChartAdminContext */ "./components/admin-ui-src/context/ChartAdminContext.js");


const BUTTON_IDS = ['save-post', 'wp-preview', 'post-preview', 'publish'];

/**
 * Keeps the WordPress Save/Publish buttons and form submission gated on state.formEnabled
 *
 * When formEnabled is false:
 *   - Adds the 'disabled' class to the WP submit buttons
 *   - Blocks form submission via a submit event listener
 *
 * When formEnabled is true:
 *   - Removes the 'disabled' class from those buttons
 *   - Allows form submission through normally
 */
function useFormSubmissionGuard() {
  const {
    state
  } = (0,_context_ChartAdminContext__WEBPACK_IMPORTED_MODULE_1__.useChartAdmin)();
  const {
    formEnabled
  } = state;

  // Toggle disabled class on WP buttons
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    BUTTON_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.toggle('disabled', !formEnabled);
      }
    });
  }, [formEnabled]);

  // Block form submission when not ready
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    const form = document.getElementById('post');
    if (!form) {
      return;
    }
    function handleSubmit(e) {
      if (!formEnabled) {
        e.preventDefault();
      }
    }
    form.addEventListener('submit', handleSubmit);
    return () => form.removeEventListener('submit', handleSubmit);
  }, [formEnabled]);
}

/***/ },

/***/ "./components/admin-ui-src/hooks/useImageGeneration.js"
/*!*************************************************************!*\
  !*** ./components/admin-ui-src/hooks/useImageGeneration.js ***!
  \*************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   useImageGeneration: () => (/* binding */ useImageGeneration)
/* harmony export */ });
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _context_ChartAdminContext__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../context/ChartAdminContext */ "./components/admin-ui-src/context/ChartAdminContext.js");



/**
 * Returns a stable `generateImage` callback that captures the current Chart.js instance as a PNG, writes it to the hidden img textarea, then re-enables the form
 *
 * @param {React.MutableRefObject} chartRef  Ref holding the Chart.js instance
 */
function useImageGeneration(chartRef) {
  const {
    state,
    dispatch
  } = (0,_context_ChartAdminContext__WEBPACK_IMPORTED_MODULE_1__.useChartAdmin)();

  // Keep a ref so the callback always sees the latest state without being recreated
  const stateRef = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useRef)(state);
  stateRef.current = state;
  const generateImage = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useCallback)(() => {
    const chart = chartRef.current;
    if (!chart) {
      return;
    }

    // Non-canvas libraries (e.g. Highcharts) handle image generation
    // via the m_chart.render_done action hook instead.
    if (!chart.canvas) {
      dispatch({
        type: 'SET_FORM_ENABLED',
        payload: true
      });
      return;
    }
    const {
      imageWidth,
      postMeta
    } = stateRef.current;
    const chartWidth = parseInt(imageWidth, 10);
    const chartHeight = parseInt(postMeta.height, 10);
    const canvas = chart.canvas;
    const container = canvas.parentElement;

    // Resize container to image dimensions so chart fills the right area
    container.style.width = chartWidth + 'px';
    container.style.height = chartHeight + 'px';
    chart.resize();

    // Fill solid white background (canvas is transparent by default)
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, chart.width, chart.height);
    ctx.restore();

    // Capture PNG.
    const img = chart.toBase64Image('image/png', 1);

    // Restore container to natural dimensions
    container.style.width = '';
    container.style.height = '';
    chart.resize();

    // Write base64 string to the hidden textarea for form POST
    const imgEl = document.getElementById('m-chart-img');
    if (imgEl) {
      imgEl.value = img;
    }

    // Re-enable form submission.
    dispatch({
      type: 'SET_FORM_ENABLED',
      payload: true
    });
  }, [chartRef, dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  return generateImage;
}

/***/ },

/***/ "./components/admin-ui-src/hooks/useLongPress.js"
/*!*******************************************************!*\
  !*** ./components/admin-ui-src/hooks/useLongPress.js ***!
  \*******************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   useLongPress: () => (/* binding */ useLongPress)
/* harmony export */ });
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_0__);

const LONG_PRESS_DELAY = 500;

/**
 * Returns pointer-event handlers that fire `callback` after a sustained press
 * Spread the returned object onto any element: <div {...longPress} />
 */
function useLongPress(callback) {
  const timerRef = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  const cancel = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useCallback)(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);
  const start = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useCallback)(e => {
    // Only respond to primary pointer (left-click / first touch)
    if (e.button !== undefined && e.button !== 0) {
      return;
    }
    cancel();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      callback(e);
    }, LONG_PRESS_DELAY);
  }, [callback, cancel]);
  return {
    onPointerDown: start,
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel
  };
}

/***/ },

/***/ "./components/admin-ui-src/utils/measureTextWidth.js"
/*!***********************************************************!*\
  !*** ./components/admin-ui-src/utils/measureTextWidth.js ***!
  \***********************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   measureTextWidth: () => (/* binding */ measureTextWidth)
/* harmony export */ });
/**
 * Measures the pixel width needed to display a string inside a given input element, using a canvas and the input's computed font style
 *
 * Falls back to a character-count estimate if the input element is not yet mounted (e.g. on the first render before refs are attached)
 *
 * @param {string}           text    The string to measure
 * @param {HTMLInputElement} inputEl The input element whose font to use
 * 
 * @return {number} Width in pixels
 */
function measureTextWidth(text, inputEl) {
  if (!inputEl) {
    return Math.max(40, text.length * 8 + 16);
  }
  const style = window.getComputedStyle(inputEl);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = style.font;
  const textWidth = Math.ceil(ctx.measureText(text).width) + 1;
  const borderWidth = parseFloat(style.borderWidth) || 0;
  const paddingLeft = parseFloat(style.paddingLeft) || 0;
  const paddingRight = parseFloat(style.paddingRight) || 0;
  return borderWidth * 2 + paddingLeft + textWidth + paddingRight;
}

/***/ },

/***/ "react"
/*!************************!*\
  !*** external "React" ***!
  \************************/
(module) {

module.exports = window["React"];

/***/ },

/***/ "@wordpress/element"
/*!*********************************!*\
  !*** external ["wp","element"] ***!
  \*********************************/
(module) {

module.exports = window["wp"]["element"];

/***/ },

/***/ "@wordpress/i18n"
/*!******************************!*\
  !*** external ["wp","i18n"] ***!
  \******************************/
(module) {

module.exports = window["wp"]["i18n"];

/***/ }

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		if (!(moduleId in __webpack_modules__)) {
/******/ 			delete __webpack_module_cache__[moduleId];
/******/ 			var e = new Error("Cannot find module '" + moduleId + "'");
/******/ 			e.code = 'MODULE_NOT_FOUND';
/******/ 			throw e;
/******/ 		}
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!******************************************!*\
  !*** ./components/admin-ui-src/index.js ***!
  \******************************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _context_ChartAdminContext__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./context/ChartAdminContext */ "./components/admin-ui-src/context/ChartAdminContext.js");
/* harmony import */ var _components_ChartMetaBox__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./components/ChartMetaBox */ "./components/admin-ui-src/components/ChartMetaBox.js");
/* harmony import */ var _components_SpreadsheetMetaBox__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./components/SpreadsheetMetaBox */ "./components/admin-ui-src/components/SpreadsheetMetaBox.js");
/* harmony import */ var _components_SubtitleField__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./components/SubtitleField */ "./components/admin-ui-src/components/SubtitleField.js");
/* harmony import */ var _components_TypeAndThemeRow__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./components/TypeAndThemeRow */ "./components/admin-ui-src/components/TypeAndThemeRow.js");
/* harmony import */ var _components_ParseAndFlagsRow__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./components/ParseAndFlagsRow */ "./components/admin-ui-src/components/ParseAndFlagsRow.js");
/* harmony import */ var _components_AxisRows__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./components/AxisRows */ "./components/admin-ui-src/components/AxisRows.js");
/* harmony import */ var _components_ShortcodeAndImageRow__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./components/ShortcodeAndImageRow */ "./components/admin-ui-src/components/ShortcodeAndImageRow.js");











// Expose shared context hook and settings row components for library plugins
// that implement the m_chart.settings_component filter without a build step
window.m_chart = {
  useChartAdmin: _context_ChartAdminContext__WEBPACK_IMPORTED_MODULE_2__.useChartAdmin,
  TypeAndThemeRow: _components_TypeAndThemeRow__WEBPACK_IMPORTED_MODULE_6__["default"],
  ParseAndFlagsRow: _components_ParseAndFlagsRow__WEBPACK_IMPORTED_MODULE_7__["default"],
  AxisRows: _components_AxisRows__WEBPACK_IMPORTED_MODULE_8__["default"],
  ShortcodeAndImageRow: _components_ShortcodeAndImageRow__WEBPACK_IMPORTED_MODULE_9__["default"]
};

/**
 * The admin UI spans multiple meta boxes and the title area, so we use a single
 * React root (in a hidden container) with portals to render into each mount point
 * This ensures all components share a single ChartAdminContext instance
 */

// Register Chart.js plugins before any chart instances are created
if (window.Chart && window.ChartDataLabels) {
  window.Chart.register(window.ChartDataLabels);
}
if (window.Chart && window.MChartHelper) {
  window.Chart.register(window.MChartHelper);
}
const subtitleRoot = document.getElementById('m-chart-subtitle-root');
const spreadsheetRoot = document.getElementById('m-chart-spreadsheet-root');
const chartRoot = document.getElementById('m-chart-chart-root');
if (subtitleRoot || spreadsheetRoot || chartRoot) {
  const App = () => (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_context_ChartAdminContext__WEBPACK_IMPORTED_MODULE_2__.ChartAdminProvider, null, subtitleRoot && (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.createPortal)((0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_components_SubtitleField__WEBPACK_IMPORTED_MODULE_5__["default"], null), subtitleRoot), spreadsheetRoot && (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.createPortal)((0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_components_SpreadsheetMetaBox__WEBPACK_IMPORTED_MODULE_4__["default"], null), spreadsheetRoot), chartRoot && (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.createPortal)((0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_components_ChartMetaBox__WEBPACK_IMPORTED_MODULE_3__["default"], null), chartRoot));

  // Mount the app into a hidden container appended to the post form
  // All visible content is rendered via portals into the actual meta box divs
  const postForm = document.getElementById('post');
  if (postForm) {
    const container = document.createElement('div');
    container.id = 'm-chart-admin-ui';
    container.hidden = true;
    postForm.appendChild(container);
    (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.createRoot)(container).render((0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(App, null));
  }
}
})();

/******/ })()
;
//# sourceMappingURL=index.js.map