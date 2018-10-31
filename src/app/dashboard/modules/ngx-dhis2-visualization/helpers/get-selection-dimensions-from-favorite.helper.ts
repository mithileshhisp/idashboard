import * as _ from 'lodash';

const defaultDimensionNames = {
  dx: 'Data',
  pe: 'Period',
  ou: 'Organisation unit'
};

export function getSelectionDimensionsFromFavorite(favoriteLayer) {
  const favoriteDataElements = _.map(
    favoriteLayer.dataElementDimensions,
    dataElementDimension => dataElementDimension.dataElement
  );
  return _.filter(
    [
      ...getStandardizedDimensions(favoriteLayer.rows, favoriteDataElements, 'rows'),
      ...getStandardizedDimensions(favoriteLayer.columns, favoriteDataElements, 'columns'),
      ...getStandardizedDimensions(favoriteLayer.filters, favoriteDataElements, 'filters')
    ],
    dataSelection => dataSelection.dimension !== 'dy'
  );
}

function getStandardizedDimensions(dimensions: any[], dataElements: any[], dimensionLayout: string) {
  return _.map(dimensions, dimensionObject => {
    const dimensionObjectInfo = _.find(dataElements, ['id', dimensionObject.dimension]);
    return {
      dimension: dimensionObject.dimension,
      name: getDimensionName(dimensionObject.dimension, dimensionObjectInfo),
      layout: dimensionLayout,
      filter: dimensionObject.filter,
      legendSet: dimensionObject.legendSet ? dimensionObject.legendSet.id : '',
      optionSet: dimensionObjectInfo ? dimensionObjectInfo.optionSet : null,
      items: _.map(dimensionObject.items, item => {
        return {
          id: item.dimensionItem || item.id,
          name: item.displayName || item.name,
          type: getDimensionItemType(dimensionObject.dimension, item)
        };
      })
    };
  });
}

function getDimensionName(dimension: string, dimensionObject: any) {
  return dimensionObject ? dimensionObject.name : defaultDimensionNames[dimension];
}

function getDimensionItemType(dimension: string, dimensionItem: any) {
  switch (dimension) {
    case 'ou': {
      return (
        dimensionItem.dimensionItemType ||
        ((dimensionItem.dimensionItem || dimensionItem.id).indexOf('LEVEL') !== -1
          ? 'ORGANISATION_UNIT_LEVEL'
          : (dimensionItem.dimensionItem || dimensionItem.id).indexOf('GROUP') !== -1
            ? 'ORGANISATION_UNIT_GROUP'
            : (dimensionItem.dimensionItem || dimensionItem.id).indexOf('USER') !== -1
              ? 'USER_ORGANISATION_UNIT'
              : '')
      );
    }
    default:
      return dimensionItem.dimensionItemType;
  }
}
