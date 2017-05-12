import { TestBed, inject } from '@angular/core/testing';

import { VisualizationObjectService } from './visualization-object.service';

describe('VisualizationObjectService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [VisualizationObjectService]
    });
  });

  it('should ...', inject([VisualizationObjectService], (service: VisualizationObjectService) => {
    expect(service).toBeTruthy();
  }));
});
