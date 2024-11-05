import jwt from 'jsonwebtoken';
export const APP_SECRET = 'secret';
async function authenticateUser(prisma, request) {
    const authHeader = request.headers.authorization;
    if (authHeader) {
        try {
            const token = authHeader.split(' ')[1];
            const { verify } = jwt;
            const tokenPayload = verify(token, APP_SECRET);
            if (tokenPayload && tokenPayload.userId) {
                return await prisma.user.findUnique({
                    where: {
                        id: tokenPayload.userId.toString(),
                    }
                });
            }
        }
        catch (error) {
            console.error("Error verifying token", error);
            return null;
        }
    }
    return null;
}
export default authenticateUser;
