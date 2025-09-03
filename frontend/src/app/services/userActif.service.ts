import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { UserActive } from '../models/userActif.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private users: UserActive[] = [];

  constructor() { }


}