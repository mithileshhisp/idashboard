import {Injectable} from '@angular/core';
import * as _ from 'lodash';

@Injectable()
export class RelativePeriodService {

  constructor() {

  }


  getISOFormatFromRelativePeriod(favourite): Array<string> {
    let isoFormat = [];
    let periodDimension = undefined;
    let newPeriodDimension = {dimension: 'pe', items: []};
    let periodIndex = null;
    let parentdimension = null;

    if (this._periodDimensionExist(favourite.rows)) {
      periodIndex = _.findIndex(favourite.rows, ['dimension', 'pe']);
      periodDimension = favourite.rows[periodIndex];
      parentdimension = 'rows';
    }

    if (this._periodDimensionExist(favourite.filters)) {
      periodIndex = _.findIndex(favourite.filters, ['dimension', 'pe']);
      periodDimension = favourite.filters[periodIndex];
      parentdimension = 'filters';
    }

    if (this._periodDimensionExist(favourite.columns)) {
      periodIndex = _.findIndex(favourite.columns, ['dimension', 'pe']);
      periodDimension = favourite.columns[periodIndex];
      parentdimension = 'columns';
    }

    if (periodDimension && favourite[parentdimension]) {
      newPeriodDimension.items = this._generateCorrespondingFixedPeriodArray(periodDimension.items);
      favourite[parentdimension].splice(periodIndex, 1);
      favourite[parentdimension].push(newPeriodDimension);
    }

    return favourite;
  }

  private _periodDimensionExist(dimensionArray) {
    let periodExist = false;
    const periodIndex = _.findIndex(dimensionArray, ['dimension', 'pe']);
    if (periodIndex >= 0) {
      periodExist = true;
    }
    return periodExist;
  }

  private _generateCorrespondingFixedPeriodArray(relativePeriodArray) {
    let fixedPeriods = [];
    if (relativePeriodArray) {
      relativePeriodArray.forEach((relativePeriod) => {
        const newPeriods = this._getFixedPeriodArrayFromSingleRelativePeriod(relativePeriod);
        fixedPeriods = [...fixedPeriods, ...newPeriods];
      })
    }
    return fixedPeriods;
  }


  /**
   This function return array of fixed periods from one relative period
   */
  private _getFixedPeriodArrayFromSingleRelativePeriod(relativePeriod): Array<Object> {
    const periodCategory = ['_MONTH', '_BIMONTH', '_QUARTER', '_SIXMONTHS', '_SIX_MONTH', '_YEAR', '_FINANCIAL_YEAR'];
    const periodTenses = ['THIS', 'LAST'];
    let fixedPeriods = [];
    const template = {
      id: '',
      dimensionItem: '',
      displayName: '',
      dimensionItemType: 'PERIOD'
    }
    const periodFunctions = this._getExecutingPeriodFunctions();
    if (relativePeriod) {
      var functionName = null;
      periodCategory.forEach((category) => {
        if (relativePeriod.id.indexOf(category) > -1) {
          functionName = category;
        }
      })

      /**
       Execute dynamic functions that return fixed periods
       */
      fixedPeriods = periodFunctions[functionName](
        template,
        this._getPeriodCounts(periodTenses, relativePeriod),
        this._getPeriodTense(periodTenses, relativePeriod));
    }
    return fixedPeriods;
  }


  /**
   Function that return other functions that return fixed periods specific to period type
   */


  private _getExecutingPeriodFunctions() {
    const currentDate = new Date();
    return {
      '_MONTH': (template, counts, tense) => {
        const currentMonth = currentDate.getMonth();
        const lastNMonths = this._getLastPeriods(currentMonth, counts, 12, tense);
        let currentYear = currentDate.getFullYear();
        const months = [];
        let endOfTheYear = false;

        lastNMonths.forEach((month) => {
          const theTemplate = template;
          month === 12 ? endOfTheYear = true : endOfTheYear = false;
          if (month < 10) {
            months.push({
              id: currentYear + '0' + month,
              dimensionItem: currentYear + '0' + month,
              displayName: currentYear + '0' + month,
              dimensionItemType: 'PERIOD'
            });
          } else {
            if (endOfTheYear) {
              currentYear = currentYear - 1;
              endOfTheYear = false
            }
            months.push({
              id: currentYear + '' + month,
              dimensionItem: currentYear + '' + month,
              displayName: currentYear + '' + month,
              dimensionItemType: 'PERIOD'
            });
          }
        })
        return months;
      },
      '_QUARTER': (template, counts, tense) => {
        const currentQuarter = this._getThisQuarter();
        const lastNQuarters = this._getLastPeriods(currentQuarter, counts, 4, tense);
        let currentYear = currentDate.getFullYear();
        const quarters = [];
        let endOfTheYear = false;
        lastNQuarters.forEach((nthQuarter) => {

          nthQuarter === 4 ? endOfTheYear = true : endOfTheYear = false;
          if (endOfTheYear) {
            currentYear = currentYear - 1;
            endOfTheYear = false
          }
          quarters.push({
            id: currentYear + 'Q' + nthQuarter,
            dimensionItem: currentYear + 'Q' + nthQuarter,
            displayName: currentYear + 'Q' + nthQuarter,
            dimensionItemType: 'PERIOD'
          });


        })
        return quarters;
      },
      '_YEAR': (template, counts, tense) => {
        const currentYear = currentDate.getFullYear();
        const lastNYears = this._getLastPeriods(currentYear, counts, 1, tense);
        const years = [];
        lastNYears.forEach((nthYear) => {
          years.push({
            id: nthYear + '',
            dimensionItem: nthYear + '',
            displayName: nthYear + '',
            dimensionItemType: 'PERIOD'
          });

        })
        return years;
      },
      '_BIMONTH': (template, counts, tense) => {
        const currentBimonth = this._getThisBimonth();
        const lastNBimonths = this._getLastPeriods(currentBimonth, counts, 6, tense);
        let currentYear = currentDate.getFullYear();
        const bimonths = [];
        let endOfTheYear = false;
        lastNBimonths.forEach((nthBimonth) => {
          nthBimonth === 6 ? endOfTheYear = true : endOfTheYear = false;
          if (endOfTheYear) {
            currentYear = currentYear - 1;
            endOfTheYear = false;
          }
          bimonths.push({
            id: currentYear + '0' + nthBimonth + 'B',
            dimensionItem: currentYear + '0' + nthBimonth + 'B',
            displayName: currentYear + '0' + nthBimonth + 'B',
            dimensionItemType: 'PERIOD'
          });

        })
        return bimonths;
      },
      '_SIXMONTHS': (template, counts, tense) => {
        const currentSixmonth = this._getThisSixmonth();
        const lastSixmonths = this._getLastPeriods(currentSixmonth, counts, 2, tense);
        let currentYear = currentDate.getFullYear();
        const sixmonths = [];
        let endOfTheYear = false;
        lastSixmonths.forEach((nthSixmonth) => {
          nthSixmonth === 2 ? endOfTheYear = true : endOfTheYear = false;
          if (endOfTheYear) {
            currentYear = currentYear - 1;
            endOfTheYear = false;
          }
          sixmonths.push({
            id: currentYear + 'S' + nthSixmonth,
            dimensionItem: currentYear + 'S' + nthSixmonth,
            displayName: currentYear + 'S' + nthSixmonth,
            dimensionItemType: 'PERIOD'
          });
        });
        return sixmonths;
      },
      '_SIX_MONTH': (template, counts, tense) => {
        const currentSixmonth = this._getThisSixmonth();
        const lastSixmonths = this._getLastPeriods(currentSixmonth, counts, 2, tense);
        let currentYear = currentDate.getFullYear();
        const sixmonths = [];
        let endOfTheYear = false;
        lastSixmonths.forEach((nthSixmonth) => {
          nthSixmonth === 2 ? endOfTheYear = true : endOfTheYear = false;
          if (endOfTheYear) {
            currentYear = currentYear - 1;
            endOfTheYear = false;
          }
          sixmonths.push({
            id: currentYear + 'S' + nthSixmonth,
            dimensionItem: currentYear + 'S' + nthSixmonth,
            displayName: currentYear + 'S' + nthSixmonth,
            dimensionItemType: 'PERIOD'
          });
        });
        return sixmonths;
      },
      '_FINANCIAL_YEAR': (template, counts, tense) => {
      }
    }
  }


  /**
   This function return particular tense of the period
   */
  private _getPeriodTense(periodTenses, relativePeriod) {
    let selectedTense = null;
    periodTenses.forEach(function (tense) {
      if (relativePeriod.id.indexOf(tense) > -1) {
        selectedTense = tense;
      }
    })
    return selectedTense;
  }


  /**
   This function return particular tense of the period
   */
  private _getPeriodCounts(periodTenses, relativePeriod) {
    let selectedCount = 0;
    periodTenses.forEach(function (tense) {
      if (relativePeriod.id.indexOf(tense) > -1) {
        const tenseArray = relativePeriod.id.split('_');
        if (tenseArray.length > 2) {
          selectedCount = isNaN(tenseArray[1]) ? 1 : tenseArray[1];
        } else {
          selectedCount = 1;
        }
        return;
      }
    })
    return selectedCount;
  }

  private _getLastPeriods(current, counts, typeLimit, tense) {
    const lastPeriods = [];
    if (tense === 'LAST') {
      for (let counter = 1; counter <= counts; counter++) {
        current = current - 1;
        if (current === 0) {
          current = typeLimit;
          lastPeriods.push(current);
        } else {
          lastPeriods.push(current);
        }

      }
    } else {
      lastPeriods.push(current);
    }

    return lastPeriods;
  }

  private  _getThisQuarter(d?) {
    d = d || new Date(); // If no date supplied, use today
    const q = [1, 2, 3, 4];
    return q[Math.floor(d.getMonth() / 3)];
  }

  private  _getThisBimonth(d?) {
    d = d || new Date();
    const q = [1, 2, 3, 4, 5, 6];
    return q[Math.floor(d.getMonth() / 2)];
  }

  private  _getThisSixmonth(d?) {
    d = d || new Date();
    const q = [1, 2];
    return q[Math.floor(d.getMonth() / 6)];
  }

  private  _getThisFinancialYear(d?) {
    d = d || new Date();
    const q = [1, 2];
    return q[Math.floor(d.getMonth() / 6)];
  }

}