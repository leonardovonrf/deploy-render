// Gerenciamento de Autenticação
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.init();
    }

    init() {
        // Verificar se há usuário e TOKEN salvos
        const savedUser = localStorage.getItem('currentUser');
        const token = localStorage.getItem('token');

        if (savedUser && token) {
            this.currentUser = JSON.parse(savedUser);
            this.isAuthenticated = true;
            
            // Se estiver na página de login e já autenticado, redirecionar
            if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
                this.redirectToDashboard();
            }
        } else {
            // Se não estiver autenticado e não estiver na página de login, redirecionar
            if (!window.location.pathname.includes('index.html') && window.location.pathname !== '/') {
                this.redirectToLogin();
            }
        }
    }

    // A NOVA FUNÇÃO DE LOGIN (CONECTADA AO BACKEND)
    async login(email, password) {
        try {
            const response = await fetch('https://deploy-render-5o3w.onrender.com/api/usuarios/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, senha: password })
            });

            const data = await response.json();

            if (!response.ok) {
                // Se o servidor retornar erro (401, 400, etc), lança uma exceção
                throw new Error(data.message || 'Falha ao realizar login');
            }

            // Se o login funcionou, salva os dados
            this.currentUser = {
                id: data.id,
                name: data.name,
                email: data.email,
                role: data.role,
                // Não salvamos a senha, mas salvamos o token se precisar usar depois
            };
            
            this.isAuthenticated = true;
            
            // Salva no navegador
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            localStorage.setItem('token', data.token); // <--- O PASSE DE SEGURANÇA

            return this.currentUser;

        } catch (error) {
            console.error("Erro de login:", error);
            throw error; // Repassa o erro para ser mostrado na tela
        }
    }

    logout() {
        this.currentUser = null;
        this.isAuthenticated = false;
        // Limpa tudo
        localStorage.removeItem('currentUser');
        localStorage.removeItem('token'); 
        localStorage.removeItem('userPreferences');
        this.redirectToLogin();
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isUserAuthenticated() {
        return this.isAuthenticated;
    }

    redirectToLogin() {
        // Evita loop de redirecionamento se já estiver na login page
        if (!window.location.pathname.includes('index.html')) {
            window.location.href = 'index.html';
        }
    }

    redirectToDashboard() {
        window.location.href = 'dashboard.html';
    }

    // Verificar se o usuário tem permissão para uma ação
    hasPermission(action) {
        if (!this.isAuthenticated || !this.currentUser) return false;
        
        const permissions = {
            'admin': ['create', 'read', 'update', 'delete', 'manage_users'],
            'supervisor': ['create', 'read', 'update'],
            'user': ['create', 'read',]
        };
        
        const userPermissions = permissions[this.currentUser.role] || [];
        return userPermissions.includes(action);
    }
}

// Instância global do gerenciador de autenticação
const authManager = new AuthManager();

// Funções para o formulário de login
document.addEventListener('DOMContentLoaded', function() {
    // Só executar se estivermos na página de login
    if (document.getElementById('loginForm')) {
        initLoginForm();
    }
    
    // Só executar se estivermos no dashboard
    if (document.getElementById('userBtn')) {
        initUserMenu();
    }
});

function initLoginForm() {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const togglePassword = document.getElementById('togglePassword'); // Se existir ícone de olho
    const rememberMe = document.getElementById('rememberMe');

    // Submissão do formulário
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        
        if (!email || !password) {
            showToast('Preencha todos os campos', 'error');
            return;
        }
        
        // Mostrar loading
        setLoginLoading(true);
        
        try {
            await authManager.login(email, password);
            
            // Salvar preferência "lembrar de mim" (apenas o email)
            if (rememberMe && rememberMe.checked) {
                localStorage.setItem('rememberUser', email);
            } else {
                localStorage.removeItem('rememberUser');
            }
            
            showToast('Login realizado com sucesso!', 'success');
            
            // Pequeno delay visual antes do redirecionamento
            setTimeout(() => {
                authManager.redirectToDashboard();
            }, 1000);
            
        } catch (error) {
            showToast(error.message, 'error');
            setLoginLoading(false);
        }
    });

    // Carregar email salvo se "lembrar de mim" estava marcado
    const rememberedUser = localStorage.getItem('rememberUser');
    if (rememberedUser && emailInput) {
        emailInput.value = rememberedUser;
        if (rememberMe) rememberMe.checked = true;
    }
}

function initUserMenu() {
    const userBtn = document.getElementById('userBtn');
    const userDropdown = document.getElementById('userDropdown');
    const userName = document.getElementById('userName');
    const logoutBtn = document.getElementById('logoutBtn');

    // Mostrar nome do usuário
    const currentUser = authManager.getCurrentUser();
    if (currentUser && userName) {
        userName.textContent = currentUser.name;
    }

    // Toggle do menu do usuário
    if (userBtn) {
        userBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            if(userDropdown) userDropdown.classList.toggle('show');
        });
    }

    // Fechar menu ao clicar fora
    document.addEventListener('click', function() {
        if (userDropdown) {
            userDropdown.classList.remove('show');
        }
    });

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Usa a função global showConfirmModal se existir, ou logout direto
            if (typeof showConfirmModal === 'function') {
                showConfirmModal(
                    'Tem certeza que deseja sair do sistema?',
                    () => {
                        authManager.logout();
                    }
                );
            } else {
                if(confirm('Tem certeza que deseja sair?')) {
                    authManager.logout();
                }
            }
        });
    }
}

function setLoginLoading(loading) {
    const loginBtn = document.getElementById('loginBtn');
    if (!loginBtn) return;

    const btnText = loginBtn.querySelector('.btn-text');
    const loadingSpinner = loginBtn.querySelector('.loading-spinner');
    
    if (loading) {
        loginBtn.classList.add('loading');
        loginBtn.disabled = true;
        if(btnText) btnText.style.opacity = '0';
        if(loadingSpinner) loadingSpinner.style.display = 'block';
    } else {
        loginBtn.classList.remove('loading');
        loginBtn.disabled = false;
        if(btnText) btnText.style.opacity = '1';
        if(loadingSpinner) loadingSpinner.style.display = 'none';
    }
}