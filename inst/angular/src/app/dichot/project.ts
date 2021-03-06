import { Observable, zip, of as observableOf } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
import * as d3 from 'd3';
import * as stableSort from 'stable';

import { Output } from '../output';
import { Range } from '../range';
import { Point } from '../point';
import { DetAltMode } from '../det-alt-mode';
import { AbstractProject, FixedPSpace } from '../abstract-project';
import { LinePlotHandler } from '../line-plot-handler';
import { CIPlotHandler } from '../ci-plot-handler';

import { Dichot, DichotMatched, DichotCase, DichotExpressed, DichotMethod, DichotAttribs } from './dichot';
import { DichotService, PlotDataRanges, PlotDataResponse } from './dichot.service';
import { DichotLinePlotHandler } from './dichot-line-plot-handler';
import { DichotCIPlotHandler } from './dichot-ci-plot-handler';

export class Project extends AbstractProject {
  models: Dichot[] = [];
  selectedIndex: number = 0;
  changeHistory: any[] = [];

  customRanges = false;
  sampleSizeRange?: Range;
  powerRange?: Range;
  detAltRange?: Range;
  pSpaceRange?: Range;

  previousRanges: {
    sampleSizeRange?: Range;
    powerRange?: Range;
    detAltRange?: Range;
    pSpaceRange?: Range;
  };

  constructor(private dichotService: DichotService) {
    super();
    this.fixedPSpace = FixedPSpace.Fixed;
  }

  getLinePlotHandler(): LinePlotHandler {
    return new DichotLinePlotHandler(this);
  }

  getCIPlotHandler(): CIPlotHandler {
    return new DichotCIPlotHandler(this);
  }

  getSelectedIndex(): number {
    return this.selectedIndex;
  }

  getChangeHistory(): any[] {
    return this.changeHistory;
  }

  getModelOutput(): string {
    return this.models[this.selectedIndex].output;
  }

  getModelInterpretation(): string {
    return this.models[this.selectedIndex].interpretation();
  }

  getModelCount(): number {
    return this.models.length;
  }

  // per-project plot options
  getTopYRange(): Range {
    let output = this.getOutput();
    switch (output) {
      case Output.SampleSize:
        return this.sampleSizeRange;
      case Output.Power:
        return this.powerRange;
      case Output.DetectableAlternative:
        return this.detAltRange;
    }
  }
  setTopYRange(range: Range): void {
    let output = this.getOutput();
    switch (output) {
      case Output.SampleSize:
        this.sampleSizeRange = range;
        break;
      case Output.Power:
        this.powerRange = range;
        break;
      case Output.DetectableAlternative:
        this.detAltRange = range;
        break;
    }
  }
  getTopLeftXRange(): Range {
    let output = this.getOutput();
    switch (output) {
      case Output.SampleSize:
        return this.powerRange;
      case Output.Power:
        return this.sampleSizeRange;
      case Output.DetectableAlternative:
        return this.sampleSizeRange;
    }
  }
  setTopLeftXRange(range: Range): void {
    let output = this.getOutput();
    switch (output) {
      case Output.SampleSize:
        this.powerRange = range;
        break;
      case Output.Power:
        this.sampleSizeRange = range;
        break;
      case Output.DetectableAlternative:
        this.sampleSizeRange = range;
        break;
    }
  }
  getTopRightXRange(): Range {
    let output = this.getOutput();
    switch (output) {
      case Output.SampleSize:
        return this.detAltRange;
      case Output.Power:
        return this.detAltRange;
      case Output.DetectableAlternative:
        return this.powerRange;
    }
  }
  setTopRightXRange(range: Range): void { 
    let output = this.getOutput();
    switch (output) {
      case Output.SampleSize:
        this.detAltRange = range;
        break;
      case Output.Power:
        this.detAltRange = range;
        break;
      case Output.DetectableAlternative:
        this.powerRange = range;
        break;
    }
  }
  getBottomXRange(): Range {
    return this.pSpaceRange;
  }
  setBottomXRange(range: Range): void {
    this.pSpaceRange = range;
  }

  isCITargetDraggable(): boolean {
    return this.getModelOutput() === 'delta';
  }
  isCIBoundsDraggable(): boolean {
    return this.getModelOutput() === 'n';
  }

  getOutput(): Output {
    if (this.models.length > 0) {
      return this.models[0].output;
    }
    return undefined;
  }

  getOutputString(): string {
    if (this.models.length > 0) {
      return this.models[0].output.toString();
    }
    return '';
  }

  getDetAltParam(): string {
    if (this.models.length > 0) {
      return this.models[0].getDetAltParam();
    }
    return '';
  }

  getMatched(): string {
    if (this.models.length > 0) {
      return this.models[0].matched.toString();
    }
    return '';
  }

  describeMatched(): string {
    if (this.models.length > 0) {
      switch (this.models[0].matched) {
        case DichotMatched.Matched:
          return "Matched";
        case DichotMatched.Independent:
          return "Independent";
      }
    }
    return '';
  }

  describeCase(): string {
    if (this.models.length > 0) {
      switch (this.models[0].case) {
        case DichotCase.CaseControl:
          return "Case control";
        case DichotCase.Prospective:
          return "Prospective";
      }
    }
    return '';
  }

  describeExpressed(): string {
    if (this.models.length > 0) {
      switch (this.models[0].expressed) {
        case DichotExpressed.FailureRates:
          return "Failure rates";
        case DichotExpressed.RelativeRisk:
          return "Relative risk";
        case DichotExpressed.TwoProportions:
          return "Two proportions";
        case DichotExpressed.OddsRatio:
          return "Odds ratio";
      }
    }
    return '';
  }

  describeMethod(): string {
    if (this.models.length > 0) {
      switch (this.models[0].method) {
        case DichotMethod.ChiSquare:
          return "Uncorrected chi-square test";
        case DichotMethod.Fishers:
          return "Fisher's exact test";
      }
    }
    return '';
  }

  getModel(index: number): Dichot {
    return this.models[index];
  }

  addModel(model: Dichot): Observable<any> {
    return this.dichotService.calculate(model).
      pipe(mergeMap((result: DichotAttribs) => {
        let model = new Dichot(result);
        model.name = this.getModelName(this.models.length);
        this.models.push(model);
        if (!this.customRanges) {
          this.calculateRanges();
        }

        this.changeHistory.push({
          'type': 'add', 'index': this.models.length - 1,
          'params': model.attribs()
        });

        return this.updatePlotData();
      }));
  }

  updateModel(index: number, key: string, value: any): Observable<any> {
    let model = this.models[index];

    let which = key;
    let changes = { [key]: value };

    let models = [model];
    if (key === "output") {
      // If the output is changed, all models need to be updated. Additionally,
      // reset the flag to keep ranges.
      models = this.models;
      this.customRanges = false;
    }

    if (key === "ci") {
      changes.ciMode = true;
    } else if (model.ciMode) {
      changes.ciMode = false;
    }

    models.forEach(m => { Object.assign(m, changes); });
    let obs = models.map((model, i) => {
      return this.dichotService.calculate(model).pipe(
        map((result: DichotAttribs) => {
          Object.assign(model, result);
        })
      );
    });
    return zip(...obs).pipe(
      mergeMap(() => {
        if (!this.customRanges) {
          this.calculateRanges();
        }
        this.changeHistory.push({
          'type': 'change', 'index': index,
          'key': key, 'params': model.attribs()
        });
        return this.updatePlotData();
      })
    );
  }

  removeModel(index: number): Observable<any> {
    this.models.splice(index, 1);
    this.changeHistory.push({
      'type': 'remove', 'index': index
    });
    if (!this.customRanges) {
      this.calculateRanges();
    }
    return this.updatePlotData();
  }

  updatePlotData(): Observable<any> {
    this.updatingPlotData.emit();
    let ranges = {
      sampleSizeRange: this.sampleSizeRange,
      powerRange: this.powerRange,
      detAltRange: this.detAltRange,
      pSpaceRange: this.pSpaceRange
    } as PlotDataRanges;

    return this.dichotService.plotData(this.models, ranges, this.pointsPerPlot).
      pipe(map((result: PlotDataResponse) => {
        if (typeof(this.pointsPerPlot) === 'undefined') {
          this.pointsPerPlot = result.points;
        }

        result.data.forEach((data, i) => {
          Object.assign(this.models[i], data);
        });

        if (this.customRanges) return;

        let output = this.getOutput();
        let sampleSizeRange, powerRange, detAltRange;
        for (let i = 0, ilen = this.models.length; i < ilen; i++) {
          let model = this.models[i];
          switch (output) {
            case Output.SampleSize:
              powerRange = this.makeXRange(model.sampleSizeVsPower, this.sampleSizeRange);
              powerRange.description = "Power";
              if (i == 0) {
                this.powerRange = powerRange;
              } else {
                this.powerRange.combine(powerRange);
              }

              detAltRange = this.makeXRange(model.sampleSizeVsDetAlt, this.sampleSizeRange);
              detAltRange.description = "Detectable Alternative";
              if (i == 0) {
                this.detAltRange = detAltRange;
              } else {
                this.detAltRange.combine(detAltRange);
              }
              break;
            case Output.Power:
              sampleSizeRange = this.makeXRange(model.powerVsSampleSize, this.powerRange);
              sampleSizeRange.description = "Sample Size";
              if (i == 0) {
                this.sampleSizeRange = sampleSizeRange;
              } else {
                this.sampleSizeRange.combine(sampleSizeRange);
              }

              detAltRange = this.makeXRange(model.powerVsDetAlt, this.sampleSizeRange);
              detAltRange.description = "Detectable Alternative";
              if (i == 0) {
                this.detAltRange = detAltRange;
              } else {
                this.detAltRange.combine(detAltRange);
              }
              break;

            case Output.DetectableAlternative:
              powerRange = this.makeXRange(model.detAltVsPower, this.detAltRange);
              powerRange.description = "Power";
              if (i == 0) {
                this.powerRange = powerRange;
              } else {
                this.powerRange.combine(powerRange);
              }

              sampleSizeRange = this.makeXRange(model.detAltVsSampleSize, this.detAltRange);
              sampleSizeRange.description = "Sample Size";
              if (i == 0) {
                this.sampleSizeRange = sampleSizeRange;
              } else {
                this.sampleSizeRange.combine(sampleSizeRange);
              }
              break;
          }
        }

        this.previousRanges = {
          sampleSizeRange: this.sampleSizeRange ? this.sampleSizeRange.clone() : undefined,
          powerRange: this.powerRange ? this.powerRange.clone() : undefined,
          detAltRange: this.detAltRange ? this.detAltRange.clone() : undefined,
          pSpaceRange: this.pSpaceRange ? this.pSpaceRange.clone() : undefined
        };
      }));
  }

  private getModelName(index: number): string {
    switch (index) {
      case 0:
        return "Primary";
      case 1:
        return "Secondary";
      case 2:
        return "Tertiary";
      case 3:
        return "Quaternary";
      case 4:
        return "Quinary";
      case 5:
        return "Senary";
      case 6:
        return "Septenary";
      case 7:
        return "Octonary";
      case 8:
        return "Nonary";
      case 9:
        return "Denary";
    }
    return `Line ${index + 1}`;
  }

  calculateRanges(): void {
    let sampleSizeRange = [];
    let powerRange = [];
    let detAltRange = [];
    let pSpaceRange = [];

    let output = this.getOutput();
    let values;
    for (let i = 0, ilen = this.models.length; i < ilen; i++) {
      let model = this.models[i];

      switch (output) {
        case Output.SampleSize:
          // calculate n range
          values = stableSort([model.n * 0.5, model.n * 1.5], d3.ascending);
          if (i == 0 || values[0] < sampleSizeRange[0]) {
            sampleSizeRange[0] = values[0];
          }
          if (i == 0 || values[1] > sampleSizeRange[1]) {
            sampleSizeRange[1] = values[1];
          }
          break;

        case Output.Power:
          if (i == 0) {
            powerRange = [0.01, 1.0];
          }
          break;

        case Output.DetectableAlternative:
          let param = model.getDetAltParam();
          let value = model[param];

          if (model.case === DichotCase.CaseControl) {
            if (model.detAltMode === DetAltMode.Lower) {
              values = [0.1, 0.9];
            } else {
              values = [1.1, model.psi + (model.psi - 1.0)];
            }
          } else {
            if (model.expressed === DichotExpressed.RelativeRisk) {
              if (model.detAltMode === DetAltMode.Lower) {
                values = [0.1, 0.9];
              } else {
                values = [1.1, model.r + (model.r - 1.0)];
              }
            } else if (model.expressed === DichotExpressed.OddsRatio) {
              if (model.detAltMode === DetAltMode.Lower) {
                values = [0.1, 0.9];
              } else {
                values = [1.1, model.psi + (model.psi - 1.0)];
              }
            } else {
              let diff;
              if (model.detAltMode === DetAltMode.Lower) {
                diff = Math.pow(10, Math.floor(Math.log10(model.p0 - model.p1Alt)));
                values = [model.p1Alt - diff, model.p0 - diff];
              } else {
                diff = Math.pow(10, Math.floor(Math.log10(model.p1 - model.p0)));
                values = [model.p0 + diff, model.p1 + diff];
              }
            }
          }

          if (i == 0 || values[0] < detAltRange[0]) {
            detAltRange[0] = values[0];
          }
          if (i == 0 || values[1] > detAltRange[1]) {
            detAltRange[1] = values[1];
          }
          break;
      }

      // Calculate pSpaceRange based on confidence interval
      let ci = model.getCI();

      if (this.fixedPSpace === FixedPSpace.Fixed &&
          (model.matched === DichotMatched.Matched ||
           model.expressed === DichotExpressed.RelativeRisk ||
           model.expressed === DichotExpressed.OddsRatio)) {
        values = [0.0, 7.0];

        let upper = ci[1] + 1;
        if (upper > values[1]) {
          values[1] = upper;
        }
      } else {
        let target = model.getCITarget();
        let diff = Math.abs(ci[1] - target) * 3;
        values = [ci[0] - diff, ci[1] + diff];
      }

      if (i == 0 || values[0] < pSpaceRange[0]) {
        pSpaceRange[0] = values[0];
      }
      if (i == 0 || values[1] > pSpaceRange[1]) {
        pSpaceRange[1] = values[1];
      }
    }

    if (sampleSizeRange.length > 0) {
      this.sampleSizeRange = new Range(sampleSizeRange[0], sampleSizeRange[1]);
      this.sampleSizeRange.description = "Sample Size";
    } else {
      this.sampleSizeRange = undefined;
    }

    if (powerRange.length > 0) {
      this.powerRange = new Range(powerRange[0], powerRange[1]);
      this.powerRange.description = "Power";
    } else {
      this.powerRange = undefined;
    }

    if (detAltRange.length > 0) {
      this.detAltRange = new Range(detAltRange[0], detAltRange[1]);
      this.detAltRange.description = "Detectable Alternative";
    } else {
      this.detAltRange = undefined;
    }

    if (pSpaceRange.length > 0) {
      this.pSpaceRange = new Range(pSpaceRange[0], pSpaceRange[1]);
      this.pSpaceRange.description = "Parameter Space";
    } else {
      this.pSpaceRange = undefined;
    }
  }

  private makeXRange(data: Point[], yRange: Range): Range {
    let minIndex = 0, maxIndex = data.length - 1;
    let sorted = stableSort(data, (a, b) => a.x - b.x);
    for (let i = 0; i < sorted.length; i++) {
      if (typeof(sorted[i].x) === "number" && sorted[i].y >= yRange.min) {
        minIndex = i;
        break;
      }
    }
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (typeof(sorted[i].x) === "number" && sorted[i].y <= yRange.max) {
        maxIndex = i;
        break;
      }
    }

    let values = stableSort([sorted[minIndex].x, sorted[maxIndex].x], d3.ascending);
    return new Range(values[0], values[1]);
  }

  private paramsToString(params: any): string {
    let result = [];
    for (var key in params) {
      if (key == 'ciMode' || key == 'deltaMode') {
        continue;
      }

      let value = params[key];
      if (typeof(value) === 'string') {
        result.push(`"${key}": "${params[key]}"`);
      } else {
        result.push(`"${key}": ${params[key]}`);
      }
    }
    return `{ ${result.join(', ')} }`;
  }

  describeChanges(changes: any, html = true): string {
    let result;
    if (changes.type == 'add') {
      result = `Added model #${changes.index + 1}: <span class="code">${this.paramsToString(changes.params)}</span>`;

    } else if (changes.type == 'remove') {
      result = `Removed model #${changes.index + 1}`;

    } else if (changes.type == 'change') {
      if (html) {
        result = `Changed <span class="code">${changes.key}</span> in model #${changes.index + 1}: <span class="code">${this.paramsToString(changes.params)}</span>`;
      } else {
        result = `Changed ${changes.key} in model #${changes.index + 1}: ${this.paramsToString(changes.params)}`;
      }
    }
    return result;
  }

  resetRanges(): void {
    if (this.previousRanges) {
      Object.assign(this, this.previousRanges);
    }
  }
}
