import { Component, Input, Output, EventEmitter, OnInit, ViewChild } from '@angular/core';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { NgbTabset, NgbTabChangeEvent } from '@ng-bootstrap/ng-bootstrap';
import { zip } from 'rxjs';

import { ProjectType } from '../../project-type';
import { AbstractProjectService } from '../../abstract-project.service';
import { PlotOptionsService } from '../../plot-options.service';
import { PaletteService } from '../../palette.service';
import { AbstractProjectComponent } from '../../abstract-project.component';
import { Project } from '../project';
import { TTest } from '../t-test';

@Component({
  selector: 't-test-project',
  templateUrl: './project.component.html',
  styleUrls: ['./project.component.css']
})
export class ProjectComponent extends AbstractProjectComponent implements OnInit {
  project: Project;
  name: string;
  selectedModel: TTest;

  @ViewChild('tabset', { static: false }) tabset: NgbTabset;

  constructor(
    private projectService: AbstractProjectService,
    private plotOptions: PlotOptionsService,
    private palette: PaletteService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    super();
  }

  ngOnInit(): void {
    zip(this.route.data, this.route.paramMap).subscribe((event: any[]) => {
      let projectType = event[0].type as ProjectType;
      let params = event[1] as ParamMap;
      let id = params.get('id');
      if (id) {
        let index = parseInt(id) - 1;
        this.name = `${index}`;
        this.project = this.projectService.getProject(projectType, index) as Project;
      } else {
        this.project = undefined;
      }

      if (this.project) {
        this.selectedModel = this.project.getModel(this.project.selectedIndex);
      } else {
        this.selectedModel = undefined;
        this.router.navigate([ '..' ], { relativeTo: this.route });
      }
      this.projectSwitched.emit(this.project);
    });
  }

  changeOutput(value: string): void {
    this.project.updateModel(0, 'output', value).subscribe(() => {
      this.projectChanged.emit();
    });
  }

  selectModel(index: number): void {
    this.project.selectedIndex = index;
    this.selectedModel = this.project.getModel(index);
    this.projectChanged.emit();
  }

  addModel(): void {
    let model = this.selectedModel.shallowClone();
    this.project.addModel(model).subscribe(() => {
      this.project.selectedIndex = this.project.models.length - 1;
      this.projectChanged.emit();
    });
  }

  onModelRemove(index: number): void {
    this.removeModel(index);
  }

  removeModel(index: number): void {
    this.project.removeModel(index).subscribe(() => {
      if (this.project.selectedIndex >= this.project.models.length) {
        this.project.selectedIndex--;
      }
      this.projectChanged.emit();
    });
  }

  onModelChanged(): void {
    this.projectChanged.emit();
  }

  trackByIndex(index: number, item: number): number {
    return index;
  }

  getColor(index: number): string {
    return this.palette.getColor(index, this.plotOptions.paletteTheme);
  }
}
