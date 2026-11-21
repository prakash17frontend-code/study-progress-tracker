
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Api } from './api';
import { Observable, tap } from 'rxjs';

export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class Auth {
  constructor(
    private api: Api,
    private router: Router
  ) {}

  register(data: {
    name: string;
    email: string;
    password: string;
  }): Observable<any> {
    return this.api.post('/auth/register', data);
  }

  login(data: {
    email: string;
    password: string;
  }): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('/auth/login', data).pipe(
      tap(response => {
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('user', JSON.stringify(response.user));
      })
    );
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('access_token');
  }
}
