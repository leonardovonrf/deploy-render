import jwt from 'jsonwebtoken';
import Usuario from '../models/Usuario.js';

// 1. PROTECT: Verifica se o usuário está logado (Autenticação)
const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Pega o token (remove o 'Bearer ')
            token = req.headers.authorization.split(' ')[1];
            
            // Decodifica
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Busca o usuário e anexa ao request (sem a senha)
            req.usuario = await Usuario.findById(decoded.id).select('-senha_hash');
            
            if (req.usuario) {
                next();
            } else {
                 res.status(401).json({ message: 'Não autorizado, usuário não encontrado' });
            }
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Não autorizado, token inválido' });
        }
    } else {
        res.status(401).json({ message: 'Não autorizado, sem token' });
    }
};

// 2. AUTHORIZE: Verifica se o cargo tem permissão (Autorização)
// Aceita múltiplos cargos, ex: authorize('admin', 'supervisor')
const authorize = (...roles) => {
    return (req, res, next) => {
        // Verifica se o usuário existe e se o cargo dele está na lista permitida
        // Aceitamos 'admin' (inglês) ou 'administrador' (português) para garantir compatibilidade
        if (!req.usuario || !roles.includes(req.usuario.role)) {
            return res.status(403).json({ 
                message: `Acesso negado. O cargo '${req.usuario ? req.usuario.role : 'desconhecido'}' não tem permissão.` 
            });
        }
        next();
    };
};

export { protect, authorize };