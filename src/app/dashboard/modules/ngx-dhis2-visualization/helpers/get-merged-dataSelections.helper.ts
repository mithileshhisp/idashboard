import * as _ from 'lodash';
import { VisualizationDataSelection } from '../models';

export function getMergedDataSelections(
  existingDataSelections: VisualizationDataSelection[],
  newDataSelections: VisualizationDataSelection[]
): any[] {
  return _.map(
    existingDataSelections,
    (dataSelection: VisualizationDataSelection) => {
      const matchingDataSelection: VisualizationDataSelection = _.find(
        newDataSelections,
        ['dimension', dataSelection.dimension]
      );
      if (matchingDataSelection) {
        dataSelection = {
          ...dataSelection,
          items: matchingDataSelection.items
        };
      }
      return dataSelection;
    }
  );
}
