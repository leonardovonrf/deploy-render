// ==========================================================
// ARQUIVO: frontend/forms.js
// ATUALIZADO: COM GRÁFICO DE PIZZA (CHART.JS)
// ==========================================================

class FormsManager {
    constructor() {
        this.forms = []; 
        this.currentEditingForm = null;
    }

    async init() {
        await this.loadForms(); 
    }

    // --- CARREGAR ---
    async loadForms(ordem = 'recentes') {
        try {
            const token = localStorage.getItem('token'); 
            
            const response = await fetch(`https://deploy-render-5o3w.onrender.com/api/formularios?ordem=${ordem}`, {
                headers: {
                    'Authorization': `Bearer ${token}` 
                }
            });
            
            if (response.status === 401) {
                console.warn("Sessão expirada");
                window.location.href = 'index.html'; 
                return;
            }

            if (!response.ok) {
                throw new Error(`Falha ao buscar dados: ${response.statusText}`);
            }

            this.forms = await response.json();
            console.log('Formulários carregados:', this.forms.length);

        } catch (error) {
            console.error("Erro em loadForms:", error);
            showToast("Erro ao carregar formulários.", "error");
            this.forms = []; 
        }
    }

    getAllForms() { return this.forms; }
    getFormById(id) { return this.forms.find(form => form._id === id); }

    // --- ATUALIZAR ---
    async updateForm(id, formData) {
        try {
            const token = localStorage.getItem('token');

            const response = await fetch(`https://deploy-render-5o3w.onrender.com/api/formularios/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) throw new Error('Falha ao atualizar formulário');
            
            const updatedForm = await response.json();
            const index = this.forms.findIndex(f => f._id === id);
            if (index !== -1) this.forms[index] = updatedForm;
            
            return updatedForm;

        } catch (error) {
            console.error("Erro ao atualizar:", error);
            showToast("Erro ao atualizar: " + error.message, "error");
            return null;
        }
    }

    // --- DELETAR ---
    async deleteForm(id) {
        try {
            const token = localStorage.getItem('token');
            
            const response = await fetch(`https://deploy-render-5o3w.onrender.com/api/formularios/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 403) {
                 throw new Error('Acesso negado. Apenas administradores podem excluir.');
            }

            if (!response.ok) throw new Error('Falha ao excluir formulário');

            this.forms = this.forms.filter(form => form._id !== id);
            return true;

        } catch (error) {
            console.error("Erro ao deletar:", error);
            showToast(error.message, "error");
            return false;
        }
    }

    filterForms(searchTerm = '', status = '', origin = '') {
        let filtered = this.forms;

        // 1. Filtro de Texto (Busca)
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(form => 
                (form.titulo && form.titulo.toLowerCase().includes(term)) ||
                (form.descricao && form.descricao.toLowerCase().includes(term)) ||
                (form.dadosRNC && form.dadosRNC.desc_ocorrencia && form.dadosRNC.desc_ocorrencia.toLowerCase().includes(term)) ||
                (form.criado_por && form.criado_por.nome && form.criado_por.nome.toLowerCase().includes(term))
            );
        }

        // 2. Filtro de Status
        if (status) {
            filtered = filtered.filter(form => form.status === status);
        }

        // 3. NOVO: Filtro de Origem
        if (origin) {
            filtered = filtered.filter(form => {
                const formOrigin = form.dadosRNC?.origem;
                
                // Se o filtro for "outro", aceita tanto a string "outro" quanto qualquer coisa que não esteja na lista padrão
                if (origin === 'outro') {
                     const listaPadrao = ['Processo', 'Acidente Químico', 'Acidente/ incidente', 'BC-Atendimento de eventos', 'Atendimento de Emergência', 'Chamado de Emergência improcedente', 'Denuncia', 'Incêndio', 'Incidente Químico', 'Inspeção de Segurança', 'Princípio de incêndio', 'Rev./projeto_incêndio', 'Treinamento SST', 'Vazamento de água/vapor'];
                     return formOrigin === 'outro' || !listaPadrao.includes(formOrigin);
                }
                
                // Comparação exata para os outros tipos
                return formOrigin === origin;
            });
        }

        return filtered;
    }

    getStats() {
        const total = this.forms.length;
        const pending = this.forms.filter(form => form.status === 'pending').length;
        const completed = this.forms.filter(form => form.status === 'completed').length;
        const today = this.forms.filter(form => {
            const formDate = new Date(form.createdAt);
            const todayDate = new Date();
            return formDate.toDateString() === todayDate.toDateString();
        }).length;
        return { total, pending, completed, today };
    }

    // --- NOVO: ESTATÍSTICAS PARA O GRÁFICO DE PIZZA ---
    getOriginStats() {
    // Inicializa todos os contadores com 0
    // As chaves aqui devem ser IGUAIS aos values do <select> no HTML
    const stats = {
        'Processo': 0,
        'Acidente Químico': 0,
        'Acidente/ incidente': 0,
        'BC-Atendimento de eventos': 0,
        'Atendimento de Emergência': 0,
        'Chamado de Emergência improcedente': 0,
        'Denuncia': 0,
        'Incêndio': 0,
        'Incidente Químico': 0,
        'Inspeção de Segurança': 0,
        'Princípio de incêndio': 0,
        'Rev./projeto_incêndio': 0,
        'Treinamento SST': 0,
        'Vazamento de água/vapor': 0,
        'outro': 0
    };

    this.forms.forEach(form => {
        // Pega a origem salva. Se não tiver, considera 'outro' ou ignora
        let origem = form.dadosRNC?.origem;
        
        // Se a origem salva for "Outro", o valor salvo no banco provavelmente é o texto digitado.
        // Se você quiser agrupar tudo que não é padrão em "outro":
        if (origem && !stats.hasOwnProperty(origem)) {
            // Se a origem não está na lista padrão acima, conta como 'outro'
            // OU se você salvou o texto específico, precisaria de lógica dinâmica.
            // Aqui assumirei que se não bater com a lista, cai em 'outro'
            origem = 'outro';
        }

        if (origem && stats.hasOwnProperty(origem)) {
            stats[origem]++;
        }
    });

    return stats;
}

    getRecentForms() {
        return this.forms
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
            .slice(0, 5);
    }
}

const formsManager = new FormsManager();
let myChart = null; // Variável global para guardar a instância do gráfico

document.addEventListener('DOMContentLoaded', async function() {
    if (document.getElementById('formsGrid')) {
        await formsManager.init();
        initFormsSection();
        
        // Atualiza tudo ao carregar
        if (typeof updateDashboardStats === 'function') {
            updateDashboardStats();
            renderRecentForms();
            renderOriginChart(); // <--- DESENHA O GRÁFICO
        }
    }
});

function initFormsSection() {
    const originFilter = document.getElementById('originFilter');

if (originFilter) {
    originFilter.addEventListener('change', function() {
        // Pega os valores atuais dos outros filtros para não resetá-los
        const searchVal = searchInput ? searchInput.value : '';
        const statusVal = statusFilter ? statusFilter.value : '';
        renderForms(searchVal, statusVal, this.value);
    });
}
    const searchInput = document.getElementById('searchForms');
    const statusFilter = document.getElementById('statusFilter');
    const orderFilter = document.getElementById('orderFilter');
    const refreshBtn = document.getElementById('refreshForms');
    const btnMensal = document.getElementById('btnRelatorioMensal');
    if (btnMensal) {
        btnMensal.addEventListener('click', generateMonthlyReportPDF);
    }

    renderForms(); 

    if (searchInput) {
        searchInput.addEventListener('input', function() {
            renderForms(this.value, statusFilter ? statusFilter.value : '');
        });
    }
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            renderForms(searchInput ? searchInput.value : '', this.value);
        });
    }
    if (orderFilter) {
        orderFilter.addEventListener('change', async function() {
            showToast('Reordenando...', 'info');
            await formsManager.loadForms(this.value); 
            renderForms();
        });
    }
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async function() {
            showToast('Atualizando lista...', 'info');
            await formsManager.loadForms();
            renderForms();
            updateDashboardStats(); // Atualiza números
            renderOriginChart();    // Atualiza gráfico
            showToast('Lista atualizada!', 'success');
        });
    }
}

function renderForms(searchTerm = '', status = '', origin = '') { 
    const formsGrid = document.getElementById('formsGrid');
    if (!formsGrid) return;

    // NOVO: Se origin não for passado, tenta pegar o valor atual do select
    if (!origin) {
        const originSelect = document.getElementById('originFilter');
        origin = originSelect ? originSelect.value : '';
    }

    const filteredForms = formsManager.filterForms(searchTerm, status, origin);
    
    if (filteredForms.length === 0) {
        formsGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                <i class="fas fa-file-alt" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                <h3 style="color: var(--text-secondary); margin-bottom: 0.5rem;">Nenhum formulário encontrado</h3>
            </div>`;
        return;
    }

    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    const userRole = currentUser ? currentUser.role : 'user';
    const canDelete = (userRole === 'admin' || userRole === 'administrador');

    formsGrid.innerHTML = filteredForms.map(form => {
        const nomeCriador = (form.criado_por && form.criado_por.nome) 
                            ? form.criado_por.nome 
                            : 'Usuário Deletado';

        let textoDescricao = "Sem descrição";
        if (form.dadosRNC && form.dadosRNC.desc_ocorrencia) {
            textoDescricao = form.dadosRNC.desc_ocorrencia;
        } else if (form.descricao) {
            textoDescricao = form.descricao;
        }
        if (textoDescricao.length > 100) textoDescricao = textoDescricao.substring(0, 100) + '...';

        let buttonsHtml = '';
        buttonsHtml += `<button class="icon-btn edit" onclick="editForm(event, '${form._id}')" title="Editar"><i class="fas fa-edit"></i></button>`;
        buttonsHtml += `<button class="icon-btn download" onclick="generateReportPDF(event, '${form._id}')" title="Baixar PDF"><i class="fas fa-file-pdf"></i></button>`;

        if (canDelete) {
            buttonsHtml += `<button class="icon-btn delete" onclick="confirmDeleteForm(event, '${form._id}')" title="Excluir"><i class="fas fa-trash"></i></button>`;
        }

        return `
            <div class="form-card" data-form-id="${form._id}" onclick="openForm('${form._id}')" style="cursor:pointer;">
                <div class="form-card-header">
                    <div>
                        <h3 class="form-card-title" title="${form.titulo}">${form.titulo}</h3>
                        <p class="form-card-date">${formatDate(form.updatedAt)}</p>
                    </div>
                    <div class="form-card-actions">${buttonsHtml}</div>
                </div>
                
                <p class="form-card-description" title="${textoDescricao}">${textoDescricao}</p>
                
                <div class="form-card-footer">
                    <span class="form-status ${form.status}">${getStatusText(form.status)}</span>
                    <span style="font-size: 0.75rem; color: var(--text-muted);">por ${nomeCriador}</span>
                </div>
            </div>
        `;
    }).join('');
}

// Funções de Ação
function editForm(event, formId) {
    event.stopPropagation();
    const form = formsManager.getFormById(formId);
    if (!form) return;
    formsManager.currentEditingForm = form;
    
    document.getElementById('editTitle').value = form.titulo;
    document.getElementById('editDescription').value = form.descricao; 
    document.getElementById('editStatus').value = form.status;
    
    const btnFullEdit = document.getElementById('btnEditFullContent');
    if (btnFullEdit) {
        btnFullEdit.onclick = function() {
            window.open(`formulario.html?id=${formId}&mode=edit`, "_blank");
            closeModal('editModal');
        };
    }
    showModal('editModal');
}

async function saveForm() { 
    if (!formsManager.currentEditingForm) return;
    const title = document.getElementById('editTitle').value.trim();
    const description = document.getElementById('editDescription').value.trim();
    const status = document.getElementById('editStatus').value;

    if (!title) { showToast('Título é obrigatório!', 'error'); return; }

    const updatedForm = await formsManager.updateForm(formsManager.currentEditingForm._id, {
        titulo: title,
        descricao: description,
        status: status
    });

    if (updatedForm) {
        closeModal('editModal');
        renderForms(); 
        updateDashboardStats(); 
        renderOriginChart(); // Atualiza gráfico ao salvar edição rápida
        showToast('Formulário atualizado com sucesso!', 'success');
    }
}

function confirmDeleteForm(event, formId) {
    event.stopPropagation();
    const form = formsManager.getFormById(formId);
    const titulo = form ? form.titulo : "este formulário";
    showConfirmModal(`Tem certeza que deseja excluir permanentemente "${titulo}"?`, () => deleteForm(formId));
}

async function deleteForm(formId) {
    const success = await formsManager.deleteForm(formId);
    if (success) {
        renderForms();
        updateDashboardStats();
        renderOriginChart(); // Atualiza gráfico ao deletar
        showToast('Formulário excluído com sucesso!', 'success');
    }
}

function getStatusText(status) {
    const map = { 'draft': 'Rascunho', 'pending': 'Pendente', 'completed': 'Concluído' };
    return map[status] || status;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.ceil(Math.abs(now - date) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return 'Hoje';
    if (diffDays === 2) return 'Ontem';
    if (diffDays <= 7) return `${diffDays - 1} dias atrás`;
    return date.toLocaleDateString('pt-BR');
}

function updateDashboardStats() {
    if (!formsManager) return;
    const stats = formsManager.getStats();
    ['totalForms', 'pendingForms', 'completedForms', 'todayForms'].forEach((id, i) => {
        const el = document.getElementById(id);
        if (el) el.textContent = Object.values(stats)[i];
    });
}

// ==========================================================
// === FUNÇÃO ATUALIZADA: RENDERIZAR GRÁFICO (Chart.js) ===
// ==========================================================
// ==========================================================
// === FUNÇÃO ATUALIZADA: RENDERIZAR GRÁFICO (COM RÓTULOS FIXOS) ===
// ==========================================================
function renderOriginChart() {
    const ctx = document.getElementById('originChart');
    if (!ctx) return; 

    // Garante que o plugin está ativado
    if (typeof ChartDataLabels !== 'undefined') {
        Chart.register(ChartDataLabels);
    }

    const stats = formsManager.getOriginStats();

    const labels = [
        'Processo', 'Acidente Químico', 'Acidente / Incidente', 
        'BC-Atendimento de eventos', 'Atendimento de Emergência', 'Chamado Improd.', 
        'Denúncia', 'Incêndio', 'Incidente Químico', 'Inspeção de Segurança', 
        'Princípio de Incêndio', 'Rev./Proj. Incêndio', 'Treinamento SST', 
        'Vazamento Água/Vapor', 'Outro' 
    ];

    const dataValues = [
        stats['Processo'], stats['Acidente Químico'], stats['Acidente/ incidente'], 
        stats['BC-Atendimento de eventos'], stats['Atendimento de Emergência'],
        stats['Chamado de Emergência improcedente'], stats['Denuncia'],
        stats['Incêndio'], stats['Incidente Químico'], stats['Inspeção de Segurança'],
        stats['Princípio de incêndio'], stats['Rev./projeto_incêndio'],
        stats['Treinamento SST'], stats['Vazamento de água/vapor'], stats['outro']
    ];

    if (myChart) {
        myChart.destroy();
    }

    myChart = new Chart(ctx, {
        type: 'doughnut', 
        data: {
            labels: labels,
            datasets: [{
                label: 'Ocorrências',
                data: dataValues,
                backgroundColor: [
                    '#3b82f6', '#ef4444', '#f87171', '#10b981', '#34d399', 
                    '#f59e0b', '#fbbf24', '#b91c1c', '#7f1d1d', '#8b5cf6', 
                    '#a78bfa', '#ec4899', '#6366f1', '#06b6d4', '#9ca3af'
                ],
                borderWidth: 1,
                borderColor: '#1f2937', 
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: 20
            },
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#9ca3af',
                        font: { family: "'Poppins', sans-serif", size: 11 },
                        boxWidth: 12,
                        filter: function(legendItem, data) {
                            const value = data.datasets[0].data[legendItem.index];
                            return value > 0;
                        }
                    }
                },
                tooltip: {
                    enabled: true
                },
                // --- AQUI ESTÁ A MÁGICA QUE MOSTRA OS NÚMEROS ---
                datalabels: {
                    color: '#ffffff',
                    font: {
                        weight: 'bold',
                        size: 11
                    },
                    formatter: (value, ctx) => {
                        if (value === 0) return null;
                        
                        let sum = 0;
                        let dataArr = ctx.chart.data.datasets[0].data;
                        dataArr.map(data => { sum += data; });
                        let percentage = Math.round((value / sum) * 100) + "%";
                        
                        return value + "\n(" + percentage + ")";
                    },
                    textAlign: 'center'
                }
            }
        }
    });
}

function renderRecentForms() {
    const container = document.getElementById('recentForms');
    if (!container) return;
    const recent = formsManager.getRecentForms();
    if (recent.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--text-muted);"><p>Nenhum formulário recente</p></div>`;
        return;
    }
    container.innerHTML = recent.map(f => `
        <div class="form-item">
            <div class="form-info">
                <h4>${f.titulo}</h4>
                <p>Atualizado ${formatDate(f.updatedAt)}</p>
            </div>
            <span class="form-status ${f.status}">${getStatusText(f.status)}</span>
        </div>`).join('');
}

function openForm(id) { window.open(`formulario.html?id=${id}&mode=view`, "_blank"); }

// --- PDF Generation ---
const toBase64 = file => new Promise((r, j) => {
    const fr = new FileReader(); fr.readAsDataURL(file);
    fr.onload = () => r(fr.result); fr.onerror = j;
});

// ==========================================================
// SUBSTITUA A FUNÇÃO generateReportPDF POR ESTA VERSÃO (LAYOUT TABELA)
// ==========================================================

async function generateReportPDF(event, formId) {
    event.stopPropagation();
    
    try {
        showToast("Gerando PDF...", "info");
        const token = localStorage.getItem('token');
        
        // 1. Busca os dados
        const res = await fetch(`https://deploy-render-5o3w.onrender.com/api/formularios/${formId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error("Erro ao baixar dados.");
        const formCompleto = await res.json();
        const data = formCompleto.dadosRNC || formCompleto;

        // 2. Configura o jsPDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4'); 
        
        // Configurações de geometria
        const leftMargin = 10;
        const rightMargin = 200; // Limite direito (A4 width é ~210)
        const contentWidth = 190;
        let y = 10; // Cursor vertical inicial
        
        // Configurações de Fonte
        const setFontLabel = () => { doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(0); };
        const setFontValue = () => { doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(0); };
        const setFontTitle = () => { doc.setFontSize(12); doc.setFont('helvetica', 'bold'); };

        // --- FUNÇÃO AUXILIAR: DESENHAR CAIXA DE CAMPO ---
        // Desenha um retângulo com o Label pequeno em cima e o Valor dentro
        function drawField(x, y, w, h, label, value) {
            doc.setDrawColor(0); // Preto
            doc.setLineWidth(0.1);
            doc.rect(x, y, w, h); // Borda
            
            // Label
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.text(label.toUpperCase(), x + 1, y + 3.5);
            
            // Valor (com quebra de linha se necessário)
            if (value) {
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                // Calcula espaço disponível para texto (altura total - espaço do label)
                const textY = y + 8;
                const maxTextWidth = w - 4;
                
                // Quebra o texto para caber na largura
                const lines = doc.splitTextToSize(String(value), maxTextWidth);
                
                // Imprime as linhas (corta se passar da altura da caixa)
                let lineY = textY;
                lines.forEach(line => {
                    if (lineY < y + h - 2) { // Só imprime se couber na caixa
                        doc.text(line, x + 2, lineY);
                        lineY += 4; // Espaçamento entre linhas
                    }
                });
            }
        }

        // --- FUNÇÃO AUXILIAR: CHECKBOX ---
        function drawCheckbox(x, y, label, isChecked) {
            doc.rect(x, y, 4, 4); // Caixinha
            if (isChecked) {
                doc.setFontSize(8);
                doc.text('X', x + 0.5, y + 3); // Marca o X
            }
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text(label, x + 6, y + 3); // Texto ao lado
            return x + 40; // Retorna nova posição X (largura da coluna)
        }

        // ==========================================
        // === 1. CABEÇALHO (LOGO, TÍTULO, Nº) ===
        // ==========================================
        
        // Caixa Logo (Esq)
        doc.rect(leftMargin, y, 30, 20);
        try {
            // Tenta carregar logo se existir
            const logoResp = await fetch('logo_ccs.png');
            if (logoResp.ok) {
                const blob = await logoResp.blob();
                const b64 = await toBase64(blob);
                doc.addImage(b64, 'PNG', leftMargin + 2, y + 2, 26, 16);
            } else {
                doc.setFontSize(8); doc.text("LOGO", leftMargin + 8, y + 10);
            }
        } catch(e){}

        // Caixa Título (Centro)
        doc.rect(leftMargin + 30, y, 130, 20);
        doc.setFontSize(14); doc.setFont('helvetica', 'bold');
        doc.text('RNC - RELATÓRIO DE NÃO CONFORMIDADE', leftMargin + 45, y + 12);

        // Caixa Número (Dir)
        drawField(leftMargin + 160, y, 30, 20, "Nº RNC", data.numero_rnc || formCompleto.numero_sequencial);
        
        y += 20; // Pula linha

        // ==========================================
        // === 2. DATAS ===
        // ==========================================
        drawField(leftMargin, y, 95, 10, "Data de Abertura", data.data_abertura);
        drawField(leftMargin + 95, y, 95, 10, "Data de Fechamento", data.data_fechamento);
        y += 10;

        // ==========================================
        // === 3. ORIGEM (ATUALIZADO PARA SELECT) ===
        // ==========================================
        
        // Removemos a lógica de checkbox antiga e usamos drawField
        // Isso permite que qualquer texto vindo do Select ou do Input "Outro" apareça corretamente
        
        // Ajuste a altura (15) conforme necessário se os textos forem muito longos
        drawField(leftMargin, y, contentWidth, 15, "Origem da Não Conformidade", data.origem);
        
        y += 15; // Pula o espaço da caixa (15 de altura)

        // ==========================================
        // === 4. RESPONSÁVEL ===
        // ==========================================
        const wResp = contentWidth / 4;
        drawField(leftMargin, y, wResp, 10, "Responsável", data.responsavel_nome);
        drawField(leftMargin + wResp, y, wResp, 10, "Cargo", data.responsavel_cargo);
        drawField(leftMargin + (wResp*2), y, wResp, 10, "Setor", data.responsavel_setor);
        drawField(leftMargin + (wResp*3), y, wResp, 10, "Matrícula", data.responsavel_matricula);
        y += 10;

        // ==========================================
        // === 5. ANÁLISE ===
        // ==========================================
        // Título visual da seção
        doc.setFillColor(230, 230, 230); // Cinza
        doc.rect(leftMargin, y, contentWidth, 5, 'F');
        doc.rect(leftMargin, y, contentWidth, 5); // Borda
        doc.setFontSize(9); doc.text("ANÁLISE", leftMargin + 2, y + 3.5);
        y += 5;

        // Campos grandes de texto
        drawField(leftMargin, y, contentWidth, 25, "Descrição da Ocorrência", data.desc_ocorrencia);
        y += 25;
        drawField(leftMargin, y, contentWidth, 25, "Causas Prováveis / Não Conformidade", data.desc_nao_conformidade);
        y += 25;
        drawField(leftMargin, y, contentWidth, 10, "Referências Normativas", data.referencias_normativas);
        y += 10;

        // ==========================================
        // === 6. PLANO DE AÇÃO ===
        // ==========================================
        doc.setFillColor(230, 230, 230);
        doc.rect(leftMargin, y, contentWidth, 5, 'F');
        doc.rect(leftMargin, y, contentWidth, 5);
        doc.setFontSize(9); doc.text("TOMADA DE AÇÕES", leftMargin + 2, y + 3.5);
        y += 5;

        // Ações Corretivas
        drawField(leftMargin, y, 140, 20, "Ações Corretivas", data.acoes_corretivas);
        drawField(leftMargin + 140, y, 50, 20, "Responsável", data.responsavel_acoes);
        y += 20;

        // Ações Preventivas
        drawField(leftMargin, y, 140, 20, "Ações Preventivas", data.acoes_preventivas);
        drawField(leftMargin + 140, y, 50, 20, "Responsável", data.responsavel_acoes_prev);
        y += 20;

        // ==========================================
        // === 7. REGISTRO ICONOGRÁFICO (IMAGENS) ===
        // ==========================================
        
        // Verifica se cabe na página, senão cria nova
        if (y > 220) { doc.addPage(); y = 10; }

        doc.setFillColor(230, 230, 230);
        doc.rect(leftMargin, y, contentWidth, 5, 'F');
        doc.rect(leftMargin, y, contentWidth, 5);
        doc.setFontSize(9); doc.text("REGISTRO ICONOGRÁFICO", leftMargin + 2, y + 3.5);
        y += 5;

        // Caixa grande para as imagens
        const imageHeight = 80; 
        doc.rect(leftMargin, y, contentWidth, imageHeight);
        
        if (data.registrosIconograficos && data.registrosIconograficos.length > 0) {
            let imgX = leftMargin + 5;
            // Pega até 2 imagens para não estourar o layout lado a lado
            const qtdImagens = Math.min(data.registrosIconograficos.length, 2); 
            
            for (let i = 0; i < qtdImagens; i++) {
                const img = data.registrosIconograficos[i];
                if (img.imagemBase64) {
                    try {
                        // Renderiza a imagem
                        doc.addImage(img.imagemBase64, 'JPEG', imgX, y + 5, 85, 60);
                        
                        // Legenda da imagem
                        doc.setFontSize(8);
                        doc.text(`Img ${i+1}: ${img.descricao || ''}`, imgX, y + 70);
                        
                        imgX += 90; // Move para a direita para a próxima foto
                    } catch (err) {
                        console.error("Erro na imagem PDF", err);
                    }
                }
            }
        } else {
            doc.setFontSize(9);
            doc.setTextColor(150);
            doc.text("Nenhuma imagem registrada.", leftMargin + 80, y + 40);
            doc.setTextColor(0);
        }

        // ==========================================
        // === 8. ASSINATURAS (RODAPÉ) ===
        // ==========================================
        const pageHeight = doc.internal.pageSize.getHeight();
        y = pageHeight - 30; // Fixa no final da página

        doc.line(leftMargin, y, leftMargin + 80, y);
        doc.line(leftMargin + 100, y, leftMargin + 180, y);
        
        doc.setFontSize(8);
        doc.text("Responsável pela Emissão", leftMargin, y + 5);
        doc.text("Gestão da Qualidade", leftMargin + 100, y + 5);

        // Salvar
        doc.save(`RNC_${data.numero_rnc || 'Relatorio'}.pdf`);
        showToast("PDF gerado com sucesso!", "success");

    } catch (e) {
        console.error(e);
        showToast("Erro ao gerar PDF: " + e.message, "error");
    }
}

// ==========================================================
// === NOVA FUNÇÃO: RELATÓRIO MENSAL (COM SELEÇÃO DE DATA) ===
// ==========================================================
async function generateMonthlyReportPDF() {
    try {
        // 1. Pergunta ao usuário qual mês deseja
        const now = new Date();
        const mesAtualStr = String(now.getMonth() + 1).padStart(2, '0');
        const anoAtual = now.getFullYear();
        
        const input = prompt("Informe o mês e ano para o relatório (MM/AAAA):", `${mesAtualStr}/${anoAtual}`);
        
        if (!input) return; // Se cancelar, para tudo.

        // Validação simples da data
        const partes = input.split('/');
        if (partes.length !== 2) {
            alert("Formato inválido. Use MM/AAAA (ex: 12/2025)");
            return;
        }

        const selectedMonth = parseInt(partes[0]) - 1; // JS usa 0-11 para meses
        const selectedYear = parseInt(partes[1]);
        const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

        showToast(`Gerando Relatório de ${monthNames[selectedMonth]}...`, "info");
        
        // 2. Filtra os dados
        const allForms = formsManager.getAllForms();
        
        const formsDoMes = allForms.filter(f => {
            const fDate = new Date(f.createdAt);
            // Compara Ano e Mês (ignorando fuso horário para simplificar, usando métodos locais)
            return fDate.getMonth() === selectedMonth && fDate.getFullYear() === selectedYear;
        });

        // Calcula Estatísticas
        const stats = {
            total: formsDoMes.length,
            concluidos: formsDoMes.filter(f => f.status === 'completed').length,
            pendentes: formsDoMes.filter(f => f.status === 'pending').length,
            rascunhos: formsDoMes.filter(f => f.status === 'draft').length
        };

        // 3. Configura o PDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4'); 
        let y = 20; 

        // Cabeçalho e Logo
        try {
            const logoResp = await fetch('logo_ccs.png');
            if (logoResp.ok) {
                const blob = await logoResp.blob();
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = function() {
                    const base64data = reader.result;
                    doc.addImage(base64data, 'PNG', 15, 10, 25, 25);
                }
                await new Promise(r => setTimeout(r, 100)); 
            }
        } catch(e){}

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text("RELATÓRIO MENSAL DE SST", 50, 20);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Período: ${monthNames[selectedMonth]} de ${selectedYear}`, 50, 28);
        doc.text(`Gerado em: ${now.toLocaleDateString('pt-BR')}`, 50, 34);

        y += 30;

        // Caixas de Estatísticas
        const boxWidth = 40;
        const boxHeight = 25;
        const gap = 10;
        let x = 15;

        const drawStatBox = (title, value, colorRGB) => {
            doc.setDrawColor(200);
            doc.setFillColor(...colorRGB); 
            doc.rect(x, y, boxWidth, boxHeight, 'F'); 
            doc.rect(x, y, boxWidth, boxHeight); 
            
            doc.setTextColor(255); 
            doc.setFontSize(10);
            doc.text(title, x + (boxWidth/2), y + 8, { align: 'center' });
            
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text(String(value), x + (boxWidth/2), y + 18, { align: 'center' });
            
            x += boxWidth + gap;
        };

        drawStatBox("TOTAL", stats.total, [52, 73, 94]);      
        drawStatBox("CONCLUÍDOS", stats.concluidos, [40, 167, 69]); 
        drawStatBox("PENDENTES", stats.pendentes, [255, 193, 7]);   
        doc.setTextColor(50); 
        
        y += 40;

        // Lista de Itens
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text("Detalhamento dos Registros", 15, y);
        y += 8;

        // Cabeçalho da Tabela
        doc.setFillColor(230);
        doc.rect(15, y, 180, 8, 'F');
        doc.setFontSize(9);
        doc.text("Data", 18, y + 5);
        doc.text("Título", 45, y + 5);
        doc.text("Ocorrência", 72, y + 5);
        doc.text("Status", 150, y + 5);
        doc.text("Responsável", 175, y + 5);
        y += 10;

        doc.setFont('helvetica', 'normal');
        
        if (formsDoMes.length === 0) {
            doc.text("Nenhum registro encontrado neste período.", 15, y);
        } else {
            formsDoMes.forEach((form, index) => {
                if (index % 2 === 0) {
                    doc.setFillColor(250);
                    doc.rect(15, y-3, 180, 8, 'F');
                }

                const dataCriacao = new Date(form.createdAt).toLocaleDateString('pt-BR');
                let titulo = form.titulo || "Sem Título";
                if(titulo.length > 50) titulo = titulo.substring(0, 47) + "...";
                
                let ocorr = form.dadosRNC?.origem || "Não Informado";
                let statusPt = form.status === 'completed' ? 'Concluído' : (form.status === 'pending' ? 'Pendente' : 'Rascunho');
                let resp = form.criado_por?.nome || '-';
                if(resp.length > 15) resp = resp.substring(0, 15) + ".";

                doc.text(dataCriacao, 18, y + 2);
                doc.text(titulo, 45, y + 2);
                doc.text(ocorrencia, 72, y + 2);
                doc.text(statusPt, 150, y + 2);
                doc.text(resp, 175, y + 2);
                
                y += 8;

                if (y > 270) {
                    doc.addPage();
                    y = 20;
                }
            });
        }

        // Rodapé
        const pageCount = doc.internal.getNumberOfPages();
        for(let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Página ${i} de ${pageCount}`, 190, 285, { align: 'right' });
        }

        doc.save(`Relatorio_${monthNames[selectedMonth]}_${selectedYear}.pdf`);
        showToast("Download iniciado!", "success");

    } catch (e) {
        console.error(e);
        showToast("Erro ao gerar relatório.", "error");
    }
}