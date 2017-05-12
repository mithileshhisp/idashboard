import {ApplicationState} from "../application-state";
import * as _ from 'lodash';
export function currentVisualizationSelector(state: ApplicationState) {
  return state.storeData.dashboards.length > 0 && state.uiState.currentDashboard != undefined ? _.find(state.storeData.dashboards, ['id', state.uiState.currentDashboard]).dashboardItems : [];
}
