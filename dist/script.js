"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function app() {
    // const newUser = await prisma.user.create({
    //   data: {
    //     id: 1,
    //     firstName: 'John',
    //     lastName: 'Doe',
    //     userName: 'johndoe23',
    //     email: 'johndoe23@mail.com',
    //     dateOfBirth: '13-03-1987',
    //     password: 'password',
    //   },
    // });
    const allUsers = await prisma.user.findMany();
    const oneUser = await prisma.user.findUnique({
        where: {
            id: "1",
        },
    });
    //console.log(allUsers);
    console.log(oneUser);
}
app()
    .catch((e) => {
    throw e;
})
    .finally(async () => {
    await prisma.$disconnect;
});
