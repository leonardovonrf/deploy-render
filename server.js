import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

// Importa os arquivos de rotas
import usuarioRoutes from './routes/rota_usuario.js';
import formularioRoutes from './routes/rota_formulario.js';

// Carrega as variáveis de ambiente (do arquivo .env)
dotenv.config();

// Inicializa o aplicativo Express
const app = express();
// Define a porta. Pega do .env ou usa 5000 como padrão
const PORT = process.env.PORT || 5000;

// === Configuração de Middlewares ===

// 1. CORS: Permite que seu frontend (hospedado em outro lugar)
//    faça requisições para esta API.
app.use(cors()); 

// 2. JSON Parser: Permite que o Express entenda
//    o JSON enviado no corpo (body) das requisições POST e PUT.
app.use(express.json({ limit: '50mb' })); // Aumenta o limite para aceitar imagens Base64

// 3. URL Encoded Parser (para formulários HTML, se necessário)
app.use(express.urlencoded({ limit: '50mb', extended: true }));


// === Definição das Rotas da API ===

// Direciona todo o tráfego de '/api/usuarios' para o arquivo 'usuarioRoutes'
app.use('/api/usuarios', usuarioRoutes);

// Direciona todo o tráfego de '/api/formularios' para o arquivo 'formularioRoutes'
app.use('/api/formularios', formularioRoutes);


// === Conexão com o Banco de Dados e Inicialização do Servidor ===

const connectDB = async () => {
    try {
        // Conecta-se ao MongoDB usando a string do arquivo .env
        await mongoose.connect(process.env.MONGO_URI);
        
        console.log('MongoDB conectado com sucesso.');

        // IMPORTANTE: Só inicia o servidor DEPOIS que a conexão
        // com o banco de dados for bem-sucedida.
        app.listen(PORT, () => {
            console.log(`Servidor rodando na porta ${PORT}.`);
        });

    } catch (error) {
        // Se a conexão com o banco falhar, o servidor não inicia.
        console.error('Falha ao conectar ao MongoDB:', error.message);
        process.exit(1); // Encerra o processo com falha
    }
};

// Chama a função para conectar ao banco e iniciar o servidor
connectDB();