import { Component, ViewChild, ElementRef, Input, Output, OnChanges, SimpleChanges, EventEmitter } from '@angular/core';
import { NgbModal, NgbTabset } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';

import { AbstractProject } from '../abstract-project';
import { LinePlotHandler } from '../line-plot-handler';
import { CIPlotHandler } from '../ci-plot-handler';
import { LinePlotComponent } from '../line-plot/line-plot.component';
import { CIPlotComponent } from '../ci-plot/ci-plot.component';
import { ExportPlotsComponent } from '../export-plots/export-plots.component';
import { PlotOptionsService } from '../plot-options.service';
import { PaletteService } from '../palette.service';
import { CopyService } from '../copy.service';

@Component({
  selector: 'app-output-pane',
  templateUrl: './output-pane.component.html',
  styleUrls: ['./output-pane.component.css']
})
export class OutputPaneComponent implements OnChanges {
  @Input('project') project: AbstractProject;
  @Input('hover-disabled') hoverDisabled = false;
  @Output() modelChanged = new EventEmitter();
  linePlotHandler: LinePlotHandler;
  ciPlotHandler: CIPlotHandler;
  showFooter = true;
  private copySub: Subscription;

  @ViewChild('topLeft') topLeftPlot: LinePlotComponent;
  @ViewChild('topRight') topRightPlot: LinePlotComponent;
  @ViewChild('bottom') bottomPlot: CIPlotComponent;
  @ViewChild('footerTabset') footerTabset: NgbTabset;
  @ViewChild('log') logElt: ElementRef;

  constructor(
    private modalService: NgbModal,
    private plotOptions: PlotOptionsService,
    private palette: PaletteService,
    private copyService: CopyService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (!('project' in changes)) return;

    if (this.project) {
      this.linePlotHandler = this.project.getLinePlotHandler();
      this.ciPlotHandler = this.project.getCIPlotHandler();
    } else {
      this.linePlotHandler = undefined;
      this.ciPlotHandler = undefined;
    }
  }

  toggleFooter(value: boolean): void {
    this.showFooter = value;
    setTimeout(this.resize.bind(this), 1);
  }

  openSaveDialog(): void {
    const modalRef = this.modalService.open(ExportPlotsComponent, { windowClass: 'export-plots' });
    let component = modalRef.componentInstance;
    component.project = this.project;
    component.topLeftLegendXOffset = this.topLeftPlot.legendXOffset;
    component.topLeftLegendYOffset = this.topLeftPlot.legendYOffset;
    component.topRightLegendXOffset = this.topRightPlot.legendXOffset;
    component.topRightLegendYOffset = this.topRightPlot.legendYOffset;
  }

  resize(): void {
    this.redrawPlots();
  }

  redrawPlots(): void {
    // Set a timeout here to let the UI resize if needed
    setTimeout(() => {
      this.topLeftPlot.redraw();
      this.topRightPlot.redraw();
      this.bottomPlot.redraw();
    }, 1);
  }

  getIndicatorColor(): string {
    return this.palette.getColor(this.project.getSelectedIndex(),
      this.plotOptions.paletteTheme);
  }

  copyFooter(): void {
    this.copySub = this.copyService.onCopy.subscribe(event => {
      this.onCopy(event);
    });
    document.execCommand('copy');
  }

  onCopy(event: any): void {
    switch (this.footerTabset.activeId) {
      case 'output-pane-interpretation':
        event.clipboardData.setData('text/plain', this.project.getModelInterpretation());
        event.preventDefault();
        break;
      case 'output-pane-log':
        // Hack to grab the log text without HTML markup
        let text = this.logElt.nativeElement.innerText;
        event.clipboardData.setData('text/plain', text);
        event.preventDefault();
        break;
    }
    this.copySub.unsubscribe();
  }

  onModelChanged(): void {
    this.modelChanged.emit();
  }
}
