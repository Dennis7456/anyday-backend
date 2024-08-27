declare module 'jsonwebtoken';
declare module 'bcryptjs';
declare module 'nodemailer'
declare module 'uuid'
declare module '*.graphql' {
    import { DocumentNode } from 'graphql';
    const value: DocumentNode;
    export default value;
}
