import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { ACCESS_TOKEN_EXPIRE, ACCESS_TOKEN_SECRET, REFRESH_TOKEN_EXPIRE, REFRESH_TOKEN_SECRET } from '../secrets';
import { expiredFormat } from '../libs/utils/jwt';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

export class UserEntity {
    id: string;
    name: string;
    email: string;
    password: string;
    avatar?: string;
    roles?: [];
    role?: any;

    constructor(user: any) {
        this.id = user.id;
        this.name = user.name;
        this.email = user.email;
        this.password = user.password;
        this.avatar = user.avatar;
        this.roles = user.roles;
        this.role = user.role;
    }

    async comparePassword(inputPassword: string): Promise<boolean> {
        return await bcrypt.compare(inputPassword, this.password);
    }

    signAccessToken(): string {
        return jwt.sign({ id: this.id }, ACCESS_TOKEN_SECRET, { expiresIn: expiredFormat(ACCESS_TOKEN_EXPIRE) })
    }

    signRefreshToken(): string {
        return jwt.sign({ id: this.id }, REFRESH_TOKEN_SECRET, { expiresIn: expiredFormat(REFRESH_TOKEN_EXPIRE) });
    }

    cleanUser() {
        const { password, ...userWithoutPassword } = this; // Exclure le mot de passe
        return userWithoutPassword; // Retourner l'objet sans le mot de passe
    }
}