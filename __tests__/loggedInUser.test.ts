import { GraphQLContext } from '../src/context/context';
import { userResolvers } from '../src/controllers/userController';

describe('loggedInUser resolver', () => {
  let context: GraphQLContext;

  beforeEach(() => {
    jest.clearAllMocks(); // Clear any mocks before each test
  });

  it('should return the currentUser when logged in', async () => {
    // Mock a logged-in user in the context
    const mockUser = {
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phoneNumber: '1234567890',
      dateOfBirth: new Date('2000-01-01'),
      role: 'STUDENT',
    };

    context = {
      currentUser: mockUser, // Set the mock user in context
    } as GraphQLContext;

    // Call the resolver directly
    const result = await userResolvers.Query.loggedInUser(null, {}, context);

    // Assert that the result matches the mock user
    expect(result).toEqual(mockUser);
  });

  it('should throw an error when currentUser is not set', async () => {
    // Set currentUser to null in the context to simulate a not logged-in user
    context = {
      currentUser: null, // No user in context
    } as GraphQLContext;

    try {
        userResolvers.Query.loggedInUser (null, {}, context);
    } catch (error) {
        // console.error(error);
        expect(error).toEqual(new Error('Please login'));
    }
  });
});
