import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TtsService {
  private apiUrl = `${environment.apiUrl}/api/tts`;

  constructor(private http: HttpClient) { }

  synthesize(text: string, languageCode: string = 'en-US', voice: string = 'en-US-Neural2-F', gender: string = 'FEMALE'): Observable<any> {
    return this.http.post(`${this.apiUrl}/synthesize`, { text, languageCode, voice, gender });
  }

  synthesizeSsml(ssml: string, languageCode: string = 'en-US', voice: string = 'en-US-Neural2-F', gender: string = 'FEMALE'): Observable<any> {
    return this.http.post(`${this.apiUrl}/synthesize-ssml`, { ssml, languageCode, voice, gender });
  }

  generateSsml(text: string, language: string = 'en-US'): Observable<any> {
    return this.http.post(`${this.apiUrl}/generate-ssml`, { text, language });
  }
}
