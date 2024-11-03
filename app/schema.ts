import { makeExecutableSchema } from '@graphql-tools/schema';
import { GraphQLContext } from './context';
import typeDefs from './schema.graphql';
import { User, Order, Payment, Review, Assignment, Role, PaymentStatus } from '.prisma/client';
import { compare, hash } from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import { bucket, storage } from './index';
import { APP_SECRET } from './auth';
import { v4 as uuidv4 } from 'uuid';
import redisClient from './redisClient';
import { isEmail } from 'validator';
import { emit } from 'process';
import fs from 'fs';
// import { sendVerificationEmail } from './sendVerificationEmail';
import { sendVerificationEmail } from './sendVerificationEmail';
import { sendOrderSuccessEmail } from './sendOrderSuccessEmail';
import { RegisterOrderInput, RegisterOrderResponse, CreateStudentInput, CreateOrderInput, AttachFilesInput } from './types'
import { OrderStatus } from '.prisma/client';

const REGISTER_EXPIRATION = 3600; // 1 hour expiration
const baseUrl = process.env.BASE_URL || "https://anyday-frontend.web.app"

const users: User[] = [
  {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    userName: 'johndoe23',
    email: 'johndoe23@mail.com',
    phoneNumber: '+5138888888',
    dateOfBirth: '1987-03-13',
    password: 'password',
    role: Role.STUDENT,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    firstName: 'Jane',
    lastName: 'Doe',
    userName: 'janedoe23',
    email: 'janedoe23@mail.com',
    phoneNumber: '+5138888888',
    dateOfBirth: '1997-05-10',
    password: 'password',
    role: Role.STUDENT,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const resolvers = {
  Query: {
    users: async (_: unknown, __: {}, context: GraphQLContext) => {
      return context.prisma.user.findMany();
    },
    user: async (_: unknown, { id }: { id: number }, context: GraphQLContext) => {
      return context.prisma.user.findUnique({
        where: { id },
      });
    },
    loggedInUser: (_: unknown, __: {}, context: GraphQLContext) => {
      if (!context.currentUser) {
        throw new Error('Please login');
      }
      return context.currentUser;
    },
    orders: async (_: unknown, __: {}, context: GraphQLContext) => {
      if (!context.currentUser) {
        throw new Error('Authentication required');
      }
      return context.prisma.order.findMany({
        where: {studentId: context.currentUser.id},
        include: {
          uploadedFiles: true 
        }
      });
    },
    order: async (_: unknown, { id }: { id: number }, context: GraphQLContext) => {
      // if (!context.currentUser) {
      //   throw new Error('Authentication required');
      // }
      return context.prisma.order.findUnique({
        where: { id },
      });
    },
  },
  Mutation: {
    updateOrderStatus: async (_:unknown, { orderId, status}: {orderId:number; status: OrderStatus}, context: GraphQLContext) => {
      //Update order status in the database
      const updatedOrder = await context.prisma.order.update({
        where: { id : orderId },
        data: { status },
      });

      return updatedOrder;
    },
    registerAndCreateOrder: async (
      _: unknown,
      // { email, paperType, pages, dueDate
      { input }: { input: RegisterOrderInput }
    ): Promise<RegisterOrderResponse> => {

      const verificationToken = uuidv4();

      //store initial data in redis
      await redisClient.setEx(
        verificationToken,
        REGISTER_EXPIRATION,
        JSON.stringify({
          email: input.email,
          paperType: input.paperType,
          pages: input.pages,
          dueDate: input.dueDate
        })
      );

      await sendVerificationEmail(input.email, verificationToken);

      return { success: true, message: "Verification Email Sent.", verificationToken: verificationToken };
    },

    verifyEmail: async (_: unknown,
      { token }: { token: string }): Promise<{ valid: boolean; message: string; redirectUrl: string; token: string; }> => {
      const cachedData = await redisClient.get(token);

      if (!cachedData) {
        return { valid: false, message: 'Invalid or expired token.', redirectUrl: '#', token: '' };
      }

      // Data is valid, proceed to verification
      return { valid: true, message: 'Email verified. Please complete your registration.', redirectUrl: `${baseUrl}/complete-registration`, token: token };
    },

    completeRegistration: async (
      _: unknown,
      { token }: { token: string }
    ): Promise<{ valid: boolean; message: string }> => {

      // Retrieve and parse cached data
      const cachedData = await redisClient.get(token);

      if (!cachedData) {
        throw new Error("Invalid or expired token");
      }

      // Parse cached data
      const { email, paperType, pages, dueDate } = JSON.parse(cachedData);

      // Complete user registration
      // const newUser = await createUser({ email });

      // Create a new order
      // const newOrder = await createOrder({
      //   userId: newUser.id,
      //   paperType,
      //   pages,
      //   dueDate
      // });

      // Optionally, delete the token from Redis after successful registration
      await redisClient.del(token);

      return {
        valid: true,
        message: "Registration complete and order created."
      };
    },

    createStudent: async (
      _: unknown,
      { input }: { input: CreateStudentInput },
      context: GraphQLContext
    ): Promise<User> => {
      const { firstName, lastName, email, phoneNumber, dateOfBirth, password } = input;
      // Validate input fields
      if (!firstName || !lastName || !email || !phoneNumber || !dateOfBirth || !password) {
        throw new Error("All fields are required.");
        console.log("error")
      }

      const userName = `${firstName.toLowerCase()}_${lastName.toLowerCase()}_${Math.floor(Math.random() * 10000)}`;

      const hashedPassword = await hash(password, 10);
      try {
        const student = await context.prisma.user.create({
          data: {
            firstName,
            lastName,
            userName,
            email,
            phoneNumber,
            dateOfBirth,
            password: hashedPassword,
            role: "STUDENT",
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        return student;
      } catch (error) {
        console.error("Database error:", error);
        throw new Error("An error occurred while creating the student.");
      }
    },

    // createOrder: async (
    //   _: unknown,
    //   { input }: { input: CreateOrderInput },
    //   context: GraphQLContext
    // ) => {
    //   const { studentId, instructions, paperType, numberOfPages, dueDate, uploadedFiles } = input;

    //   //Validate input fields
    //   if (!instructions || !paperType || !numberOfPages || !dueDate) {
    //     console.error("Validation error: Missing required fields.");
    //     return {
    //       success: false,
    //       message: "All fields are required.",
    //       order: null,
    //     };
    //   }

    //   const base64ToBuffer = (base64: string, contentType: string) => {
    //     // console.log("Base64:", base64);
    //     // console.log("ContentType:", contentType);
    //     try {
    //       // const matches = base64.match(/^data:(.+);base64,(.+)$/);
    //       // if (!matches) {
    //       //   console.error("Invalid base64 format.", base64);
    //       //   throw new Error('Invalid base64 string!');
    //       // }
    //       return {
    //         buffer: Buffer.from(base64, 'base64'),
    //         contentType: contentType || 'image/png',
    //       }
    //     }
    //     catch (error) {
    //       if (error instanceof Error) {
    //         console.error("Error in base64ToBuffer:", error.message);
    //       } else {
    //         console.error("An unknown error occurred in base64ToBuffer.");
    //       }
    //       throw error;
    //     }
    //   };

    //   // Extract base64 images from instructions
    //   const extractImagesFromInstructions = (instructions: string) => {
    //     const imageRegex = /<img[^>]+src="data:image\/[^;]+;base64,([^"]+)"/g;
    //     let match;
    //     const images: { imgTag: string, base64: string, contentType: string }[] = [];

    //     while ((match = imageRegex.exec(instructions)) !== null) {
    //       const imgTag = match[0]; // Full <img> tag
    //       const base64 = match[1]; // Base64 part

    //       const contentTypeMatch = imgTag.match(/^data:(image\/[^;]+);base64,/);
    //       const contentType = contentTypeMatch ? contentTypeMatch[1] : 'image/png'; // Default to PNG

    //       images.push({ imgTag, base64, contentType });
    //     }

    //     return images;
    //   };

    //   // Save images to Google Cloud Storage and return URLs
    //   const saveImagesAndGetUrls = async (images: { base64: string, contentType: string; }[]) => {
    //     // console.log("Images: ", images);
    //     const imageUrls = await Promise.all(
    //       images.map(async ({ base64, contentType }, index) => {
    //         try {
    //           const result = base64ToBuffer(base64, contentType);

    //           if (!result || !result.buffer || !result.contentType) {
    //             throw new Error(`Invalid result from base64ToBuffer for image ${index}`);
    //           }
    //           const { buffer, contentType: type } = base64ToBuffer(base64, contentType);
    //           const fileName = `image-${Date.now()}-${index}.${contentType.split('/')[1]}`;
    //           const file = storage.bucket(bucket.name).file(fileName);

    //           await file.save(buffer, { contentType: type });
    //           console.log("inside: ", `https://storage.cloud.google.com/${bucket.name}/${fileName}`);
    //           return `https://storage.cloud.google.com/${bucket.name}/${fileName}`;
    //         } catch (error) {
    //           if (error instanceof Error) {
    //             console.error(`Error saving image ${index}:`, error.message);
    //             throw error;
    //           } else {
    //             console.error("An unknown error occurred in saveImagesAndGetUrls.");
    //           }
    //         }
    //       })
    //     );
    //     return imageUrls.filter((url): url is string => url !== undefined); // Filter out undefined values
    //   };

    //   try {
    //     const totalAmount = numberOfPages * 20;
    //     const depositAmount = (numberOfPages * 20) * 0.5

    //     // Process images
    //     const images = extractImagesFromInstructions(instructions);
    //     const imageUrls = await saveImagesAndGetUrls(images);

    //     // Replace base64 image sources with URLs in instructions
    //     let updatedInstructions = instructions;

    //     images.forEach(({ imgTag, base64, contentType }, index) => {
    //       // const src = `data:${contentType};base64,${base64}`;
    //       const imageUrl = imageUrls[index];
    //       // console.log(`Replacing ${imgTag} with new img tag`);

    //       // fs.writeFile('Output.txt', updatedInstructions, (err) => {

    //       //   // In case of a error throw err. 
    //       //   if (err) throw err;
    //       // })

    //       if (imageUrl) {
    //         const newImgTag = `<img src="${imageUrl}" alt="Image ${index}"`;
    //         // Replace the old <img> tag with the new one
    //         updatedInstructions = updatedInstructions.replace(imgTag, newImgTag);
    //       } else {
    //         console.warn(`No URL found for image index ${index}`);
    //       }
    //     });

    //     console.log(uploadedFiles);
    //     const order = await context.prisma.order.create({
    //       data: {
    //         studentId,
    //         instructions: updatedInstructions,
    //         paperType,
    //         numberOfPages,
    //         dueDate,
    //         totalAmount,
    //         depositAmount,
    //         status: "PENDING",
    //         uploadedFiles: {
    //           create: uploadedFiles.length > 0
    //             ? uploadedFiles.map((file) => ({
    //               url: file.url,
    //               name: file.name,
    //               size: file.size,
    //               type: file.type
    //             }))
    //             : [],
    //         }
    //       },
    //       include: {
    //         uploadedFiles: true, // Include uploadedFiles in the response
    //       },
    //     });

    //     return {
    //       success: true,
    //       message: "Order created successfully.",
    //       order,
    //     };
    //   }
    //   catch (error) {
    //     console.error("Error occurred while creating the order:", error)
    //     return {
    //       success: false,
    //       message: "An error occurred while creating the order.",
    //       order: null,
    //     };

    //   }
    // },

    createOrder: async (
      _: unknown,
      { input }: { input: CreateOrderInput },
      context: GraphQLContext
    ) => {
      const { studentId, instructions, paperType, numberOfPages, dueDate, uploadedFiles } = input;

      if (!instructions || !paperType || !numberOfPages || !dueDate) {
        console.error("Validation error: Missing required fields.");
        return {
          success: false,
          message: "All fields are required.",
          order: null,
        };
      }

      const base64ToBuffer = (base64: string, contentType: string) => {

        try {
          return {
            buffer: Buffer.from(base64, 'base64'),
            contentType: contentType || 'image/png',
          }
        }
        catch (error) {
          if (error instanceof Error) {
            console.error("Error in base64ToBuffer:", error.message);
          } else {
            console.error("An unknown error occurred in base64ToBuffer.");
          }
          throw error;
        }
      };

      // Extract base64 images from instructions
      const extractImagesFromInstructions = (instructions: string) => {
        const imageRegex = /<img[^>]+src="data:image\/[^;]+;base64,([^"]+)"/g;
        let match;
        const images: { imgTag: string, base64: string, contentType: string }[] = [];

        while ((match = imageRegex.exec(instructions)) !== null) {
          const imgTag = match[0]; // Full <img> tag
          const base64 = match[1]; // Base64 part

          const contentTypeMatch = imgTag.match(/^data:(image\/[^;]+);base64,/);
          const contentType = contentTypeMatch ? contentTypeMatch[1] : 'image/png'; // Default to PNG

          images.push({ imgTag, base64, contentType });
        }

        return images;
      };

      // Save images to Google Cloud Storage and return URLs
      const saveImagesAndGetUrls = async (images: { base64: string, contentType: string; }[]) => {
        // console.log("Images: ", images);
        const imageUrls = await Promise.all(
          images.map(async ({ base64, contentType }, index) => {
            try {
              const result = base64ToBuffer(base64, contentType);

              if (!result || !result.buffer || !result.contentType) {
                throw new Error(`Invalid result from base64ToBuffer for image ${index}`);
              }
              const { buffer, contentType: type } = base64ToBuffer(base64, contentType);
              const fileName = `image-${Date.now()}-${index}.${contentType.split('/')[1]}`;
              const file = storage.bucket(bucket.name).file(fileName);

              await file.save(buffer, { contentType: type });
              console.log("inside: ", `https://storage.cloud.google.com/${bucket.name}/${fileName}`);
              return `https://storage.cloud.google.com/${bucket.name}/${fileName}`;
            } catch (error) {
              if (error instanceof Error) {
                console.error(`Error saving image ${index}:`, error.message);
                throw error;
              } else {
                console.error("An unknown error occurred in saveImagesAndGetUrls.");
              }
            }
          })
        );
        return imageUrls.filter((url): url is string => url !== undefined); // Filter out undefined values
      };

      try {
        // Extract base64 images from instructions
        const images = extractImagesFromInstructions(instructions);
        console.log("Extracted images:", images);

        // Save images to Google Cloud Storage and get URLs
        const imageUrls = await saveImagesAndGetUrls(images);
        console.log("Generated image URLs:", imageUrls);

        // Replace base64 image sources with URLs in instructions
        let updatedInstructions = instructions;
        images.forEach(({ imgTag, base64, contentType }, index) => {
          const imageUrl = imageUrls[index];
          if (imageUrl) {
            const newImgTag = `<img src="${imageUrl}" alt="Image ${index}"`;
            updatedInstructions = updatedInstructions.replace(imgTag, newImgTag);
          } else {
            console.warn(`No URL found for image index ${index}`);
          }
        });

        console.log("Updated instructions:", updatedInstructions);
        console.log("Uploaded files:", uploadedFiles);

        // Create the order
        const order = await context.prisma.order.create({
          data: {
            studentId,
            instructions: updatedInstructions,
            paperType,
            numberOfPages,
            dueDate,
            totalAmount: numberOfPages * 20,
            depositAmount: (numberOfPages * 20) * 0.5,
            status: "PENDING",
            uploadedFiles: {
              create: uploadedFiles.map((file) => ({
                url: file.url,
                name: file.name,
                size: file.size,
                type: file.type,
              })),
            },
          },
          include: {
            uploadedFiles: true, // Include uploadedFiles in the response
          },
        });

        // If the order creation is successful, send the email
        const student = await context.prisma.user.findUnique({
          where: { id: studentId },
        });

        if (student && student.email) {
          sendOrderSuccessEmail(student.email, order.instructions, order.paperType, order.numberOfPages, order.dueDate, order.totalAmount, order.depositAmount, order.status, order.uploadedFiles);
        }

        return {
          success: true,
          message: "Order created successfully. A confirmation email has been sent.",
          order,
        };
      } catch (error) {
        console.error("Error occurred while creating the order:", error);
        return {
          success: false,
          message: "An error occurred while creating the order.",
          order: null,
        };
      }
    },


    login: async (
      _: unknown,
      { email, password }: { email: string; password: string },
      context: GraphQLContext
    ) => {
      const user = await context.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new Error('User does not exist');
      }

      const isValid = await compare(password, user.password);
      if (!isValid) {
        throw new Error('Incorrect password');
      }

      const token = sign({ userId: user.id }, APP_SECRET);
      return {
        token,
        user,
      };
    },
    createPayment: async (
      parent: Order, _: unknown,
      { orderId, amount, paymentStatus, transactionId }: {
        orderId: number;
        amount: number;
        paymentStatus: PaymentStatus;
        transactionId: string;
      },
      context: GraphQLContext
    ) => {
      if (!context.currentUser) {
        throw new Error('Authentication required');
      }

      return context.prisma.payment.create({
        data: {
          orderId,
          amount,
          paymentStatus,
          transactionId,
        },
      });
    },
    createReview: async (
      _: unknown,
      { orderId, qaId, writerId, comments, rating }: {
        orderId: number;
        qaId: number;
        writerId: number;
        comments: string;
        rating: number;
      },
      context: GraphQLContext
    ) => {
      if (!context.currentUser) {
        throw new Error('Authentication required');
      }

      return context.prisma.review.create({
        data: {
          orderId,
          qaId,
          writerId,
          comments,
          rating,
        },
      });
    },
    createAssignment: async (
      _: unknown,
      { orderId, writerId }: { orderId: number; writerId: number },
      context: GraphQLContext
    ) => {
      if (!context.currentUser) {
        throw new Error('Authentication required');
      }

      return context.prisma.assignment.create({
        data: {
          orderId,
          writerId,
        },
      });
    },
  },

  User: {
    orders: (parent: User, _: {}, context: GraphQLContext) => {
      return context.prisma.order.findMany({
        where: { studentId: parent.id },
      });
    },
  },

  Order: {
    student: (parent: Order, _: {}, context: GraphQLContext) => {
      return context.prisma.user.findUnique({
        where: { id: parent.studentId },
      });
    },
    uploadedFiles: (parent: Order, _: {}, context: GraphQLContext) => {
      return context.prisma.file.findMany({
        where: { orderId: parent.id },
      })
    }
  },

  Payment: {
    order: (parent: Payment, _: {}, context: GraphQLContext) => {
      return context.prisma.order.findUnique({
        where: { id: parent.orderId },
      });
    },
  },

  Review: {
    order: (parent: Review, _: {}, context: GraphQLContext) => {
      return context.prisma.order.findUnique({
        where: { id: parent.orderId },
      });
    },
    qa: (parent: Review, _: {}, context: GraphQLContext) => {
      return context.prisma.user.findUnique({
        where: { id: parent.qaId },
      });
    },
    writer: (parent: Review, _: {}, context: GraphQLContext) => {
      return context.prisma.user.findUnique({
        where: { id: parent.writerId },
      });
    },
  },

  Assignment: {
    order: (parent: Assignment, _: {}, context: GraphQLContext) => {
      return context.prisma.order.findUnique({
        where: { id: parent.orderId },
      });
    },
    writer: (parent: Assignment, _: {}, context: GraphQLContext) => {
      return context.prisma.user.findUnique({
        where: { id: parent.writerId },
      });
    },
  },
};

export const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});
