import {createSelector} from '@ngrx/store';
import {AppState} from '../app.reducers';
import {PageState, SinglePageState} from './page.state';

const page = (state: AppState) => state.page;
const scrollBar = (state: AppState) => state.singlePage;
export const getPage = createSelector(page, (pageObject: PageState) => pageObject);
export const getScrollBar = createSelector(scrollBar, (pageObject: SinglePageState) => pageObject);
