import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

export function signToken(payload: object) {
    return jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: '1h'});

}
export function verifyToken(token: string) {
    return jwt.verify(token, process.env.JWT_SECRET as string);

}
export function hashPassword(password: string){
    return bcrypt.hash(password,10);
}
export function comparePassword( password: string, hash: string){
    return bcrypt.compare(password, hash);
}