import mongoose from 'mongoose';
const { Schema, model } = mongoose;

// Este é o schema para as imagens (aninhado)
const ImagemSchema = new Schema({
    imagemBase64: { type: String, required: true },
    descricao: { type: String }
});

// Este é o schema para os dados do RNC (aninhado)
const DadosRNCSchema = new Schema({
    numero_rnc: { type: String },
    data_abertura: { type: String },
    data_fechamento: { type: String },
    origem: { type: String },
    responsavel_nome: { type: String },
    responsavel_cargo: { type: String },
    responsavel_setor: { type: String },
    responsavel_matricula: { type: String },
    desc_ocorrencia: { type: String },
    desc_nao_conformidade: { type: String },
    referencias_normativas: { type: String },
    acoes_corretivas: { type: String },
    responsavel_acoes: { type: String }, // Mudei de "responsavel-acoes-corretivas"
    acoes_preventivas: { type: String },
    responsavel_acoes_prev: { type: String }, // Mudei de "responsavel-acoes-preventivas"
    registrosIconograficos: [ImagemSchema] // Uma lista de imagens
});

// Este é o modelo principal do formulário
const formularioSchema = new Schema(
    {
        // ID numérico apenas para situar o usuário
        numero_sequencial: { type: Number },
        titulo: { type: String, required: true },

        // Metadados para o dashboard
        titulo: { type: String, required: true },
        descricao: { type: String },
        status: { type: String, required: true, default: 'pending' },
        tipo: { type: String, required: true, default: 'RNC' },
        
        // Relacionamento: Quem criou este formulário?
        criado_por: {
            type: Schema.Types.ObjectId, // Link para o 'id' de um Usuário
            ref: 'Usuario'              // Referencia o modelo 'Usuario'
        },

        atualizado_por: {
            type: Schema.Types.ObjectId,
            ref: 'Usuario'
        },
        
        // Dados aninhados
        dadosRNC: {
            type: DadosRNCSchema, // Usa o schema aninhado que definimos acima
            required: true
        }
    },
    {
        timestamps: true // Cria createdAt e updatedAt
    }
);

export default model('Formulario', formularioSchema);