import { Component, OnInit } from '@angular/core';
import { AdminContentService } from '../../services/admin-content.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-content-input',
  templateUrl: './content-input.component.html',
  styleUrls: ['./content-input.component.scss']
})
export class ContentInputComponent implements OnInit {
  jsonContent = '';
  errorMessage = '';
  successMessage = '';
  isLoading = false;
  isAdmin = false;
  checkingAdmin = true;

  constructor(
    private adminContentService: AdminContentService,
    private router: Router
  ) { }

  ngOnInit() {
    this.checkingAdmin = true;
    // Check admin status when component initializes
    this.adminContentService.checkAdminStatus().subscribe({
      next: (isAdmin) => {
        this.isAdmin = isAdmin;
        this.checkingAdmin = false;
        
        if (!isAdmin) {
          this.errorMessage = 'Acesso negado. Você não tem permissão de administrador.';
          setTimeout(() => {
            this.router.navigate(['/']);
          }, 3000); // Redirect after 3 seconds
        }
      },
      error: (error) => {
        this.checkingAdmin = false;
        this.errorMessage = 'Erro ao verificar permissões de administrador.';
        console.error('Error checking admin status:', error);
        
        setTimeout(() => {
          this.router.navigate(['/']);
        }, 3000); // Redirect after 3 seconds
      }
    });
  }

  onSubmit() {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.isAdmin) {
      this.errorMessage = 'Você não tem permissão para adicionar conteúdo';
      return;
    }

    if (!this.jsonContent.trim()) {
      this.errorMessage = 'Por favor, insira o conteúdo JSON';
      return;
    }

    try {
      // Parse JSON to validate it
      const contentData = JSON.parse(this.jsonContent);
      this.isLoading = true;
      this.adminContentService.submitContent(contentData).subscribe({
        next: (response) => {
          this.successMessage = 'Conteúdo adicionado com sucesso!';
          this.jsonContent = '';
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error submitting content:', error);
          this.errorMessage = error.error?.error ||
            'Ocorreu um erro ao adicionar o conteúdo. Por favor tente novamente.';
          this.isLoading = false;
        }
      });
    } catch (e) {
      this.errorMessage = 'JSON inválido. Por favor, verifique o formato e tente novamente.';
    }
  }

  loadSampleTemplate() {
    this.jsonContent = JSON.stringify(this.getSampleTemplate(), null, 2);
  }

  private getSampleTemplate() {
    return {
      "title": "Título do Artigo",
      "article_link": "https://example.com/article",
      "summary": "Um breve resumo do artigo.",
      "created_date": new Date().toISOString().split('T')[0],
      "levels": {
        "beginner": {
          "text": {
            "content": "Conteúdo para iniciantes",
            "phonetics": "Fonética opcional"
          },
          "exercises": {
            "multiple_choice": [
              {
                "question": "Pergunta de múltipla escolha",
                "options": ["Opção 1", "Opção 2", "Opção 3", "Opção 4"],
                "answer": 0
              }
            ]
          }
        },
        "intermediate": {
          "text": {
            "content": "Conteúdo para nível intermediário"
          },
          "exercises": {
            "multiple_choice": [
              {
                "question": "Pergunta de múltipla escolha",
                "options": ["Opção 1", "Opção 2", "Opção 3", "Opção 4"],
                "answer": 0
              }
            ]
          }
        }
      }
    };
  }
}
