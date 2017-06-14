import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit
} from '@angular/core';

import 'rxjs/add/operator/debounceTime';

import { TTest, TTestRanges, TTestSet } from '../t-test';
import { TTestService } from '../t-test.service';

@Component({
  selector: 'app-t-test',
  templateUrl: './t-test.component.html',
  styleUrls: ['./t-test.component.css']
})
export class TTestComponent implements OnInit {
  @Input() modelSet: TTestSet;

  model: TTest;
  min: TTest;
  max: TTest;
  round: TTest;

  constructor(private ttestService: TTestService) { }

  ngOnInit(): void {
    this.model = this.modelSet.model;
    this.round = this.model.round();
    this.model.onChange.
      debounceTime(100).
      subscribe(changes => {
        this.modelChanged(changes);
      });
    this.round.onChange.subscribe(changes => {
      this.model.update(changes);
    });

    this.min = new TTest(this.model);
    this.max = new TTest(this.model);

    this.min.alpha = 0.01;
    this.max.alpha = 0.99;

    this.min.power = 0.01;
    this.max.power = 0.99;

    this.calculateSliderRange('n');
    this.calculateSliderRange('delta');
    this.calculateSliderRange('sigma');
  }

  toggleAlternates(): void {
    this.model.showAlternates = !this.model.showAlternates;
  }

  private calculateSliderRange(name: string): void {
    let value = this.model[name];
    let range = [value * 0.5, value * 1.5].sort((a, b) => a - b);
    this.min[name] = range[0];
    this.max[name] = range[1];
  }

  private modelChanged(changes: any): void {
    let keys = Object.keys(changes);
    if (keys.length > 1 || (keys[0] != "showAlternates" && keys[0] != this.model.output)) {
      this.updateModelSet();
    }
  }

  private updateModelSet(): void {
    this.ttestService.update(this.modelSet.model).
      then(result => {
        this.modelSet.update(result.model, result.data);
        this.round.roundUpdate(result.model, false);

        // adjust min/max
        if (this.model.sigma < this.min.sigma) {
          this.min.sigma = Math.floor(this.model.sigma);
        } else if (this.model.sigma > this.max.sigma) {
          this.max.sigma = Math.ceil(this.model.sigma);
        }

        if (this.model.delta < this.min.delta) {
          this.min.delta = Math.floor(this.model.delta);
        } else if (this.model.delta > this.max.delta) {
          this.max.delta = Math.ceil(this.model.delta);
        }

        if (this.model.n < this.min.n) {
          this.min.n = Math.floor(this.model.n);
        } else if (this.model.n > this.max.n) {
          this.max.n = Math.ceil(this.model.n);
        }
      }, error => { });
  }
}
