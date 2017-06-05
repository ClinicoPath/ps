import { Component, Input, OnInit, OnChanges, SimpleChanges, AfterViewChecked, ViewChild, ElementRef } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';
import * as d3 from 'd3';

import { PlotOptions } from '../plot-options';
import { Range } from '../range';
import { TTestSet } from '../t-test';

interface PlotData {
  data: {
    values: any[];
    limits?: number[];
    target?: number;
  }
  range: Range;
  change?: string;
  title: string;
}

interface Point {
  x: number;
  y: number;
}

@Component({
  selector: 'app-plot',
  templateUrl: './plot.component.html',
  styleUrls: ['./plot.component.css']
})
export class PlotComponent implements OnInit, OnChanges, AfterViewChecked {
  @Input() name: string;
  @Input() plotOptions: PlotOptions;
  @Input() modelSet: TTestSet;
  @Input() changeName: string;
  x: PlotData;
  y: PlotData;

  @ViewChild('plot') plotElement: ElementRef;
  @ViewChild('bottomAxis') bottomAxisElement: ElementRef;
  @ViewChild('leftAxis') leftAxisElement: ElementRef;
  @ViewChild('target') targetElement: ElementRef;

  width: number;
  height: number;
  margin = 50;
  clipPathId: string;
  xScale: any;
  yScale: any;
  paths: string[];
  dropPaths: string[];
  mainPoints: Point[];
  targetPoint: Point;
  hoverX: number;
  hoverY: number;
  hoverPoint: Point;
  xTargetRange: number[];
  yTargetRange: number[];
  xBisector: any;

  targetDragging = false;
  showTargetInfo = false;
  showHoverInfo = false;
  needDraw = false;

  private subscription: Subscription;

  ngOnInit(): void {
    this.clipPathId = `${this.name}-plot-area`;
    this.compute();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.modelSet) {
      if (this.subscription) {
        this.subscription.unsubscribe();
      }
      if (this.modelSet) {
        this.subscription = this.modelSet.onCompute.subscribe(() => {
          this.compute();
        });
        this.compute();
      }
    }
  }

  ngAfterViewChecked(): void {
    this.draw();
  }

  onResize(): void {
    this.compute();
  }

  toggleTargetInfo(value: boolean): void {
    if (!this.targetDragging) {
      this.showTargetInfo = value;
    }
  }

  toggleHoverInfo(value: boolean): void {
    this.showHoverInfo = value;
  }

  hover(event: any): void {
    var dim = event.target.getBoundingClientRect();
    var x = event.clientX - dim.left;
    var y = event.clientY - dim.top;

    if (x > this.xTargetRange[0] && x < this.xTargetRange[1] &&
        y > this.yTargetRange[0] && y < this.yTargetRange[1]) {
      // hide hover info if too close to the target point
      this.showHoverInfo = false;
      return;
    }

    let index = this.xBisector(this.mainPoints, this.xScale.invert(x));
    this.hoverPoint = this.mainPoints[index];
    if (this.hoverPoint) {
      this.hoverX = this.xScale(this.hoverPoint.x);
      this.hoverY = this.yScale(this.hoverPoint.y);
      this.showHoverInfo = true;
    } else {
      this.showHoverInfo = false;
    }
  }

  hoverInfoY(): string {
    if (this.hoverY < this.yTargetRange[0]) {
      return "-3.5em";
    }
    return "1em";
  }

  private dragTargetStart(): void {
    this.targetDragging = true;
  }

  private dragTarget(event: any): void {
    let x = this.xScale.invert(d3.event.x - this.margin);
    let y = this.yScale.invert(d3.event.y - this.margin);
    let index = this.xBisector(this.mainPoints, x);
    let point = this.mainPoints[index];
    if (!point) return;

    this.targetPoint.x = point.x;
    this.targetPoint.y = point.y;
    this.computeDropPaths();
  }

  private dragTargetEnd(): void {
    this.targetDragging = false;
    this.showTargetInfo = false;

    if (this.modelSet && this.x.change) {
      let output = this.modelSet.model.output;
      this.modelSet.model.update({
        [output]: this.targetPoint.y,
        [this.x.change]: this.targetPoint.x
      });
    }
  }

  private compute(): void {
    if (!this.modelSet) {
      return;
    }

    // setup
    let model = this.modelSet.model;
    let ranges = this.modelSet.ranges;
    let data = this.modelSet.data;
    switch (this.modelSet.model.output) {
      case "n":
        if (this.name == "top-left") {
          this.x = {
            data: data.power, range: ranges.power, change: "power",
            title: "Power"
          };
        } else if (this.name == "top-right") {
          this.x = {
            data: data.delta, range: ranges.delta, change: "delta",
            title: "Detectable Alternative"
          };
        }
        this.y = { data: data.n, range: ranges.n, title: "Sample Size" };
        break;
      case "power":
        if (this.name == "top-left") {
          this.x = {
            data: data.n, range: ranges.n, change: "n",
            title: "Sample Size"
          };
          this.y = { data: data.power, range: ranges.power, title: "Power" };
        } else if (this.name == "top-right") {
          this.x = {
            data: data.delta, range: ranges.delta, change: "delta",
            title: "Detectable Alternative"
          };
          this.y = { data: data.powerByDelta, range: ranges.power, title: "Power" };
        }
        break;
      case "delta":
        if (this.name == "top-left") {
          this.x = {
            data: data.n, range: ranges.n, change: "n",
            title: "Sample Size"
          };
        } else if (this.name == "top-right") {
          this.x = {
            data: data.power, range: ranges.power, change: "power",
            title: "Power"
          };
        }
        this.y = { data: data.delta, range: ranges.delta, title: "Detectable Alternative" };
        break;
    }
    if (!this.x || !this.y || !this.x.data || !this.y.data) {
      console.log("bad:", this.x, this.y);
      return;
    }

    this.targetPoint = { x: this.x.data.target, y: this.y.data.target };

    // dimensions
    this.width  = this.getDimension('width')  - (this.margin * 2);
    this.height = this.getDimension('height') - (this.margin * 2);

    // scales
    this.xScale = d3.scaleLinear().
      domain(this.x.range.toArray()).
      range([0, this.width]);

    this.yScale = d3.scaleLinear().
      domain(this.y.range.toArray().reverse()).
      range([0, this.height]);

    // paths
    let points;
    if (Array.isArray(this.x.data.values[0])) {
      // multiple sets of x values
      points = this.x.data.values.map(xValues => {
        return xValues.map((xValue, i) => {
          return { x: xValue, y: this.y.data.values[i] };
        });
      });
    } else if (Array.isArray(this.y.data.values[0])) {
      // multiple sets of y values
      points = this.y.data.values.map(yValues => {
        return yValues.map((yValue, i) => {
          return { x: this.x.data.values[i], y: yValue };
        });
      });
    }

    if (points) {
      this.paths = this.getPaths(points);
      this.mainPoints = points[0];
      this.mainPoints.sort((a, b) => {
        if (a.x < b.x) return -1;
        if (b.x < a.x) return 1;
        return 0;
      });
    }

    // drop paths
    this.computeDropPaths();

    // target hover ranges
    let xTargetPos = this.xScale(this.targetPoint.x);
    this.xTargetRange = [xTargetPos - 5, xTargetPos + 5];
    let yTargetPos = this.yScale(this.targetPoint.y);
    this.yTargetRange = [yTargetPos - 5, yTargetPos + 5];
    this.xBisector = d3.bisector(point => point.x).left;

    this.needDraw = true;
  }

  private computeDropPaths(): void {
    let points = [
      [
        { x: this.xScale.domain()[0], y: this.targetPoint.y },
        { x: this.targetPoint.x, y: this.targetPoint.y }
      ],
      [
        { x: this.targetPoint.x, y: this.yScale.domain()[1] },
        { x: this.targetPoint.x, y: this.targetPoint.y }
      ],
    ];
    this.dropPaths = this.getPaths(points);
  }

  private draw(): void {
    if (!this.needDraw) {
      return;
    }

    // axes (drawn by d3)
    let xAxis = d3.axisBottom(this.xScale).ticks(6);
    d3.select(this.bottomAxisElement.nativeElement).
      call(xAxis).
      attr("font-size", 10 * this.plotOptions.axisFontSize).
      attr("stroke-width", this.plotOptions.axisLineWidth);

    let yAxis = d3.axisLeft(this.yScale).ticks(6);
    d3.select(this.leftAxisElement.nativeElement).
      call(yAxis).
      attr("font-size", 10 * this.plotOptions.axisFontSize).
      attr("stroke-width", this.plotOptions.axisLineWidth);

    // make target point draggable
    let target = d3.select(this.targetElement.nativeElement);
    let drag = d3.drag().
      on("start", this.dragTargetStart.bind(this)).
      on("drag", this.dragTarget.bind(this)).
      on("end", this.dragTargetEnd.bind(this));
    target.call(drag);

    this.needDraw = false;
  }

  private getDimension(key: string): number {
    let dim = this.plotElement.nativeElement[key];
    let result = 0;
    if ('value' in dim) {
      result = dim.value;
    } else if ('baseVal' in dim) {
      result = dim.baseVal.value;
    } else {
      throw new Error(`can't get ${key}`);
    }
    return result;
  }

  private translate(x: number, y: number): string {
    if (isNaN(x) || isNaN(y)) {
      return null;
    }
    return `translate(${x}, ${y})`;
  }

  private clipPath(): string {
    return `url(#${this.clipPathId})`;
  }

  private getPaths(points: any[]): string[] {
    return points.map(data => {
      let line = d3.line().
        x((d, i) => this.xScale(d.x)).
        y((d, i) => this.yScale(d.y));

      return line(data);
    });
  }
}
