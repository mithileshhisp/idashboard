import {Component, OnInit} from '@angular/core';
import { Title} from '@angular/platform-browser';
import {AppState} from './store/app.reducers';
import {Store} from '@ngrx/store';
import * as currentUser from './store/current-user/current-user.actions';
import {getPortalConfiguration, getStatsSummary} from './store/portal/portal.selectors';
import {Observable} from 'rxjs/Observable';
import {PortalConfigurationState, StatsSummaryState} from './store/portal/portal.state';
import {ActivatedRoute, Params, Router} from '@angular/router';
import * as portalActions from './store/portal/portal.actions';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {


  portalConfiguration$: Observable<PortalConfigurationState>;
  statsSummary$: Observable<StatsSummaryState>;
  portalConfigurations: any;
  theSetPage: string;
  portalPages: any;
  allNews: any;
  footerData: any;
  constructor(private titleService: Title, private router: Router, private store: Store<AppState>, private route: ActivatedRoute) {
    store.dispatch(new currentUser.LoadAction());
    store.dispatch(new portalActions.LoadPortalConfigurationAction());
    store.dispatch(new portalActions.LoadStatsSummaryAction());
    this.statsSummary$ = store.select(getStatsSummary);
    this.portalConfiguration$ = store.select(getPortalConfiguration);
  }

  ngOnInit() {
    this.setTitle('Tanzania national health portal');
    if (this.portalConfiguration$) {
      this.route.params.forEach((params: Params) => {
        this.theSetPage = params['id'];
        this.portalConfiguration$.subscribe((portalConfigurations) => {
          if (portalConfigurations) {
            this.portalConfigurations = portalConfigurations;
            this.portalPages = portalConfigurations['pages'];
            this.footerData = portalConfigurations['footer'];
          }
        });
      });
    }

    if (this.statsSummary$) {
      this.statsSummary$.subscribe((statisticsSummary) => {
        if (statisticsSummary) {
          this.allNews = statisticsSummary['news'];
        }
      });
    }
  }

  public setTitle( newTitle: string) {
    this.titleService.setTitle( newTitle );
  }
}
