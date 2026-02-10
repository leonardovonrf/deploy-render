import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Usuario from '../models/Usuario.js';

const router = express.Router();


// =================================================
// ROTA 1: CRIAR USUÁRIO (POST /)
// É essa que você está tentando usar no Thunder Client agora
// =================================================
router.post('/', async (req, res) => {
    try {
        const { nome, email, senha, role } = req.body;

        // Validação
        if (!nome || !email || !senha) {
            return res.status(400).json({ message: 'Por favor, envie nome, email e senha.' });
        }

        // Verifica se já existe
        const usuarioExistente = await Usuario.findOne({ email: email });
        if (usuarioExistente) {
            return res.status(400).json({ message: 'Este e-mail já está cadastrado.' });
        }

        // Criptografa a senha
        const salt = await bcrypt.genSalt(10);
        const senha_hash = await bcrypt.hash(senha, salt);

        // Cria o usuário
        const novoUsuario = new Usuario({
            nome,
            email,
            senha_hash,
            role
        });

        await novoUsuario.save();

        res.status(201).json({
            _id: novoUsuario._id,
            nome: novoUsuario.nome,
            email: novoUsuario.email,
            role: novoUsuario.role
        });

    } catch (err) {
        console.error("Erro ao criar usuário:", err);
        res.status(500).json({ message: 'Erro no servidor' });
    }
});

// =================================================
// ROTA 2: LOGIN (POST /login)
// É essa que o seu site usa
// =================================================
router.post('/login', async (req, res) => {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({ message: 'Por favor, envie email e senha.' });
        }

        const usuario = await Usuario.findOne({ email: email });
        if (!usuario) {
            return res.status(401).json({ message: 'Email ou senha inválidos' });
        }

        const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);
        if (!senhaCorreta) {
            return res.status(401).json({ message: 'Email ou senha inválidos' });
        }

        const token = jwt.sign(
            { id: usuario._id, role: usuario.role },
            process.env.JWT_SECRET || 'segredo',
            { expiresIn: '1d' }
        );

        res.status(200).json({
            id: usuario._id,
            name: usuario.nome,
            email: usuario.email,
            role: usuario.role,
            token: token
        });

    } catch (err) {
        console.error("Erro no login:", err);
        res.status(500).json({ message: 'Erro no servidor ao fazer login' });
    }
});

// =================================================
// ROTA 3: LISTAR USUÁRIOS (GET /)
// =================================================
router.get('/lista', async (req, res) => {
  try {
    const usuarios = await Usuario.find().select('-senha_hash');
    res.status(200).json(usuarios);
  } catch (err) {
    console.error("Erro ao buscar usuários:", err);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});


// =================================================
// ROTA 4: BUSCAR USUÁRIO POR ID (GET /:id)
// =================================================
router.get('/pet:id', async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id).select('-senha_hash');

    if (!usuario) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    res.status(200).json(usuario);
  } catch (err) {
    console.error("Erro ao buscar usuário:", err);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// =================================================
// ROTA PUT: ATUALIZAR USUÁRIO (PUT /:id)
// =================================================
router.put('/:id', async (req, res) => {
  try {
    const { nome, email, senha, role } = req.body;

    const usuario = await Usuario.findById(req.params.id);
    if (!usuario) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Atualiza apenas o que foi enviado
    if (nome) usuario.nome = nome;
    if (email) usuario.email = email;
    if (role) usuario.role = role;

    // Se quiser trocar a senha
    if (senha) {
      const salt = await bcrypt.genSalt(10);
      usuario.senha_hash = await bcrypt.hash(senha, salt);
    }

    await usuario.save();

    res.status(200).json({
      message: 'Usuário atualizado com sucesso',
      usuario: {
        id: usuario._id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role
      }
    });
  } catch (err) {
    console.error("Erro ao atualizar usuário:", err);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// =================================================
// ROTA DELETE: DELETAR USUÁRIO (DELETE /:id)
// =================================================
router.delete('/:id', async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id);

    if (!usuario) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    await usuario.deleteOne();

    res.status(200).json({ message: 'Usuário removido com sucesso' });
  } catch (err) {
    console.error("Erro ao deletar usuário:", err);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});



export default router;