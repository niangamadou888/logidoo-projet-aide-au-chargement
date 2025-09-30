import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

import { UserActive } from '../models/userActif.model';
import { User } from '../core/models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'https://logidoo-projet-aide-au-chargement-7.onrender.com/api/auth';

  private users: UserActive[] = [];

  constructor(private http: HttpClient) { }

  getAllUsers(): Observable<{ success: boolean; users: User[] }> {
    return this.http.get<{ success: boolean; users: User[] }>(`${this.apiUrl}/users`);
  }
}