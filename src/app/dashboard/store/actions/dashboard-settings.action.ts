import { Action } from '@ngrx/store';
import { DashboardSettings } from '../../models/dashboard-settings.model';
import { User } from '../../../models';

export enum DashboardSettingsActionTypes {
  LoadDashboardSettings = '[DashboardSettings] Load dashboard settings',
  AddDashboardSettings = '[DashboardSettings] Add dashboard settings',
  LoadDashboardSettingsFail = '[DashboardSettings] Load dashboard settings fails'
}

export class LoadDashboardSettingsAction implements Action {
  readonly type = DashboardSettingsActionTypes.LoadDashboardSettings;
  constructor(public currentUser: User) {}
}
export class AddDashboardSettingsAction implements Action {
  readonly type = DashboardSettingsActionTypes.AddDashboardSettings;
  constructor(
    public dashboardSettings: DashboardSettings,
    public currentUser: User
  ) {}
}
export class LoadDashboardSettingsFailAction implements Action {
  readonly type = DashboardSettingsActionTypes.LoadDashboardSettingsFail;
  constructor(public error: any, public currentUser: User) {}
}

export type DashboardSettingsActions =
  | LoadDashboardSettingsAction
  | LoadDashboardSettingsFailAction
  | AddDashboardSettingsAction;