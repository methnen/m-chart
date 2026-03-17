/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./components/block-src/chart/edit.js"
/*!********************************************!*\
  !*** ./components/block-src/chart/edit.js ***!
  \********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ edit)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_blocks__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/blocks */ "@wordpress/blocks");
/* harmony import */ var _wordpress_blocks__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_blocks__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _wordpress_block_editor__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @wordpress/block-editor */ "@wordpress/block-editor");
/* harmony import */ var _wordpress_block_editor__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! @wordpress/api-fetch */ "@wordpress/api-fetch");
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_6___default = /*#__PURE__*/__webpack_require__.n(_wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_6__);
/* harmony import */ var lodash_debounce__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! lodash/debounce */ "./node_modules/lodash/debounce.js");
/* harmony import */ var lodash_debounce__WEBPACK_IMPORTED_MODULE_7___default = /*#__PURE__*/__webpack_require__.n(lodash_debounce__WEBPACK_IMPORTED_MODULE_7__);
/* harmony import */ var _editor_scss__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./editor.scss */ "./components/block-src/chart/editor.scss");









function edit({
  attributes,
  setAttributes
}) {
  // State
  const [results, setResults] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_3__.useState)([]);
  const [search, setSearch] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_3__.useState)('');
  const [postsAvailable, setPostsAvailable] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_3__.useState)(false);
  const [available, setAvailable] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_3__.useState)(0);
  const [loaded, setLoaded] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_3__.useState)(false);
  const [charts, setCharts] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_3__.useState)([]);
  const [selectedChart, setSelectedChart] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_3__.useState)(null);
  const [siteUrl, setSiteUrl] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_3__.useState)(null);
  const [imageSupport, setImageSupport] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_3__.useState)(false);
  const [loadProblem, setLoadProblem] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_3__.useState)(false);
  const [page, setPage] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_3__.useState)(1);
  const [loadingMore, setLoadingMore] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_3__.useState)(false);
  const resultsRef = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_3__.useRef)(null);

  // URLs
  const newUrl = `${siteUrl}/wp-admin/post-new.php?post_type=m-chart`;
  const editUrl = `${siteUrl}/wp-admin/post.php?post=${attributes.chartId}&action=edit`;
  const optionsUrl = `/m-chart/v1/options`;

  // Blockprops
  const blockProps = (0,_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_4__.useBlockProps)({
    className: 'm-chart-block-chart-selector'
  });

  // Set a cache URL parameter based on the current moment in time to prevent cached images from messing up the UI
  const cacheBuster = `?cache=${performance.now()}`;

  // On load we fetch some option settings and run fetchCharts so we have some intiial reasults loaded into the UI
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_3__.useEffect)(() => {
    fetchOptions();
    fetchCharts(search);
  }, []);

  // Fetch the selected chart individually whenever chartId changes
  // Using attributes.chartId as a dependency handles the case where Gutenberg provides the saved attribute value after the initial render
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_3__.useEffect)(() => {
    setSelectedChart(null);
    if (attributes.chartId) {
      fetchChart(parseInt(attributes.chartId, 10));
    }
  }, [attributes.chartId]);

  // Load more charts when scrolling near the bottom of the results list
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_3__.useEffect)(() => {
    const el = resultsRef.current;
    if (!el) return;
    const handleScroll = () => {
      if (loadingMore) return;
      if (results.length >= available) return;

      // If we're close enough to the bottom of the list load the next page
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchCharts(search, nextPage);
      }
    };
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, [results, available, loadingMore, page, search]);

  // Build list of charts
  const resultsList = results.map(x => {
    if (imageSupport) {
      return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("li", {
        className: x.src ? 'item img' : 'item no-image',
        key: x.id,
        onClick: () => handleClick(x.id),
        title: x.title
      }, x.src ? (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("h6", {
        className: "title"
      }, x.title), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("img", {
        src: x.src + cacheBuster,
        alt: x.title
      })) : (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
        className: "type"
      }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("span", {
        className: 'icon ' + x.type
      }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("h6", {
        className: "title"
      }, x.title))));
    } else {
      return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("li", {
        className: "no-image",
        key: x.id,
        onClick: () => handleClick(x.id),
        title: x.title
      }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
        className: "type"
      }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("span", {
        className: 'icon ' + x.type
      }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("h6", {
        className: "title"
      }, x.title)));
    }
  });
  const selected = charts.filter(x => x.id === parseInt(attributes.chartId, 10))[0] || selectedChart;

  // Handle clicks to a chart in the results list
  const handleClick = id => {
    setAttributes({
      chartId: id
    });
    setSelectedChart(null);
  };

  // Handle user typing into the search field
  const handleSearch = value => {
    setSearch(value);
    setPage(1);
    doDebounce(value);
  };

  // Get option settings
  const fetchOptions = () => {
    _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_6___default()({
      path: optionsUrl
    }).then(result => {
      setImageSupport(result.image_support);
      setSiteUrl(result.siteurl);
      setPostsAvailable(result.posts_avilable);
    });
  };
  const fetchChart = id => {
    _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_6___default()({
      path: `/m-chart/v1/chart/${id}`
    }).then(result => {
      setSelectedChart({
        id: result.id,
        title: result.title || '-',
        subtitle: result.subtitle,
        width: result.width,
        height: result.height,
        type: result.type || '',
        src: result.url || ''
      });
    }).catch(() => {});
  };
  const fetchCharts = (value, fetchPage = 1) => {
    setLoadProblem(false);
    if (fetchPage > 1) {
      setLoadingMore(true);
    }
    const params = new URLSearchParams();
    if (value) {
      params.set('s', value);
    }
    if (fetchPage > 1) {
      params.set('page', fetchPage);
    }
    const query = params.toString();
    _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_6___default()({
      path: `/m-chart/v1/charts${query ? '?' + query : ''}`
    }).then(result => {
      const newCharts = result.posts.map(x => ({
        id: x.id,
        title: x.title || '-',
        subtitle: x.subtitle,
        width: x.width,
        height: x.height,
        type: x.type || '',
        src: x.url || ''
      }));
      setAvailable(result.found_posts);
      if (fetchPage === 1) {
        setCharts(newCharts);
        setResults(newCharts);
      } else {
        setCharts(prev => [...prev, ...newCharts]);
        setResults(prev => [...prev, ...newCharts]);
      }
      setLoaded(true);
      setLoadingMore(false);
    }).catch(error => {
      if (error.code === 'rest_no_route') {
        setLoadProblem(true);
      }
      setLoadingMore(false);
    });
  };

  // We don't want to run the search until the user is done typeing so we'll setup a debounce to handle that here
  const fetchChartsRef = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_3__.useRef)(fetchCharts);
  fetchChartsRef.current = fetchCharts;
  const doDebounce = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_3__.useMemo)(() => lodash_debounce__WEBPACK_IMPORTED_MODULE_7___default()((...args) => fetchChartsRef.current(...args), 500), []);
  return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    ...blockProps
  }, !!attributes.chartId && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_4__.InspectorControls, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.PanelBody, {
    title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_5__.__)('Display settings', 'm-chart')
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.SelectControl, {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_5__.__)('Show', 'm-chart'),
    value: attributes.show,
    options: [{
      label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_5__.__)('Chart', 'm-chart'),
      value: 'chart'
    }, {
      label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_5__.__)('Image', 'm-chart'),
      value: 'image'
    }, {
      label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_5__.__)('Table', 'm-chart'),
      value: 'table'
    }],
    onChange: value => setAttributes({
      show: value
    })
  }))), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_4__.BlockControls, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.ToolbarGroup, {
    className: "m-chart-block"
  }, !attributes.chartId && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.ToolbarButton, {
    onClick: () => window.location.href = newUrl,
    icon: "external"
  }, (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_5__.__)('New chart', 'm-chart')), !!attributes.chartId && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.ToolbarButton, {
    onClick: () => window.location.href = editUrl,
    icon: "external"
  }, (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_5__.__)('Edit chart', 'm-chart')), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.ToolbarButton, {
    onClick: () => handleClick(0)
  }, (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_5__.__)('Replace', 'm-chart'))))), !!attributes.chartId ? (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "wp-block m-chart-selector"
  }, !selected ? (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
    className: "center"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.Spinner, null)) : (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "chart-selected"
  }, imageSupport ? (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "image-support"
  }, selected?.src === '' ? (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "type"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("span", {
    className: 'icon ' + selected.type
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("h4", {
    className: "title"
  }, selected.title)) : (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("img", {
    className: "preview",
    src: selected?.src + cacheBuster
  })) : (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "no-image-support",
    style: {
      aspectRatio: selected.width / selected.height
    }
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("span", {
    className: 'type ' + selected.type
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("h4", {
    className: "title"
  }, selected?.title), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", null, selected?.subtitle)))) : (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "wp-block m-chart-selector"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.Placeholder, {
    className: "block-editor-m-chart-placeholder",
    icon: (0,_wordpress_blocks__WEBPACK_IMPORTED_MODULE_2__.getBlockType)('m-chart/chart').icon.src,
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_5__.__)('Chart', 'm-chart')
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "viewbox"
  }, loadProblem ? (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", null, (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_5__.__)('There was a problem loading charts', 'm-chart')) : (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, !loaded ? (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
    className: "center"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.Spinner, null)) : postsAvailable === false ? (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
    className: "center"
  }, (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_5__.__)('No charts found', 'm-chart'), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.ExternalLink, {
    href: newUrl
  }, (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_5__.__)('Create a new chart', 'm-chart'))) : (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "no-chart-selected"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "search-box"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.TextControl, {
    value: search,
    placeholder: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_5__.__)('Search by title', 'm-chart'),
    onChange: value => handleSearch(value),
    autoFocus: true
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
    className: "count"
  }, available, " charts found")), resultsList.length === 0 && search.length > 1 ? (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", null, (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_5__.__)('No charts found', 'm-chart')) : (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("ul", {
    ref: resultsRef,
    className: imageSupport ? 'results image-support' : 'results no-image-support'
  }, resultsList, loadingMore && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("li", {
    className: "loading-more"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.Spinner, null)))))))));
}
;

/***/ },

/***/ "./components/block-src/chart/index.js"
/*!*********************************************!*\
  !*** ./components/block-src/chart/index.js ***!
  \*********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_blocks__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/blocks */ "@wordpress/blocks");
/* harmony import */ var _wordpress_blocks__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_blocks__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _block_json__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./block.json */ "./components/block-src/chart/block.json");
/* harmony import */ var _edit__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./edit */ "./components/block-src/chart/edit.js");






const blockIcon = (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.SVG, {
  viewBox: "0 0 24 24",
  xmlns: "http://www.w3.org/2000/svg",
  width: "24",
  height: "24",
  "aria-hidden": "true",
  focusable: "false"
}, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.Path, {
  d: "M 18.7 3 L 5.3 3 C 4 3 3 4 3 5.3 L 3 18.7 C 3 20 4 21 5.3 21 L 18.7 21 C 20 21 21 20 21 18.7 L 21 5.3 C 21 4 20 3 18.7 3 Z M 19.5 18.7 C 19.5 19.1 19.1 19.5 18.7 19.5 L 5.3 19.5 C 4.9 19.5 4.5 19.1 4.5 18.7 L 4.5 5.3 C 4.5 4.9 4.9 4.5 5.3 4.5 L 18.7 4.5 C 19.1 4.5 19.5 4.9 19.5 5.3 L 19.5 18.7 Z"
}), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.Path, {
  d: "M 12.312 7 L 12.312 11.688 L 17 11.688 C 17 9.1 14.9 7 12.312 7 Z M 11.375 12.157 L 11.375 7.635 C 8.932 7.797 7 9.828 7 12.312 C 7 14.9 9.1 17 11.687 17 C 14.172 17 16.203 15.068 16.365 12.625 L 11.375 12.625 L 11.375 12.157 Z",
  style: {
    strokeWidth: 1
  }
}));
(0,_wordpress_blocks__WEBPACK_IMPORTED_MODULE_2__.registerBlockType)(_block_json__WEBPACK_IMPORTED_MODULE_4__, {
  edit: _edit__WEBPACK_IMPORTED_MODULE_5__["default"],
  save: () => null,
  icon: blockIcon
});

/***/ },

/***/ "./node_modules/lodash/_Symbol.js"
/*!****************************************!*\
  !*** ./node_modules/lodash/_Symbol.js ***!
  \****************************************/
(module, __unused_webpack_exports, __webpack_require__) {

var root = __webpack_require__(/*! ./_root */ "./node_modules/lodash/_root.js");

/** Built-in value references. */
var Symbol = root.Symbol;

module.exports = Symbol;


/***/ },

/***/ "./node_modules/lodash/_baseGetTag.js"
/*!********************************************!*\
  !*** ./node_modules/lodash/_baseGetTag.js ***!
  \********************************************/
(module, __unused_webpack_exports, __webpack_require__) {

var Symbol = __webpack_require__(/*! ./_Symbol */ "./node_modules/lodash/_Symbol.js"),
    getRawTag = __webpack_require__(/*! ./_getRawTag */ "./node_modules/lodash/_getRawTag.js"),
    objectToString = __webpack_require__(/*! ./_objectToString */ "./node_modules/lodash/_objectToString.js");

/** `Object#toString` result references. */
var nullTag = '[object Null]',
    undefinedTag = '[object Undefined]';

/** Built-in value references. */
var symToStringTag = Symbol ? Symbol.toStringTag : undefined;

/**
 * The base implementation of `getTag` without fallbacks for buggy environments.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the `toStringTag`.
 */
function baseGetTag(value) {
  if (value == null) {
    return value === undefined ? undefinedTag : nullTag;
  }
  return (symToStringTag && symToStringTag in Object(value))
    ? getRawTag(value)
    : objectToString(value);
}

module.exports = baseGetTag;


/***/ },

/***/ "./node_modules/lodash/_baseTrim.js"
/*!******************************************!*\
  !*** ./node_modules/lodash/_baseTrim.js ***!
  \******************************************/
(module, __unused_webpack_exports, __webpack_require__) {

var trimmedEndIndex = __webpack_require__(/*! ./_trimmedEndIndex */ "./node_modules/lodash/_trimmedEndIndex.js");

/** Used to match leading whitespace. */
var reTrimStart = /^\s+/;

/**
 * The base implementation of `_.trim`.
 *
 * @private
 * @param {string} string The string to trim.
 * @returns {string} Returns the trimmed string.
 */
function baseTrim(string) {
  return string
    ? string.slice(0, trimmedEndIndex(string) + 1).replace(reTrimStart, '')
    : string;
}

module.exports = baseTrim;


/***/ },

/***/ "./node_modules/lodash/_freeGlobal.js"
/*!********************************************!*\
  !*** ./node_modules/lodash/_freeGlobal.js ***!
  \********************************************/
(module) {

/** Detect free variable `global` from Node.js. */
var freeGlobal = typeof globalThis == 'object' && globalThis && globalThis.Object === Object && globalThis;

module.exports = freeGlobal;


/***/ },

/***/ "./node_modules/lodash/_getRawTag.js"
/*!*******************************************!*\
  !*** ./node_modules/lodash/_getRawTag.js ***!
  \*******************************************/
(module, __unused_webpack_exports, __webpack_require__) {

var Symbol = __webpack_require__(/*! ./_Symbol */ "./node_modules/lodash/_Symbol.js");

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var nativeObjectToString = objectProto.toString;

/** Built-in value references. */
var symToStringTag = Symbol ? Symbol.toStringTag : undefined;

/**
 * A specialized version of `baseGetTag` which ignores `Symbol.toStringTag` values.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the raw `toStringTag`.
 */
function getRawTag(value) {
  var isOwn = hasOwnProperty.call(value, symToStringTag),
      tag = value[symToStringTag];

  try {
    value[symToStringTag] = undefined;
    var unmasked = true;
  } catch (e) {}

  var result = nativeObjectToString.call(value);
  if (unmasked) {
    if (isOwn) {
      value[symToStringTag] = tag;
    } else {
      delete value[symToStringTag];
    }
  }
  return result;
}

module.exports = getRawTag;


/***/ },

/***/ "./node_modules/lodash/_objectToString.js"
/*!************************************************!*\
  !*** ./node_modules/lodash/_objectToString.js ***!
  \************************************************/
(module) {

/** Used for built-in method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var nativeObjectToString = objectProto.toString;

/**
 * Converts `value` to a string using `Object.prototype.toString`.
 *
 * @private
 * @param {*} value The value to convert.
 * @returns {string} Returns the converted string.
 */
function objectToString(value) {
  return nativeObjectToString.call(value);
}

module.exports = objectToString;


/***/ },

/***/ "./node_modules/lodash/_root.js"
/*!**************************************!*\
  !*** ./node_modules/lodash/_root.js ***!
  \**************************************/
(module, __unused_webpack_exports, __webpack_require__) {

var freeGlobal = __webpack_require__(/*! ./_freeGlobal */ "./node_modules/lodash/_freeGlobal.js");

/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = freeGlobal || freeSelf || Function('return this')();

module.exports = root;


/***/ },

/***/ "./node_modules/lodash/_trimmedEndIndex.js"
/*!*************************************************!*\
  !*** ./node_modules/lodash/_trimmedEndIndex.js ***!
  \*************************************************/
(module) {

/** Used to match a single whitespace character. */
var reWhitespace = /\s/;

/**
 * Used by `_.trim` and `_.trimEnd` to get the index of the last non-whitespace
 * character of `string`.
 *
 * @private
 * @param {string} string The string to inspect.
 * @returns {number} Returns the index of the last non-whitespace character.
 */
function trimmedEndIndex(string) {
  var index = string.length;

  while (index-- && reWhitespace.test(string.charAt(index))) {}
  return index;
}

module.exports = trimmedEndIndex;


/***/ },

/***/ "./node_modules/lodash/debounce.js"
/*!*****************************************!*\
  !*** ./node_modules/lodash/debounce.js ***!
  \*****************************************/
(module, __unused_webpack_exports, __webpack_require__) {

var isObject = __webpack_require__(/*! ./isObject */ "./node_modules/lodash/isObject.js"),
    now = __webpack_require__(/*! ./now */ "./node_modules/lodash/now.js"),
    toNumber = __webpack_require__(/*! ./toNumber */ "./node_modules/lodash/toNumber.js");

/** Error message constants. */
var FUNC_ERROR_TEXT = 'Expected a function';

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max,
    nativeMin = Math.min;

/**
 * Creates a debounced function that delays invoking `func` until after `wait`
 * milliseconds have elapsed since the last time the debounced function was
 * invoked. The debounced function comes with a `cancel` method to cancel
 * delayed `func` invocations and a `flush` method to immediately invoke them.
 * Provide `options` to indicate whether `func` should be invoked on the
 * leading and/or trailing edge of the `wait` timeout. The `func` is invoked
 * with the last arguments provided to the debounced function. Subsequent
 * calls to the debounced function return the result of the last `func`
 * invocation.
 *
 * **Note:** If `leading` and `trailing` options are `true`, `func` is
 * invoked on the trailing edge of the timeout only if the debounced function
 * is invoked more than once during the `wait` timeout.
 *
 * If `wait` is `0` and `leading` is `false`, `func` invocation is deferred
 * until to the next tick, similar to `setTimeout` with a timeout of `0`.
 *
 * See [David Corbacho's article](https://css-tricks.com/debouncing-throttling-explained-examples/)
 * for details over the differences between `_.debounce` and `_.throttle`.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Function
 * @param {Function} func The function to debounce.
 * @param {number} [wait=0] The number of milliseconds to delay.
 * @param {Object} [options={}] The options object.
 * @param {boolean} [options.leading=false]
 *  Specify invoking on the leading edge of the timeout.
 * @param {number} [options.maxWait]
 *  The maximum time `func` is allowed to be delayed before it's invoked.
 * @param {boolean} [options.trailing=true]
 *  Specify invoking on the trailing edge of the timeout.
 * @returns {Function} Returns the new debounced function.
 * @example
 *
 * // Avoid costly calculations while the window size is in flux.
 * jQuery(window).on('resize', _.debounce(calculateLayout, 150));
 *
 * // Invoke `sendMail` when clicked, debouncing subsequent calls.
 * jQuery(element).on('click', _.debounce(sendMail, 300, {
 *   'leading': true,
 *   'trailing': false
 * }));
 *
 * // Ensure `batchLog` is invoked once after 1 second of debounced calls.
 * var debounced = _.debounce(batchLog, 250, { 'maxWait': 1000 });
 * var source = new EventSource('/stream');
 * jQuery(source).on('message', debounced);
 *
 * // Cancel the trailing debounced invocation.
 * jQuery(window).on('popstate', debounced.cancel);
 */
function debounce(func, wait, options) {
  var lastArgs,
      lastThis,
      maxWait,
      result,
      timerId,
      lastCallTime,
      lastInvokeTime = 0,
      leading = false,
      maxing = false,
      trailing = true;

  if (typeof func != 'function') {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  wait = toNumber(wait) || 0;
  if (isObject(options)) {
    leading = !!options.leading;
    maxing = 'maxWait' in options;
    maxWait = maxing ? nativeMax(toNumber(options.maxWait) || 0, wait) : maxWait;
    trailing = 'trailing' in options ? !!options.trailing : trailing;
  }

  function invokeFunc(time) {
    var args = lastArgs,
        thisArg = lastThis;

    lastArgs = lastThis = undefined;
    lastInvokeTime = time;
    result = func.apply(thisArg, args);
    return result;
  }

  function leadingEdge(time) {
    // Reset any `maxWait` timer.
    lastInvokeTime = time;
    // Start the timer for the trailing edge.
    timerId = setTimeout(timerExpired, wait);
    // Invoke the leading edge.
    return leading ? invokeFunc(time) : result;
  }

  function remainingWait(time) {
    var timeSinceLastCall = time - lastCallTime,
        timeSinceLastInvoke = time - lastInvokeTime,
        timeWaiting = wait - timeSinceLastCall;

    return maxing
      ? nativeMin(timeWaiting, maxWait - timeSinceLastInvoke)
      : timeWaiting;
  }

  function shouldInvoke(time) {
    var timeSinceLastCall = time - lastCallTime,
        timeSinceLastInvoke = time - lastInvokeTime;

    // Either this is the first call, activity has stopped and we're at the
    // trailing edge, the system time has gone backwards and we're treating
    // it as the trailing edge, or we've hit the `maxWait` limit.
    return (lastCallTime === undefined || (timeSinceLastCall >= wait) ||
      (timeSinceLastCall < 0) || (maxing && timeSinceLastInvoke >= maxWait));
  }

  function timerExpired() {
    var time = now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    // Restart the timer.
    timerId = setTimeout(timerExpired, remainingWait(time));
  }

  function trailingEdge(time) {
    timerId = undefined;

    // Only invoke if we have `lastArgs` which means `func` has been
    // debounced at least once.
    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = lastThis = undefined;
    return result;
  }

  function cancel() {
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }
    lastInvokeTime = 0;
    lastArgs = lastCallTime = lastThis = timerId = undefined;
  }

  function flush() {
    return timerId === undefined ? result : trailingEdge(now());
  }

  function debounced() {
    var time = now(),
        isInvoking = shouldInvoke(time);

    lastArgs = arguments;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timerId === undefined) {
        return leadingEdge(lastCallTime);
      }
      if (maxing) {
        // Handle invocations in a tight loop.
        clearTimeout(timerId);
        timerId = setTimeout(timerExpired, wait);
        return invokeFunc(lastCallTime);
      }
    }
    if (timerId === undefined) {
      timerId = setTimeout(timerExpired, wait);
    }
    return result;
  }
  debounced.cancel = cancel;
  debounced.flush = flush;
  return debounced;
}

module.exports = debounce;


/***/ },

/***/ "./node_modules/lodash/isObject.js"
/*!*****************************************!*\
  !*** ./node_modules/lodash/isObject.js ***!
  \*****************************************/
(module) {

/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return value != null && (type == 'object' || type == 'function');
}

module.exports = isObject;


/***/ },

/***/ "./node_modules/lodash/isObjectLike.js"
/*!*********************************************!*\
  !*** ./node_modules/lodash/isObjectLike.js ***!
  \*********************************************/
(module) {

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return value != null && typeof value == 'object';
}

module.exports = isObjectLike;


/***/ },

/***/ "./node_modules/lodash/isSymbol.js"
/*!*****************************************!*\
  !*** ./node_modules/lodash/isSymbol.js ***!
  \*****************************************/
(module, __unused_webpack_exports, __webpack_require__) {

var baseGetTag = __webpack_require__(/*! ./_baseGetTag */ "./node_modules/lodash/_baseGetTag.js"),
    isObjectLike = __webpack_require__(/*! ./isObjectLike */ "./node_modules/lodash/isObjectLike.js");

/** `Object#toString` result references. */
var symbolTag = '[object Symbol]';

/**
 * Checks if `value` is classified as a `Symbol` primitive or object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
 * @example
 *
 * _.isSymbol(Symbol.iterator);
 * // => true
 *
 * _.isSymbol('abc');
 * // => false
 */
function isSymbol(value) {
  return typeof value == 'symbol' ||
    (isObjectLike(value) && baseGetTag(value) == symbolTag);
}

module.exports = isSymbol;


/***/ },

/***/ "./node_modules/lodash/now.js"
/*!************************************!*\
  !*** ./node_modules/lodash/now.js ***!
  \************************************/
(module, __unused_webpack_exports, __webpack_require__) {

var root = __webpack_require__(/*! ./_root */ "./node_modules/lodash/_root.js");

/**
 * Gets the timestamp of the number of milliseconds that have elapsed since
 * the Unix epoch (1 January 1970 00:00:00 UTC).
 *
 * @static
 * @memberOf _
 * @since 2.4.0
 * @category Date
 * @returns {number} Returns the timestamp.
 * @example
 *
 * _.defer(function(stamp) {
 *   console.log(_.now() - stamp);
 * }, _.now());
 * // => Logs the number of milliseconds it took for the deferred invocation.
 */
var now = function() {
  return root.Date.now();
};

module.exports = now;


/***/ },

/***/ "./node_modules/lodash/toNumber.js"
/*!*****************************************!*\
  !*** ./node_modules/lodash/toNumber.js ***!
  \*****************************************/
(module, __unused_webpack_exports, __webpack_require__) {

var baseTrim = __webpack_require__(/*! ./_baseTrim */ "./node_modules/lodash/_baseTrim.js"),
    isObject = __webpack_require__(/*! ./isObject */ "./node_modules/lodash/isObject.js"),
    isSymbol = __webpack_require__(/*! ./isSymbol */ "./node_modules/lodash/isSymbol.js");

/** Used as references for various `Number` constants. */
var NAN = 0 / 0;

/** Used to detect bad signed hexadecimal string values. */
var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;

/** Used to detect binary string values. */
var reIsBinary = /^0b[01]+$/i;

/** Used to detect octal string values. */
var reIsOctal = /^0o[0-7]+$/i;

/** Built-in method references without a dependency on `root`. */
var freeParseInt = parseInt;

/**
 * Converts `value` to a number.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to process.
 * @returns {number} Returns the number.
 * @example
 *
 * _.toNumber(3.2);
 * // => 3.2
 *
 * _.toNumber(Number.MIN_VALUE);
 * // => 5e-324
 *
 * _.toNumber(Infinity);
 * // => Infinity
 *
 * _.toNumber('3.2');
 * // => 3.2
 */
function toNumber(value) {
  if (typeof value == 'number') {
    return value;
  }
  if (isSymbol(value)) {
    return NAN;
  }
  if (isObject(value)) {
    var other = typeof value.valueOf == 'function' ? value.valueOf() : value;
    value = isObject(other) ? (other + '') : other;
  }
  if (typeof value != 'string') {
    return value === 0 ? value : +value;
  }
  value = baseTrim(value);
  var isBinary = reIsBinary.test(value);
  return (isBinary || reIsOctal.test(value))
    ? freeParseInt(value.slice(2), isBinary ? 2 : 8)
    : (reIsBadHex.test(value) ? NAN : +value);
}

module.exports = toNumber;


/***/ },

/***/ "./components/block-src/chart/editor.scss"
/*!************************************************!*\
  !*** ./components/block-src/chart/editor.scss ***!
  \************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
// extracted by mini-css-extract-plugin


/***/ },

/***/ "react"
/*!************************!*\
  !*** external "React" ***!
  \************************/
(module) {

"use strict";
module.exports = window["React"];

/***/ },

/***/ "@wordpress/api-fetch"
/*!**********************************!*\
  !*** external ["wp","apiFetch"] ***!
  \**********************************/
(module) {

"use strict";
module.exports = window["wp"]["apiFetch"];

/***/ },

/***/ "@wordpress/block-editor"
/*!*************************************!*\
  !*** external ["wp","blockEditor"] ***!
  \*************************************/
(module) {

"use strict";
module.exports = window["wp"]["blockEditor"];

/***/ },

/***/ "@wordpress/blocks"
/*!********************************!*\
  !*** external ["wp","blocks"] ***!
  \********************************/
(module) {

"use strict";
module.exports = window["wp"]["blocks"];

/***/ },

/***/ "@wordpress/components"
/*!************************************!*\
  !*** external ["wp","components"] ***!
  \************************************/
(module) {

"use strict";
module.exports = window["wp"]["components"];

/***/ },

/***/ "@wordpress/element"
/*!*********************************!*\
  !*** external ["wp","element"] ***!
  \*********************************/
(module) {

"use strict";
module.exports = window["wp"]["element"];

/***/ },

/***/ "@wordpress/i18n"
/*!******************************!*\
  !*** external ["wp","i18n"] ***!
  \******************************/
(module) {

"use strict";
module.exports = window["wp"]["i18n"];

/***/ },

/***/ "./components/block-src/chart/block.json"
/*!***********************************************!*\
  !*** ./components/block-src/chart/block.json ***!
  \***********************************************/
(module) {

"use strict";
module.exports = /*#__PURE__*/JSON.parse('{"$schema":"https://schemas.wp.org/trunk/block.json","apiVersion":3,"name":"m-chart/chart","title":"Chart","category":"layout","description":"Embed a chart made with M Chart into your posts and pages","textdomain":"m-chart","attributes":{"chartId":{"type":"integer","default":0},"show":{"type":"string","default":"chart"}},"supports":{"html":false},"editorScript":"m-chart-editor","editorStyle":"m-chart-editor-style","render":"file:./render.php"}');

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
// This entry needs to be wrapped in an IIFE because it needs to be in strict mode.
(() => {
"use strict";
/*!***************************************!*\
  !*** ./components/block-src/index.js ***!
  \***************************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _chart__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./chart */ "./components/block-src/chart/index.js");

})();

/******/ })()
;
//# sourceMappingURL=index.js.map