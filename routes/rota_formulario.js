import express from 'express';
import Formulario from '../models/formulario.js';
import Usuario from '../models/Usuario.js';
import Contador from '../models/contador.js'; 
import { protect, authorize } from '../middleware/authMiddleware.js'; // <--- IMPORTANTE

const router = express.Router();

// Rota GET: Todos podem ver (desde que logados)
router.get('/', protect, async (req, res) => {
    try {
        const { ordem } = req.query;
        const sortDirection = ordem === 'antigos' ? 1 : -1;

        const formularios = await Formulario.find()
            .populate('criado_por', 'nome')
            .populate('atualizado_por', 'nome')
            .sort({ createdAt: sortDirection });

        res.json(formularios);
    } catch (err) {
        res.status(500).json({ message: "Erro ao buscar formulários" });
    }
});

// Rota GET ID: Todos podem ver
router.get('/:id', protect, async (req, res) => {
    try {
        const formulario = await Formulario.findById(req.params.id)
            .populate('criado_por', 'nome')
            .populate('atualizado_por', 'nome');
        
        if (!formulario) return res.status(404).json({ message: 'Não encontrado' });
        res.json(formulario);
    } catch (err) {
        res.status(500).json({ message: 'Erro ao buscar' });
    }
});

// Rota POST: Todos (Admin, Estagiário, Usuário) podem criar
router.post('/', protect, async (req, res) => {
    try {
        const { titulo, descricao, status, tipo, dadosRNC } = req.body;

        // --- CONTADOR AUTOMÁTICO ---
        const contador = await Contador.findOneAndUpdate(
            { id: "rnc_seq" },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        const novoNumero = contador.seq;

        // Mapeamento dos dados
        const dadosMapeados = {
            numero_rnc: novoNumero.toString(),
            data_abertura: dadosRNC.dataAbertura,
            data_fechamento: dadosRNC.dataFechamento,
            origem: dadosRNC.origem,
            responsavel_nome: dadosRNC.responsavel?.nome,
            responsavel_cargo: dadosRNC.responsavel?.cargo,
            responsavel_setor: dadosRNC.responsavel?.setor,
            responsavel_matricula: dadosRNC.responsavel?.matricula,
            desc_ocorrencia: dadosRNC.analise?.descricaoOcorrencia,
            desc_nao_conformidade: dadosRNC.analise?.descricaoNaoConformidade,
            referencias_normativas: dadosRNC.analise?.referenciasNormativas,
            acoes_corretivas: dadosRNC.acoes?.corretivas,
            responsavel_acoes: dadosRNC.acoes?.responsavelCorretivas,
            acoes_preventivas: dadosRNC.acoes?.preventivas,
            responsavel_acoes_prev: dadosRNC.acoes?.responsavelPreventivas,
            registrosIconograficos: dadosRNC.registrosIconograficos
        };

        const novoFormulario = new Formulario({
            numero_sequencial: novoNumero,
            titulo: `RNC #${novoNumero}`,
            descricao,
            status,
            tipo,
            criado_por: req.usuario._id, // <--- PEGA AUTOMATICAMENTE DO TOKEN
            dadosRNC: dadosMapeados
        });

        const formularioSalvo = await novoFormulario.save();
        res.status(201).json(formularioSalvo);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erro ao salvar' });
    }
});

// Rota PUT: Todos podem editar (Histórico corrigido)
router.put('/:id', protect, async (req, res) => {
    try {
        const { titulo, descricao, status, dadosRNC } = req.body;

        const updateData = {
            titulo,
            descricao,
            status,
            atualizado_por: req.usuario._id // <--- GRAVA QUEM EDITOU (DO TOKEN)
        };

        if (dadosRNC) {
            updateData.dadosRNC = {
                numero_rnc: dadosRNC.numero,
                data_abertura: dadosRNC.dataAbertura,
                data_fechamento: dadosRNC.dataFechamento,
                origem: dadosRNC.origem,
                responsavel_nome: dadosRNC.responsavel?.nome,
                responsavel_cargo: dadosRNC.responsavel?.cargo,
                responsavel_setor: dadosRNC.responsavel?.setor,
                responsavel_matricula: dadosRNC.responsavel?.matricula,
                desc_ocorrencia: dadosRNC.analise?.descricaoOcorrencia,
                desc_nao_conformidade: dadosRNC.analise?.descricaoNaoConformidade,
                referencias_normativas: dadosRNC.analise?.referenciasNormativas,
                acoes_corretivas: dadosRNC.acoes?.corretivas,
                responsavel_acoes: dadosRNC.acoes?.responsavelCorretivas,
                acoes_preventivas: dadosRNC.acoes?.preventivas,
                responsavel_acoes_prev: dadosRNC.acoes?.responsavelPreventivas,
                registrosIconograficos: dadosRNC.registrosIconograficos
            };
        }

        const formularioAtualizado = await Formulario.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true } 
        );

        if (!formularioAtualizado) return res.status(404).json({ message: 'Não encontrado.' });
        res.json(formularioAtualizado);

    } catch (err) {
        res.status(500).json({ message: 'Erro ao atualizar' });
    }
});

// Rota DELETE: APENAS ADMIN PODE
// Aceitamos 'admin' ou 'administrador'
router.delete('/:id', protect, authorize('admin', 'administrador'), async (req, res) => {
    try {
        const formulario = await Formulario.findById(req.params.id);
        if (!formulario) return res.status(404).json({ message: 'Não encontrado.' });
        
        await formulario.deleteOne();
        res.status(200).json({ message: 'Excluído com sucesso.' });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao deletar' });
    }
});

// Rota Relatório Mensal
router.get('/relatorio/mensal', protect, async (req, res) => {
    try {
        const dataAtual = new Date();
        const primeiroDia = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 1);
        const ultimoDia = new Date(dataAtual.getFullYear(), dataAtual.getMonth() + 1, 0);
        ultimoDia.setHours(23, 59, 59, 999);

        const formularios = await Formulario.find({
            createdAt: { $gte: primeiroDia, $lte: ultimoDia }
        }).populate('criado_por', 'nome').sort({ createdAt: 'desc' });

        res.json(formularios);
    } catch (err) {
        res.status(500).json({ message: "Erro ao gerar relatório" });
    }
});

export default router;
