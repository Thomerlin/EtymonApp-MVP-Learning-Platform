import { Component, OnInit } from '@angular/core';
import { AdminContentService } from '../../services/admin-content.service';
import { Router } from '@angular/router';

// Define interface for article data
interface Article {
  id: number;
  title: string;
  summary: string;
  created_date: string;
  article_link?: string;
  levels?: any;
}

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
  articles: Article[] = [];
  filteredArticles: Article[] = [];
  loadingArticles = false;
  deletingArticleId: number | null = null;
  searchTerm = '';

  // New properties for modal and editing
  showEditModal = false;
  editingArticle: Article | null = null;
  editJsonContent = '';
  isLoadingArticle = false;
  isUpdatingArticle = false;

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
        } else {
          // If user is admin, fetch the articles
          this.loadArticles();
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

  loadArticles() {
    this.loadingArticles = true;
    this.adminContentService.getArticlesSummary().subscribe({
      next: (response: Article[]) => {
        this.articles = response;
        this.filterArticles(); // Apply any existing search filter
        this.loadingArticles = false;
      },
      error: (error) => {
        console.error('Error fetching articles:', error);
        this.errorMessage = 'Erro ao carregar a lista de artigos.';
        this.loadingArticles = false;
      }
    });
  }

  filterArticles() {
    if (!this.searchTerm.trim()) {
      this.filteredArticles = [...this.articles];
      return;
    }

    const search = this.searchTerm.toLowerCase().trim();
    this.filteredArticles = this.articles.filter(article => 
      article.title.toLowerCase().includes(search) || 
      article.summary.toLowerCase().includes(search) ||
      article.id.toString().includes(search)
    );
  }

  deleteArticle(articleId: number) {
    if (confirm('Tem certeza que deseja excluir este artigo? Esta ação não pode ser desfeita.')) {
      this.deletingArticleId = articleId;
      this.adminContentService.deleteArticle(articleId).subscribe({
        next: (response) => {
          this.successMessage = 'Artigo excluído com sucesso!';
          // Refresh articles list
          this.loadArticles();
          this.deletingArticleId = null;
        },
        error: (error) => {
          console.error('Error deleting article:', error);
          this.errorMessage = error.error?.error || 
            'Ocorreu um erro ao excluir o artigo. Por favor tente novamente.';
          this.deletingArticleId = null;
        }
      });
    }
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
          // Refresh the articles list
          this.loadArticles();
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

  // New methods for edit functionality
  openEditModal(articleId: number) {
    this.errorMessage = '';
    this.successMessage = '';
    this.isLoadingArticle = true;
    this.editingArticle = null;
    this.editJsonContent = '';

    this.adminContentService.getArticleById(articleId).subscribe({
      next: (article) => {
        this.editingArticle = article;
        // Format the JSON with indentation for better readability in the editor
        this.editJsonContent = JSON.stringify(article, null, 2);
        this.isLoadingArticle = false;
        this.showEditModal = true;
      },
      error: (error) => {
        console.error('Error loading article details:', error);
        this.errorMessage = error.error?.error || 
          'Erro ao carregar detalhes do artigo. Por favor tente novamente.';
        this.isLoadingArticle = false;
      }
    });
  }

  closeEditModal() {
    this.showEditModal = false;
    this.editingArticle = null;
    this.editJsonContent = '';
  }

  updateArticle() {
    if (!this.editingArticle) return;
    
    this.errorMessage = '';
    this.successMessage = '';

    try {
      // Parse JSON to validate it
      const updatedContent = JSON.parse(this.editJsonContent);
      this.isUpdatingArticle = true;
      
      this.adminContentService.updateArticle(this.editingArticle.id, updatedContent).subscribe({
        next: (response) => {
          this.successMessage = 'Artigo atualizado com sucesso!';
          this.isUpdatingArticle = false;
          this.showEditModal = false;
          // Refresh the articles list
          this.loadArticles();
        },
        error: (error) => {
          console.error('Error updating article:', error);
          this.errorMessage = error.error?.error || 
            'Ocorreu um erro ao atualizar o artigo. Por favor tente novamente.';
          this.isUpdatingArticle = false;
        }
      });
    } catch (e) {
      this.errorMessage = 'JSON inválido. Por favor, verifique o formato e tente novamente.';
    }
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
