//Example of function implementation
parameters.progress(0);
//get expression and expresiion map form rule
var expressionMapping = parameters.rule.json.expressionMapping;
var namesMapping = parameters.rule.json.namesMapping
var expression = parameters.rule.json.expression;
//get perameter for actual and reference periods
var peSelection = parameters.peSelection.items;
var useReferencePeriod = parameters.useReferencePeriod

// get all uids form expression
var dataElements = getUidsFromExpression(expression);
//checking for all de uids has mapper
var mappingStatus = getDataElementMappingStatus(dataElements, expressionMapping);
//@todo remove skip logic in case result of mapping is false
if (mappingStatus.areAllMapped) {
  //get analytics results
  var dx = dataElements.join(";");
  //handling referenc and actual periods
  if (useReferencePeriod && peSelection.length > 1) {
    var actualPeriod = peSelection[0].id;
    var referencePeriod = peSelection[peSelection.length - 1].id;
    // handlining inidcator with actual and reference periods
    loadingAndEvaluateActualAndReferenceIndicator(dx, actualPeriod, referencePeriod);

    // handling indicators with calculation with reference and actual periods
  } else {
    //handling for only actual period
    loadingAndEvaluateAnalyticsData(dx, expression, dataElements);
  }
} else {
  // return error message with unmapped de
  var errorMessage = getMissingDataElementsMappingErrorMessage(mappingStatus.dataElementWithoutMapping, namesMapping)
  parameters.error(errorMessage);
}

function loadingAndEvaluateActualAndReferenceIndicator(dx, actualPeriod, referencePeriod) {
  $.ajax({
    url: `../../../api/analytics.json?dimension=dx:${dx}&dimension=pe:${actualPeriod}&dimension=ou:${parameters.ou}`,
    type: "GET",
    success: function (analyticsResultsForActual) {

      $.ajax({
        url: `../../../api/analytics.json?dimension=dx:${dx}&dimension=pe:${referencePeriod}&dimension=ou:${parameters.ou}`,
        type: "GET",
        success: function (analyticsResultsForReference) {
          //evaluate expression and and get new analytic object
          analyticsResultsForActual = getSanitizedAnalytict(analyticsResultsForActual, parameters);
          analyticsResultsForReference = getSanitizedAnalytict(analyticsResultsForReference, parameters);
          parameters.success(getMergedAnalyticsForActualAndReferencePeriods(analyticsResultsForActual, analyticsResultsForReference));
        },
        error: function (error) {
          parameters.error(error);
        }
      })
    },
    error: function (error) {
      parameters.error(error);
    }
  })
}

function getMergedAnalyticsForActualAndReferencePeriods(analyticsResultsForActual, analyticsResultsForReference) {
  analyticsResultsForReference = getSanitizedAnalytictForMultiplePeriods(analyticsResultsForReference)
  analyticsResultsForActual = getSanitizedAnalytictForMultiplePeriods(analyticsResultsForActual)
  analyticsResultsForReference.metaData.dimensions.ou = analyticsResultsForReference.metaData.dimensions.ou.concat(analyticsResultsForActual.metaData.dimensions.ou).filter(onlyUniqueItemsOnArray)
  analyticsResultsForReference.metaData.dimensions.pe = analyticsResultsForReference.metaData.dimensions.pe.concat(analyticsResultsForActual.metaData.dimensions.pe).filter(onlyUniqueItemsOnArray)
  analyticsResultsForReference.metaData.dimensions.dx = analyticsResultsForReference.metaData.dimensions.dx.concat(analyticsResultsForActual.metaData.dimensions.dx).filter(onlyUniqueItemsOnArray)
  const items = analyticsResultsForActual.metaData.items;
  Object.keys(items).map(key => {
    analyticsResultsForReference.metaData.items[key] = items[key];
  })
  analyticsResultsForReference.rows = analyticsResultsForReference.rows.concat(analyticsResultsForActual.rows);
  console.log({
    analyticsResultsForReference
  })
  return analyticsResultsForReference;
}

function getSanitizedAnalytictForMultiplePeriods(analytics) {
  const periods = analytics.metaData.dimensions.pe;
  if (periods.length > 1) {
    const names = {};
    const items = analytics.metaData.items;
    Object.keys(items).map(key => {
      if (items[key] && items[key].name) {
        names[key] = items[key].name;
      }
    })
    const customPeName = `${names[periods[0]]} - ${
        names[periods[periods.length - 1]]
      }`;
    const customPe = `${periods[0]}_${periods[periods.length - 1]}`;
    analytics.metaData.dimensions.pe = [customPe];
    analytics.metaData.items[customPe] = {
      name: customPeName
    }
    const sanitizedRows = getSanitizedRowsByPeAndDx(
      analytics.rows,
      customPe
    );
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
      sumOffPeAndDxObjet[id] += parseFloat(row[3]);
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
    url: "../../../api/analytics.json?dimension=dx:" + dx + "&dimension=pe:" + parameters.pe + "&dimension=ou:" + parameters.ou,
    type: "GET",
    success: function (analyticsResults) {
      //evaluate expression and and get new analytic object
      parameters.success(getSanitizedAnalytict(analyticsResults, parameters));
    },
    error: function (error) {
      parameters.error(error);
    }
  })
}

function getDataElementMappingStatus(dataElements, expressionMapping) {
  var areAllMapped = true;
  var dataElementWithoutMapping = []
  dataElements.forEach(function (dataElement) {
    var hasBeenMapped = false;
    Object.keys(expressionMapping).forEach(function (key) {
      if (expressionMapping[key] === dataElement) {
        hasBeenMapped = true;
      }
    })
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
    uids = uids.concat(value.replace("{", ':separator:').replace("}", ':separator:').split(':separator:').filter(content => content.length > 0));
  });
  return uids;
}

function getMissingDataElementsMappingErrorMessage(dataElementsIds, namesMapping) {
  var errorMessage = {
    "httpStatus": "Conflict",
    "httpStatusCode": 409,
    "status": "ERROR",
    "message": ""
  };
  var missingDataElementNames = [];
  dataElementsIds.forEach(function (id) {
    if (namesMapping[id]) {
      missingDataElementNames.push(namesMapping[id])
    } else {
      missingDataElementNames.push(id)
    }
  })
  errorMessage.message += missingDataElementNames.join(",") + " have not been mapped";
  return errorMessage;
}

function getSanitizedAnalytict(analyticsResults, parameters) {
  var analytics = getEmptyAnalytics();
  var ous = [];
  var periods = [];
  if (analyticsResults && analyticsResults.metaData && analyticsResults.metaData.dimensions) {
    periods = periods.concat(analyticsResults.metaData.dimensions.pe);
    ous = ous.concat(analyticsResults.metaData.dimensions.ou);
    periods.forEach(function (pe) {
      analytics.metaData.items[pe] = analyticsResults.metaData.items[pe];
    });
    ous.forEach(function (ou) {
      analytics.metaData.items[ou] = analyticsResults.metaData.items[ou];
    });

  } else if (analyticsResults && analyticsResults.metaData && analyticsResults.metaData.pe) {
    periods = periods.concat(analyticsResults.metaData.pe);
    ous = ous.concat(analyticsResults.metaData.ou);
    if (analyticsResults.metaData.names) {
      periods.forEach(function (pe) {
        analytics.metaData.items[pe] = {
          "name": analyticsResults.metaData.names[pe]
        };
      });
      ous.forEach(function (ou) {
        analytics.metaData.items[ou] = {
          "name": analyticsResults.metaData.names[ou]
        };
      });
    }
  }
  var rule = parameters.rule;
  analytics.metaData.items[rule.id] = {
    "name": rule.name
  };
  analytics.metaData.dimensions.dx = analytics.metaData.dimensions.dx.concat(rule.id)
  analytics.metaData.dimensions.pe = analytics.metaData.dimensions.pe.concat(periods)
  analytics.metaData.dimensions.ou = analytics.metaData.dimensions.ou.concat(ous);

  if (ous.length > 0 && periods.length > 0) {
    // get key value pair
    ous.forEach(function (ou) {
      periods.forEach(function (pe) {
        var keyValuePair = getDataElementValuePair(ou, pe, analyticsResults.rows);
        //get evaulated values of rule
        var evaluatedValue = getEvaluatedValueOfRule(rule.json.expression, keyValuePair);
        //adding values on row
        analytics.rows.push([rule.id, pe, ou, evaluatedValue]);
      })
    })
  }
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
      var value = row[3];
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
      expression = expression.replace(match, parseInt(keyValuePair[operand], 10));
    }
    try {
      if (!isNaN(eval(expression))) {
        evaluatedValue = eval(expression);
      }
    } catch (e) {

    }
  });
  return evaluatedValue.toFixed(1);
}

function getEmptyAnalytics() {
  return {
    "headers": [{
      "name": "dx",
      "column": "Data",
      "valueType": "TEXT",
      "type": "java.lang.String",
      "hidden": false,
      "meta": true
    }, {
      "name": "pe",
      "column": "Period",
      "valueType": "TEXT",
      "type": "java.lang.String",
      "hidden": false,
      "meta": true
    }, {
      "name": "ou",
      "column": "Organisation unit",
      "valueType": "TEXT",
      "type": "java.lang.String",
      "hidden": false,
      "meta": true
    }, {
      "name": "value",
      "column": "Value",
      "valueType": "NUMBER",
      "type": "java.lang.Double",
      "hidden": false,
      "meta": false
    }],
    "metaData": {
      "items": {
        "dx": {
          "name": "Data"
        },
        "pe": {
          "name": "Period"
        },
        "ou": {
          "name": "Organisation unit"
        }
      },
      "dimensions": {
        "dx": [],
        "pe": [],
        "ou": [],
        "co": []
      }
    },
    "rows": [],
    "width": 4,
    "height": 0
  };
}