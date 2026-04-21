import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'filterStatus' })
export class FilterStatusPipe implements PipeTransform {
  transform(items: any[], status: string): number {


    return items.filter(i => i.status === status).length;


    
  }
}
