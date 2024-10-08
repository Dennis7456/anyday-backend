import { GraphQLResolveInfo } from 'graphql';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type Assignment = {
  __typename?: 'Assignment';
  assignedAt: Scalars['String']['output'];
  completedAt?: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  order: Order;
  orderId: Scalars['Int']['output'];
  writer: User;
};

export type AttachFilesInput = {
  fileUrls: Array<Scalars['String']['input']>;
  orderId: Scalars['ID']['input'];
};

export type AuthPayload = {
  __typename?: 'AuthPayload';
  token: Scalars['String']['output'];
  user: User;
};

export type CompleteRegistrationInput = {
  firstName: Scalars['String']['input'];
  lastName: Scalars['String']['input'];
  password: Scalars['String']['input'];
  token: Scalars['String']['input'];
};

export type CreateOrderInput = {
  dueDate: Scalars['String']['input'];
  instructions: Scalars['String']['input'];
  numberOfPages: Scalars['Int']['input'];
  paperType: Scalars['String']['input'];
  studentId: Scalars['Int']['input'];
  uploadedFiles: Array<FileValueInput>;
};

export type CreateStudentInput = {
  dateOfBirth: Scalars['String']['input'];
  email: Scalars['String']['input'];
  firstName: Scalars['String']['input'];
  lastName: Scalars['String']['input'];
  password: Scalars['String']['input'];
  phoneNumber: Scalars['String']['input'];
};

export type FileValue = {
  __typename?: 'FileValue';
  id: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  size: Scalars['String']['output'];
  type: Scalars['String']['output'];
  url: Scalars['String']['output'];
};

export type FileValueInput = {
  id: Scalars['ID']['input'];
  name: Scalars['String']['input'];
  size: Scalars['String']['input'];
  type: Scalars['String']['input'];
  url: Scalars['String']['input'];
};

export type Mutation = {
  __typename?: 'Mutation';
  attachFiles: Order;
  completeRegistration: User;
  createAssignment: Assignment;
  createOrder: OrderResponse;
  createPayment: Payment;
  createReview: Review;
  createStudent: User;
  login: AuthPayload;
  register: AuthPayload;
  registerAndCreateOrder: RegisterOrderResponse;
  verifyEmail: VerifyEmailResponse;
};


export type MutationAttachFilesArgs = {
  input: AttachFilesInput;
};


export type MutationCompleteRegistrationArgs = {
  input: CompleteRegistrationInput;
};


export type MutationCreateAssignmentArgs = {
  orderId: Scalars['Int']['input'];
  writerId: Scalars['Int']['input'];
};


export type MutationCreateOrderArgs = {
  input: CreateOrderInput;
};


export type MutationCreatePaymentArgs = {
  amount: Scalars['Float']['input'];
  orderId: Scalars['Int']['input'];
  paymentStatus: PaymentStatus;
  transactionId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationCreateReviewArgs = {
  comments?: InputMaybe<Scalars['String']['input']>;
  orderId: Scalars['Int']['input'];
  qaId: Scalars['Int']['input'];
  rating: Scalars['Int']['input'];
  writerId: Scalars['Int']['input'];
};


export type MutationCreateStudentArgs = {
  input: CreateStudentInput;
};


export type MutationLoginArgs = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};


export type MutationRegisterArgs = {
  dateOfBirth: Scalars['String']['input'];
  email: Scalars['String']['input'];
  firstName: Scalars['String']['input'];
  lastName: Scalars['String']['input'];
  password: Scalars['String']['input'];
  phoneNumber: Scalars['String']['input'];
  role: Role;
  userName: Scalars['String']['input'];
};


export type MutationRegisterAndCreateOrderArgs = {
  input: RegisterOrderInput;
};


export type MutationVerifyEmailArgs = {
  token: Scalars['String']['input'];
};

export type Order = {
  __typename?: 'Order';
  dueDate: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  instructions: Scalars['String']['output'];
  numberOfPages: Scalars['Int']['output'];
  paperType: Scalars['String']['output'];
  student: User;
  studentId: Scalars['Int']['output'];
  totalAmount: Scalars['Int']['output'];
  uploadedFiles: Array<FileValue>;
};

export type OrderResponse = {
  __typename?: 'OrderResponse';
  message?: Maybe<Scalars['String']['output']>;
  order: Order;
  success: Scalars['Boolean']['output'];
};

export enum OrderStatus {
  Completed = 'COMPLETED',
  InProgress = 'IN_PROGRESS',
  Pending = 'PENDING',
  Reviewed = 'REVIEWED'
}

export type Payment = {
  __typename?: 'Payment';
  amount: Scalars['Float']['output'];
  id: Scalars['Int']['output'];
  order: Order;
  orderId: Scalars['Int']['output'];
  paymentDate: Scalars['String']['output'];
  paymentStatus: PaymentStatus;
  transactionId?: Maybe<Scalars['String']['output']>;
};

export enum PaymentStatus {
  Completed = 'COMPLETED',
  Failed = 'FAILED',
  Pending = 'PENDING'
}

export type Query = {
  __typename?: 'Query';
  loggedInUser?: Maybe<User>;
  order?: Maybe<Order>;
  orders: Array<Order>;
  user?: Maybe<User>;
  users: Array<User>;
};


export type QueryOrderArgs = {
  id: Scalars['Int']['input'];
};


export type QueryUserArgs = {
  id: Scalars['Int']['input'];
};

export type RegisterOrderInput = {
  dueDate: Scalars['String']['input'];
  email: Scalars['String']['input'];
  pages: Scalars['Int']['input'];
  paperType: Scalars['String']['input'];
};

export type RegisterOrderResponse = {
  __typename?: 'RegisterOrderResponse';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
  verificationToken?: Maybe<Scalars['String']['output']>;
};

export type Review = {
  __typename?: 'Review';
  comments?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  order: Order;
  orderId: Scalars['Int']['output'];
  qa: User;
  rating: Scalars['Int']['output'];
  updatedAt: Scalars['String']['output'];
  writer: User;
};

export enum Role {
  Admin = 'ADMIN',
  Qa = 'QA',
  Student = 'STUDENT',
  Writer = 'WRITER'
}

export type User = {
  __typename?: 'User';
  assignments: Array<Assignment>;
  createdAt: Scalars['String']['output'];
  dateOfBirth: Scalars['String']['output'];
  email: Scalars['String']['output'];
  firstName: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  lastName: Scalars['String']['output'];
  orders: Array<Order>;
  password: Scalars['String']['output'];
  phoneNumber: Scalars['String']['output'];
  qaReviews: Array<Review>;
  role: Role;
  updatedAt: Scalars['String']['output'];
  userName: Scalars['String']['output'];
  writtenReviews: Array<Review>;
};

export type VerifyEmailResponse = {
  __typename?: 'VerifyEmailResponse';
  message?: Maybe<Scalars['String']['output']>;
  redirectUrl: Scalars['String']['output'];
  token: Scalars['String']['output'];
  valid: Scalars['Boolean']['output'];
};



export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;



/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  Assignment: ResolverTypeWrapper<Assignment>;
  AttachFilesInput: AttachFilesInput;
  AuthPayload: ResolverTypeWrapper<AuthPayload>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  CompleteRegistrationInput: CompleteRegistrationInput;
  CreateOrderInput: CreateOrderInput;
  CreateStudentInput: CreateStudentInput;
  FileValue: ResolverTypeWrapper<FileValue>;
  FileValueInput: FileValueInput;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  Mutation: ResolverTypeWrapper<{}>;
  Order: ResolverTypeWrapper<Order>;
  OrderResponse: ResolverTypeWrapper<OrderResponse>;
  OrderStatus: OrderStatus;
  Payment: ResolverTypeWrapper<Payment>;
  PaymentStatus: PaymentStatus;
  Query: ResolverTypeWrapper<{}>;
  RegisterOrderInput: RegisterOrderInput;
  RegisterOrderResponse: ResolverTypeWrapper<RegisterOrderResponse>;
  Review: ResolverTypeWrapper<Review>;
  Role: Role;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  User: ResolverTypeWrapper<User>;
  VerifyEmailResponse: ResolverTypeWrapper<VerifyEmailResponse>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  Assignment: Assignment;
  AttachFilesInput: AttachFilesInput;
  AuthPayload: AuthPayload;
  Boolean: Scalars['Boolean']['output'];
  CompleteRegistrationInput: CompleteRegistrationInput;
  CreateOrderInput: CreateOrderInput;
  CreateStudentInput: CreateStudentInput;
  FileValue: FileValue;
  FileValueInput: FileValueInput;
  Float: Scalars['Float']['output'];
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  Mutation: {};
  Order: Order;
  OrderResponse: OrderResponse;
  Payment: Payment;
  Query: {};
  RegisterOrderInput: RegisterOrderInput;
  RegisterOrderResponse: RegisterOrderResponse;
  Review: Review;
  String: Scalars['String']['output'];
  User: User;
  VerifyEmailResponse: VerifyEmailResponse;
};

export type AssignmentResolvers<ContextType = any, ParentType extends ResolversParentTypes['Assignment'] = ResolversParentTypes['Assignment']> = {
  assignedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  completedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  order?: Resolver<ResolversTypes['Order'], ParentType, ContextType>;
  orderId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  writer?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AuthPayloadResolvers<ContextType = any, ParentType extends ResolversParentTypes['AuthPayload'] = ResolversParentTypes['AuthPayload']> = {
  token?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type FileValueResolvers<ContextType = any, ParentType extends ResolversParentTypes['FileValue'] = ResolversParentTypes['FileValue']> = {
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  size?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type MutationResolvers<ContextType = any, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  attachFiles?: Resolver<ResolversTypes['Order'], ParentType, ContextType, RequireFields<MutationAttachFilesArgs, 'input'>>;
  completeRegistration?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationCompleteRegistrationArgs, 'input'>>;
  createAssignment?: Resolver<ResolversTypes['Assignment'], ParentType, ContextType, RequireFields<MutationCreateAssignmentArgs, 'orderId' | 'writerId'>>;
  createOrder?: Resolver<ResolversTypes['OrderResponse'], ParentType, ContextType, RequireFields<MutationCreateOrderArgs, 'input'>>;
  createPayment?: Resolver<ResolversTypes['Payment'], ParentType, ContextType, RequireFields<MutationCreatePaymentArgs, 'amount' | 'orderId' | 'paymentStatus'>>;
  createReview?: Resolver<ResolversTypes['Review'], ParentType, ContextType, RequireFields<MutationCreateReviewArgs, 'orderId' | 'qaId' | 'rating' | 'writerId'>>;
  createStudent?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationCreateStudentArgs, 'input'>>;
  login?: Resolver<ResolversTypes['AuthPayload'], ParentType, ContextType, RequireFields<MutationLoginArgs, 'email' | 'password'>>;
  register?: Resolver<ResolversTypes['AuthPayload'], ParentType, ContextType, RequireFields<MutationRegisterArgs, 'dateOfBirth' | 'email' | 'firstName' | 'lastName' | 'password' | 'phoneNumber' | 'role' | 'userName'>>;
  registerAndCreateOrder?: Resolver<ResolversTypes['RegisterOrderResponse'], ParentType, ContextType, RequireFields<MutationRegisterAndCreateOrderArgs, 'input'>>;
  verifyEmail?: Resolver<ResolversTypes['VerifyEmailResponse'], ParentType, ContextType, RequireFields<MutationVerifyEmailArgs, 'token'>>;
};

export type OrderResolvers<ContextType = any, ParentType extends ResolversParentTypes['Order'] = ResolversParentTypes['Order']> = {
  dueDate?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  instructions?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  numberOfPages?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  paperType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  student?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  studentId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalAmount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  uploadedFiles?: Resolver<Array<ResolversTypes['FileValue']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type OrderResponseResolvers<ContextType = any, ParentType extends ResolversParentTypes['OrderResponse'] = ResolversParentTypes['OrderResponse']> = {
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  order?: Resolver<ResolversTypes['Order'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PaymentResolvers<ContextType = any, ParentType extends ResolversParentTypes['Payment'] = ResolversParentTypes['Payment']> = {
  amount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  order?: Resolver<ResolversTypes['Order'], ParentType, ContextType>;
  orderId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  paymentDate?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  paymentStatus?: Resolver<ResolversTypes['PaymentStatus'], ParentType, ContextType>;
  transactionId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type QueryResolvers<ContextType = any, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  loggedInUser?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  order?: Resolver<Maybe<ResolversTypes['Order']>, ParentType, ContextType, RequireFields<QueryOrderArgs, 'id'>>;
  orders?: Resolver<Array<ResolversTypes['Order']>, ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType, RequireFields<QueryUserArgs, 'id'>>;
  users?: Resolver<Array<ResolversTypes['User']>, ParentType, ContextType>;
};

export type RegisterOrderResponseResolvers<ContextType = any, ParentType extends ResolversParentTypes['RegisterOrderResponse'] = ResolversParentTypes['RegisterOrderResponse']> = {
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  verificationToken?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ReviewResolvers<ContextType = any, ParentType extends ResolversParentTypes['Review'] = ResolversParentTypes['Review']> = {
  comments?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  order?: Resolver<ResolversTypes['Order'], ParentType, ContextType>;
  orderId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  qa?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  rating?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  writer?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type UserResolvers<ContextType = any, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = {
  assignments?: Resolver<Array<ResolversTypes['Assignment']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  dateOfBirth?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  firstName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  lastName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  orders?: Resolver<Array<ResolversTypes['Order']>, ParentType, ContextType>;
  password?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  phoneNumber?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  qaReviews?: Resolver<Array<ResolversTypes['Review']>, ParentType, ContextType>;
  role?: Resolver<ResolversTypes['Role'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  userName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  writtenReviews?: Resolver<Array<ResolversTypes['Review']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type VerifyEmailResponseResolvers<ContextType = any, ParentType extends ResolversParentTypes['VerifyEmailResponse'] = ResolversParentTypes['VerifyEmailResponse']> = {
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  redirectUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  token?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  valid?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type Resolvers<ContextType = any> = {
  Assignment?: AssignmentResolvers<ContextType>;
  AuthPayload?: AuthPayloadResolvers<ContextType>;
  FileValue?: FileValueResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Order?: OrderResolvers<ContextType>;
  OrderResponse?: OrderResponseResolvers<ContextType>;
  Payment?: PaymentResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  RegisterOrderResponse?: RegisterOrderResponseResolvers<ContextType>;
  Review?: ReviewResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
  VerifyEmailResponse?: VerifyEmailResponseResolvers<ContextType>;
};

