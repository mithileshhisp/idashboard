parameters.progress(0);
//getting all passed variables on function
const expressionMapping = parameters.rule.json.expressionMapping;
const namesMapping = parameters.rule.json.namesMapping;
const expression = parameters.rule.json.expression;
const customRuleDefinition = parameters.rule.json.customRuleDefinition;
const isCalculationBasedOnRefAndActual =
  parameters.rule.json.isCalculationBasedOnRefAndActual;
const peSelection = parameters.peSelection.items;
const {
  useReferencePeriod,
  shouldSumResultValue,
  filters
} = parameters;

//deduce filter values
const isOuInFilters = filters.find(
  ({
    dimension
  }) => dimension === 'ou'
) ? true : false;

const isPeInFilters = filters.find(
  ({
    dimension
  }) => dimension === 'pe'
) ? true : false;
const shouldSkipSumOnActualPeriod = peSelection.filter(item => item.ref_type === 'PERIOD_ACTUAL').filter(item => item.skipSummationOnMultiplePeriod).length > 0;
const shouldSkipSumOnreferencePeriod = peSelection.filter(item => item.ref_type === 'PERIOD_REF').filter(item => item.skipSummationOnMultiplePeriod).length > 0;
// get all uids form expression
const dataElements = getUidsFromExpression(expression);
//checking for all de uids has mapper
const mappingStatus = getDataElementMappingStatus(
  dataElements,
  expressionMapping
);
if (mappingStatus.areAllMapped) {
  parameters.progress(20);
  //get analytics results
  const dx = dataElements.join(';');
  //handling referenc and actual periods
  if (useReferencePeriod && peSelection.length > 1) {
    const actualPeriod = peSelection.filter(item => item.ref_type === 'PERIOD_ACTUAL').map(({
      id
    }) => id).join(';');
    const referencePeriod = peSelection.filter(item => item.ref_type === 'PERIOD_REF').map(({
      id
    }) => id).join(';');
    // handling indicators with calculation with reference and actual periods
    if (actualPeriod && referencePeriod) {
      if (isCalculationBasedOnRefAndActual) {
        loadingAndEvaluateCustomExpressionCalculations(
          actualPeriod,
          referencePeriod
        );
      } else {
        // handlining inidcator with actual and reference periods
        loadingAndEvaluateActualAndReferenceIndicator(
          dx,
          actualPeriod,
          referencePeriod
        );
      }
    } else {
      loadingAndEvaluateAnalyticsData(dx, expression, dataElements);
    }
  } else {
    //handling for only actual period
    loadingAndEvaluateAnalyticsData(dx, expression, dataElements);
  }
} else {
  // return error message with unmapped de
  const errorMessage = getMissingDataElementsMappingErrorMessage(
    mappingStatus.dataElementWithoutMapping,
    namesMapping
  );
  parameters.error(errorMessage);
}

function loadingAndEvaluateCustomExpressionCalculations(
  actualPeriod,
  referencePeriod
) {
  const json = parameters.rule.json;
  const {
    customExpression,
    expressionMapping,
    refExpressionKey,
    actualExpressionKey
  } = json;
  const expressionKeyObject = {};
  const expressionKeys = getUidsFromExpression(customExpression).filter(
    onlyUniqueItemsOnArray
  );
  expressionKeys.map(expressionKey => {
    let expression = json[expressionKey];
    if (expression) {
      const uids = getUidsFromExpression(expression);
      uids.map(uid => {
        const newId = expressionMapping[uid];
        if (newId) {
          expression = expression.replace(new RegExp(uid, 'g'), newId);
        }
      });
      expressionKeyObject[expressionKey] = expression;
    }
  });
  const analytics = [];
  let resultAnalytics = {};
  Object.keys(expressionKeyObject).map(expressionKey => {
    getAnalyticDataBasedCustomExpressionCalculations(
        expressionKeyObject[expressionKey],
        expressionKey,
        actualExpressionKey,
        refExpressionKey,
        actualPeriod,
        referencePeriod
      )
      .then(data => {
        analytics.push(data);
        if (analytics.length === Object.keys(expressionKeyObject).length) {
          for (var i = 0; i < analytics.length; i++) {
            resultAnalytics = getMergedAnalyticsForActualAndReferencePeriods(
              analytics[i],
              resultAnalytics
            );
          }
          const id = (customRuleDefinition && customRuleDefinition.id) ? customRuleDefinition.id : parameters.rule.id;
          const name = (customRuleDefinition && customRuleDefinition.name) ? customRuleDefinition.name : parameters.rule.name;
          const customePe = (customRuleDefinition && customRuleDefinition.periodKey) ? customRuleDefinition.periodKey : 'ref_actual_pe';
          const periods = resultAnalytics.metaData.dimensions.pe;
          let rows = JSON.stringify(resultAnalytics.rows);
          periods.map(pe => {
            rows = rows.replace(new RegExp(pe, 'g'), customePe);
          });
          resultAnalytics.metaData.dimensions.pe = [customePe];
          resultAnalytics.metaData.items[customePe] = {
            name: (customRuleDefinition && customRuleDefinition.periodName) ? customRuleDefinition.periodName : ""
          };
          resultAnalytics.rows = JSON.parse(rows);
          resultAnalytics = getSanitizedAnalytict(resultAnalytics, {
            rule: {
              id,
              name,
              json: {
                expression: customExpression
              }
            }
          });
          parameters.success(getAnalyticValueWithThousandCommaSeparator(resultAnalytics))
        }
      })
      .catch(error => {
        parameters.error(error);
      });
  });
}

function getAnalyticDataBasedCustomExpressionCalculations(
  expression,
  expressionKey,
  actualExpressionKey,
  refExpressionKey,
  actualPeriod,
  referencePeriod
) {
  const dataElements = getUidsFromExpression(expression);
  const dx = dataElements.join(';');
  let pe = parameters.pe;
  if (refExpressionKey.indexOf(expressionKey) > -1 && referencePeriod) {
    pe = referencePeriod;
  }
  if (actualExpressionKey.indexOf(expressionKey) > -1 && actualPeriod) {
    pe = actualPeriod;
  }
  const ou = parameters.ou;
  const url = `../../../api/analytics.json?dimension=dx:${dx}&dimension=pe:${pe}&dimension=ou:${ou}`;
  return new Promise((resolve, reject) => {
    if (dataElements.length == 0) {
      resolve(getEmptyAnalytics());
    } else {
      $.ajax({
        url,
        type: 'GET',
        success: function (analytic) {
          //evaluate expression and and get new analytic object
          analytic = getSanitizedAnalytict(analytic, {
            rule: {
              id: expressionKey,
              name: '',
              json: {
                expression
              }
            }
          })
          resolve(analytic);
        },
        error: function (error) {
          reject(error);
        }
      });
    }
  });
}

function loadingAndEvaluateActualAndReferenceIndicator(
  dx,
  actualPeriod,
  referencePeriod
) {
  $.ajax({
    url: `../../../api/analytics.json?dimension=dx:${dx}&dimension=pe:${actualPeriod}&dimension=ou:${
      parameters.ou
    }`,
    type: 'GET',
    success: function (analyticsResultsForActual) {
      $.ajax({
        url: `../../../api/analytics.json?dimension=dx:${dx}&dimension=pe:${referencePeriod}&dimension=ou:${
          parameters.ou
        }`,
        type: 'GET',
        success: function (analyticsResultsForReference) {
          //evaluate expression and and get new analytic object
          analyticsResultsForActual = getSanitizedAnalytict(
            analyticsResultsForActual,
            parameters
          );
          analyticsResultsForReference = getSanitizedAnalytict(
            analyticsResultsForReference,
            parameters
          );
          const resultAnalytics = getMergedAnalyticsForActualAndReferencePeriods(
            analyticsResultsForReference,
            analyticsResultsForActual
          )
          parameters.success(getAnalyticValueWithThousandCommaSeparator(resultAnalytics))
        },
        error: function (error) {
          parameters.error(error);
        }
      });
    },
    error: function (error) {
      parameters.error(error);
    }
  });
}

function getMergedAnalyticsForActualAndReferencePeriods(
  analyticsResultsForReference,
  analyticsResultsForActual
) {
  analyticsResultsForReference = getSanitizedAnalytictForMultiplePeriods(
    analyticsResultsForReference, shouldSkipSumOnreferencePeriod
  );
  if (analyticsResultsForActual && analyticsResultsForActual.metaData) {
    analyticsResultsForActual = getSanitizedAnalytictForMultiplePeriods(
      analyticsResultsForActual, shouldSkipSumOnActualPeriod
    );
    shouldStartWithActual = peSelection.findIndex(({
      ref_type
    }) => ref_type === 'PERIOD_REF') > 0;
    const actualPes = analyticsResultsForActual.metaData.dimensions.pe;
    const refPes = analyticsResultsForReference.metaData.dimensions.pe;
    const mergedPe = [];
    if (shouldStartWithActual) {
      actualPes.map(pe => {
        mergedPe.push(pe)
      })
      refPes.map(pe => {
        mergedPe.push(pe)
      })
    } else {
      refPes.map(pe => {
        mergedPe.push(pe)
      })
      actualPes.map(pe => {
        mergedPe.push(pe)
      })
    }
    analyticsResultsForReference.metaData.dimensions.ou = analyticsResultsForReference.metaData.dimensions.ou
      .concat(analyticsResultsForActual.metaData.dimensions.ou)
      .filter(onlyUniqueItemsOnArray);
    analyticsResultsForReference.metaData.dimensions.pe = mergedPe.filter(onlyUniqueItemsOnArray);
    analyticsResultsForReference.metaData.dimensions.dx = analyticsResultsForReference.metaData.dimensions.dx
      .concat(analyticsResultsForActual.metaData.dimensions.dx)
      .filter(onlyUniqueItemsOnArray);
    const items = analyticsResultsForActual.metaData.items;
    Object.keys(items).map(key => {
      analyticsResultsForReference.metaData.items[key] = items[key];
    });
    analyticsResultsForReference.rows = analyticsResultsForReference.rows.concat(
      analyticsResultsForActual.rows
    );
  }
  return analyticsResultsForReference;
}

function getSanitizedAnalytictForMultiplePeriods(analytics, skipSummationOnMultiplePeriod) {
  const periods = analytics.metaData.dimensions.pe;
  if (periods.length > 1 && !skipSummationOnMultiplePeriod) {
    const names = {};
    const items = analytics.metaData.items;
    Object.keys(items).map(key => {
      if (items[key] && items[key].name) {
        names[key] = items[key].name;
      }
    });
    const customPeName = `${names[periods[0]]} - ${
      names[periods[periods.length - 1]]
    }`;
    const customPe = `${periods[0]}_${periods[periods.length - 1]}`;
    analytics.metaData.dimensions.pe = [customPe];
    analytics.metaData.items[customPe] = {
      name: customPeName
    };
    const sanitizedRows = getSanitizedRowsByPeAndDx(analytics.rows, customPe);
    analytics.rows = sanitizedRows;
  }
  return analytics;
}

function getSanitizedRowsByPeAndDx(rows, customPe) {
  const sanitizedRows = [];
  const sumOffPeAndDxObjet = {};
  rows.map(row => {
    if (row.length === 4) {
      const id = `${row[0]}_${row[2]}`;
      if (!sumOffPeAndDxObjet[id]) {
        sumOffPeAndDxObjet[id] = 0;
      }
      const value = parseFloat(row[3].replace(new RegExp(",", 'g'), ""));
      const sum = sumOffPeAndDxObjet[id] + value;
      sumOffPeAndDxObjet[id] = sum;
    }
  });
  Object.keys(sumOffPeAndDxObjet).map(idObject => {
    const ids = idObject.split('_');
    const value = parseFloat(sumOffPeAndDxObjet[idObject]).toFixed(1);
    sanitizedRows.push([ids[0], customPe, ids[1], value]);
  });
  return sanitizedRows;
}

function onlyUniqueItemsOnArray(value, index, self) {
  return self.indexOf(value) === index;
}

function loadingAndEvaluateAnalyticsData(dx, expression, dataElements) {
  $.ajax({
    url: '../../../api/analytics.json?dimension=dx:' +
      dx +
      '&dimension=pe:' +
      parameters.pe +
      '&dimension=ou:' +
      parameters.ou,
    type: 'GET',
    success: function (analyticsResults) {
      //evaluate expression and and get new analytic object
      var analytic = getSanitizedAnalytict(analyticsResults, parameters);
      if (shouldSumResultValue) {
        analytic = getSanitizedAnalytictForMultiplePeriods(analytic)
      }
      parameters.success(getAnalyticValueWithThousandCommaSeparator(analytic));
    },
    error: function (error) {
      parameters.error(error);
    }
  });
}

function getDataElementMappingStatus(dataElements, expressionMapping) {
  var areAllMapped = true;
  var dataElementWithoutMapping = [];
  dataElements.forEach(function (dataElement) {
    var hasBeenMapped = false;
    Object.keys(expressionMapping).forEach(function (key) {
      if (expressionMapping[key] === dataElement) {
        hasBeenMapped = true;
      }
    });
    if (!hasBeenMapped) {
      dataElementWithoutMapping = dataElementWithoutMapping.concat(dataElement);
      areAllMapped = false;
    }
  });
  return {
    areAllMapped,
    dataElementWithoutMapping
  };
}

function getUidsFromExpression(expression) {
  var uids = [];
  var matchRegrex = /(\{.*?\})/gi;
  expression.match(matchRegrex).forEach(function (value) {
    uids = uids.concat(
      value
      .replace('{', ':separator:')
      .replace('}', ':separator:')
      .split(':separator:')
      .filter(content => content.length > 0)
    );
  });
  return uids;
}

function getMissingDataElementsMappingErrorMessage(
  dataElementsIds,
  namesMapping
) {
  var errorMessage = {
    httpStatus: 'Conflict',
    httpStatusCode: 409,
    status: 'ERROR',
    message: ''
  };
  var missingDataElementNames = [];
  dataElementsIds.forEach(function (id) {
    if (namesMapping[id]) {
      missingDataElementNames.push(namesMapping[id]);
    } else {
      missingDataElementNames.push(id);
    }
  });
  errorMessage.message +=
    missingDataElementNames.join(',') + ' have not been mapped';
  return errorMessage;
}

function getSanitizedAnalytict(analyticsResults, parameters) {
  var analytics = getEmptyAnalytics();
  var ous = [];
  var periods = [];
  if (
    analyticsResults &&
    analyticsResults.metaData &&
    analyticsResults.metaData.dimensions
  ) {
    periods = periods.concat(analyticsResults.metaData.dimensions.pe);
    ous = ous.concat(analyticsResults.metaData.dimensions.ou);
    periods.forEach(function (pe) {
      analytics.metaData.items[pe] = analyticsResults.metaData.items[pe];
    });
    ous.forEach(function (ou) {
      analytics.metaData.items[ou] = analyticsResults.metaData.items[ou];
    });
  } else if (
    analyticsResults &&
    analyticsResults.metaData &&
    analyticsResults.metaData.pe
  ) {
    periods = periods.concat(analyticsResults.metaData.pe);
    ous = ous.concat(analyticsResults.metaData.ou);
    if (analyticsResults.metaData.names) {
      periods.forEach(function (pe) {
        analytics.metaData.items[pe] = {
          name: analyticsResults.metaData.names[pe]
        };
      });
      ous.forEach(function (ou) {
        analytics.metaData.items[ou] = {
          name: analyticsResults.metaData.names[ou]
        };
      });
    }
  }
  var rule = parameters.rule;
  analytics.metaData.items[rule.id] = {
    name: rule.name
  };
  analytics.metaData.dimensions.dx = analytics.metaData.dimensions.dx
    .concat(rule.id)
    .filter(onlyUniqueItemsOnArray);
  analytics.metaData.dimensions.pe = analytics.metaData.dimensions.pe
    .concat(periods)
    .filter(onlyUniqueItemsOnArray);
  analytics.metaData.dimensions.ou = analytics.metaData.dimensions.ou
    .concat(ous)
    .filter(onlyUniqueItemsOnArray);
  if (ous.length > 0 && periods.length > 0) {
    // get key value pair
    ous.map(function (ou) {
      periods.map(function (pe) {
        var keyValuePair = getDataElementValuePair(
          ou,
          pe,
          analyticsResults.rows
        );
        //get evaulated values of rule
        var evaluatedValue = getEvaluatedValueOfRule(
          rule.json.expression,
          keyValuePair
        );
        //adding values on row
        analytics.rows.push([rule.id, pe, ou, evaluatedValue]);
      });
    });
  }
  analytics = getAnalyticValueWithThousandCommaSeparator(analytics)
  analytics.height = analytics.rows.length;
  return analytics;
}

function getDataElementValuePair(ou, pe, rows) {
  var keyValuePair = {};
  rows.forEach(function (row) {
    var key = row[0];
    if (!keyValuePair[key]) {
      keyValuePair[key] = 0;
    }
    if (row.length === 4) {
      var rowPe = row[1];
      var rowOu = row[2];
      var value = row[3].replace(new RegExp(",", 'g'), "")
      if (rowPe === pe && rowOu === ou) {
        var oldValue = parseInt(keyValuePair[key], 10);
        var newValue = oldValue + parseInt(value, 10);
        keyValuePair[key] = newValue.toFixed(1);
      }
    }
  });
  return keyValuePair;
}

function getEvaluatedValueOfRule(expression, keyValuePair) {
  var evaluatedValue = 0;
  var formulaPattern = /#\{.+?\}/g;
  var matcher = expression.match(formulaPattern);
  matcher.forEach(function (match) {
    var operand = match.replace(/[#\{\}]/g, '');
    if (keyValuePair[operand]) {
      expression = expression.replace(
        match,
        parseInt(keyValuePair[operand], 10)
      );
    }
    try {
      if (!isNaN(eval(expression))) {
        evaluatedValue = eval(expression);
      }
    } catch (e) {}
  });
  return evaluatedValue.toFixed(1);
}

function getAnalyticValueWithThousandCommaSeparator(analytic) {
  if (analytic && analytic.rows) {
    const customPe = "customPe"
    const customOu = "customOu"
    if (isOuInFilters) {
      const rows = getRowsByOuAsFilter(analytic.rows, customOu)
      analytic.metaData.items[customOu] = {
        name: ""
      }
      analytic.metaData.dimensions.ou = [customOu]
      analytic.rows = rows;
    }
    if (isPeInFilters) {
      const rows = getRowsByPeAsFilter(analytic.rows, customPe);
      analytic.metaData.items[customPe] = {
        name: ""
      };
      analytic.metaData.dimensions.pe = [customPe];
      analytic.rows = rows;
    }
    for (var row of analytic.rows) {
      var value = row[row.length - 1].replace(new RegExp(",", 'g'), "");
      value = parseFloat(value).toLocaleString();
      row[row.length - 1] = value;
    }
  }
  return analytic;
}

function getRowsByOuAsFilter(rows, customOu) {
  const sanitizedRows = [];
  const sumObjet = {};
  rows.map(row => {
    if (row.length === 4) {
      const id = `${row[0]}__${row[1]}`;
      if (!sumObjet[id]) {
        sumObjet[id] = 0;
      }
      sumObjet[id] += parseFloat(row[3].replace(new RegExp(",", 'g'), ""));
    }
  });
  Object.keys(sumObjet).map(idObject => {
    const ids = idObject.split('__');
    const value = parseFloat(sumObjet[idObject]).toFixed(1);
    sanitizedRows.push([ids[0], ids[1], customOu, value]);
  });
  return sanitizedRows;
}

function getRowsByPeAsFilter(rows, customPe) {
  const sanitizedRows = [];
  const sumObjet = {};
  rows.map(row => {
    if (row.length === 4) {
      const id = `${row[0]}_${row[2]}`;
      if (!sumObjet[id]) {
        sumObjet[id] = 0;
      }
      sumObjet[id] += parseFloat(row[3].replace(new RegExp(",", 'g'), ""));
    }
  });
  Object.keys(sumObjet).map(idObject => {
    const ids = idObject.split('_');
    const value = parseFloat(sumObjet[idObject]).toFixed(1);
    sanitizedRows.push([ids[0], customPe, ids[1], value]);
  });
  return sanitizedRows;
}

function getEmptyAnalytics() {
  return {
    headers: [{
        name: 'dx',
        column: 'Data',
        valueType: 'TEXT',
        type: 'java.lang.String',
        hidden: false,
        meta: true
      },
      {
        name: 'pe',
        column: 'Period',
        valueType: 'TEXT',
        type: 'java.lang.String',
        hidden: false,
        meta: true
      },
      {
        name: 'ou',
        column: 'Organisation unit',
        valueType: 'TEXT',
        type: 'java.lang.String',
        hidden: false,
        meta: true
      },
      {
        name: 'value',
        column: 'Value',
        valueType: 'NUMBER',
        type: 'java.lang.Double',
        hidden: false,
        meta: false
      }
    ],
    metaData: {
      items: {
        dx: {
          name: 'Data'
        },
        pe: {
          name: 'Period'
        },
        ou: {
          name: 'Organisation unit'
        }
      },
      dimensions: {
        dx: [],
        pe: [],
        ou: [],
        co: []
      }
    },
    rows: [],
    width: 4,
    height: 0
  };
}
