import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import * as _ from 'lodash-es';
import { Subject } from 'rxjs';
import { filter, take, takeUntil } from 'rxjs/operators';
import { TreeService, HelperService, EditorTelemetryService, EditorService, FrameworkService } from '../../services';
import { formConfig } from '../../editor.config';

@Component({
  selector: 'lib-question-set',
  templateUrl: './question-set.component.html',
  styleUrls: ['./question-set.component.scss']
})
export class QuestionSetComponent implements OnInit, OnDestroy {
  @Input() questionSetMetadata: any;
  @Output() toolbarEmitter = new EventEmitter<any>();
  formFieldProperties = formConfig;
  private onComponentDestroy$ = new Subject<any>();
  public framework;
  public frameworkDetails: any = {};
  public showEditMetaForm = false;
  constructor(private treeService: TreeService, private helperService: HelperService, public telemetryService: EditorTelemetryService,
              public editorService: EditorService, private frameworkService: FrameworkService) { }

  ngOnInit() {
    this.framework = _.get(this.editorService.editorConfig, 'context.framework');
    this.fetchFrameWorkDetails().subscribe((frameworkDetails: any) => {
      if (frameworkDetails && !frameworkDetails.err) {
        const frameworkData = frameworkDetails.frameworkdata[this.framework].categories;
        this.frameworkDetails.frameworkData = frameworkData;
        this.frameworkDetails.topicList = _.get(_.find(frameworkData, { code: 'topic' }), 'terms');
        this.prepareFormConfiguration();
      }
    });
  }

  prepareFormConfiguration() {
    const categoryMasterList = this.frameworkDetails.frameworkData;
    _.forEach(categoryMasterList, (category) => {
      _.forEach(this.formFieldProperties, (formFieldCategory) => {
        if (category.code === formFieldCategory.code && formFieldCategory.code !== 'topic') {
          formFieldCategory.terms = category.terms;
        }

        if (category.code === formFieldCategory.code && formFieldCategory.code === 'topic') {
          formFieldCategory.range = category.terms;
        }

        if (formFieldCategory.code === 'license' && this.helperService.getAvailableLicenses()) {
          const licenses = this.helperService.getAvailableLicenses();
          if (licenses && licenses.length) {
            formFieldCategory.range = _.map(licenses, 'name');
          }
        }
      });
    });

    const questionSetObj = this.questionSetMetadata.data.metadata;
    // tslint:disable-next-line:max-line-length
    const metadata = (_.isUndefined(this.treeService.treeCache.nodesModified[questionSetObj.identifier])) ? questionSetObj : _.assign(questionSetObj, this.treeService.treeCache.nodesModified[questionSetObj.identifier].metadata);

    _.forEach(this.formFieldProperties, field => {
      if (metadata && _.has(metadata, field.code)) {
        field.default = metadata[field.code];
      }

      if ((_.isEmpty(field.range) || _.isEmpty(field.terms)) &&
      !field.editable && !_.isEmpty(field.default)) {
        if (_.has(field, 'terms')) {
          field.terms = [];
          if (_.isArray(field.default)) {
            field.terms = field.default;
          } else {
            field.terms.push(field.default);
          }
        } else {
          field.range = [];
          if (_.isArray(field.default)) {
            field.range = field.default;
          } else {
            field.range.push(field.default);
          }
        }
      }

      if (field.inputType === 'nestedselect') {
        _.map(field.range, val => {
          return {
            value: val.value || val,
            label: val.value || val
          };
        });
      }

      if (this.editorService.editorMode === 'review') {
          _.set(field, 'editable', false);
      }
    });
    this.showEditMetaForm = true;
  }

  fetchFrameWorkDetails() {
    return this.frameworkService.frameworkData$.pipe(takeUntil(this.onComponentDestroy$),
    filter(data => _.get(data, `frameworkdata.${this.framework}`)), take(1));
  }

  addQuestion() {
    this.toolbarEmitter.emit({ button: { type: 'showQuestionTemplate' } });
  }

  addFromLibrary() {
    this.toolbarEmitter.emit({ button: { type: 'addFromLibrary' } });
  }

  output(event) {}

  onStatusChanges(event) {
    console.log('onStatusChanges::', event);
    this.toolbarEmitter.emit({ button: { type: 'onFormChange' }, event });
  }

  valueChanges(event) {
    this.treeService.updateNode(event);
  }

  ngOnDestroy() {
    this.onComponentDestroy$.next();
    this.onComponentDestroy$.complete();
  }

}
