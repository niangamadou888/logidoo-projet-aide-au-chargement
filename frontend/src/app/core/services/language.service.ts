import { Injectable, LOCALE_ID, Inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private currentLangSubject = new BehaviorSubject<string>('fr');
  public currentLang$ = this.currentLangSubject.asObservable();

  private translations: any = {};

  constructor(
    private http: HttpClient,
    @Inject(LOCALE_ID) private locale: string
  ) {
    this.currentLangSubject.next(this.locale);
    this.loadTranslations(this.locale);
  }

  async loadTranslations(lang: string): Promise<void> {
    try {
      this.translations[lang] = await this.http.get(`/assets/i18n/${lang}.json`).toPromise();
    } catch (error) {
      console.error(`Erreur lors du chargement des traductions ${lang}:`, error);
    }
  }

  translate(key: string, params?: any): string {
    const translation = this.getNestedProperty(this.translations[this.locale], key);
    if (!translation) return key;

    if (params) {
      return this.interpolate(translation, params);
    }
    return translation;
  }

  changeLanguage(lang: string): void {
    // Redirection vers la version localisée de l'application
    const currentPath = window.location.pathname;
    let newPath: string;

    if (lang === 'fr') {
      newPath = currentPath.replace(/^\/(en|es)/, '');
    } else {
      newPath = `/${lang}${currentPath.replace(/^\/(en|es)/, '')}`;
    }

    window.location.href = newPath;
  }

  private getNestedProperty(obj: any, key: string): string {
    return key.split('.').reduce((o, k) => (o || {})[k], obj);
  }

  private interpolate(text: string, params: any): string {
    return text.replace(/{{(\w+)}}/g, (match, key) => params[key] || match);
  }
}