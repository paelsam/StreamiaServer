import mongoose from 'mongoose';

const mongoUri = process.env.MONGODB_URI_COMMENTS || 'mongodb+srv://emanuel_rivas:emanuel123@streamia.ggiikay.mongodb.net/Streamia?retryWrites=true&w=majority&appName=Streamia';

interface IComment {
  _id: mongoose.Types.ObjectId;
  movieId: string;
  userId: string;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new mongoose.Schema<IComment>(
  {
    movieId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    text: { type: String, required: true },
  },
  { timestamps: true, collection: 'comments' }
);

describe('Comment Service - MongoDB Integration Tests', () => {
  let Comment: mongoose.Model<IComment>;

  beforeAll(async () => {
    // Connect to MongoDB
    await mongoose.connect(mongoUri);
    
    // Delete existing model if it exists
    if (mongoose.models['Comment']) {
      delete mongoose.models['Comment'];
    }
    
    Comment = mongoose.model<IComment>('Comment', commentSchema);
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  test('should connect to MongoDB Atlas', async () => {
    const isConnected = mongoose.connection.readyState === 1;
    expect(isConnected).toBe(true);
  });

  test('should find comments for a specific movie', async () => {
    const movieId = '69002c492df6874aea86dc46';
    
    const comments = await Comment.find({ movieId });
    
    expect(Array.isArray(comments)).toBe(true);
    expect(comments.length).toBeGreaterThan(0);
  });

  test('should return comments with correct structure', async () => {
    const movieId = '69002c492df6874aea86dc46';
    
    const comments = await Comment.find({ movieId });
    
    expect(comments.length).toBeGreaterThan(0);
    
    const comment = comments[0];
    expect(comment).toHaveProperty('_id');
    expect(comment).toHaveProperty('movieId');
    expect(comment).toHaveProperty('userId');
    expect(comment).toHaveProperty('text');
    expect(comment.movieId).toBe(movieId);
  });

  test('should count documents correctly', async () => {
    const movieId = '69002c492df6874aea86dc46';
    
    const count = await Comment.countDocuments({ movieId });
    
    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThan(0);
  });

  test('should return empty array for non-existent movie', async () => {
    const nonExistentMovieId = 'nonexistent-id-12345';
    
    const comments = await Comment.find({ movieId: nonExistentMovieId });
    
    expect(Array.isArray(comments)).toBe(true);
    expect(comments.length).toBe(0);
  });

  test('should sort comments by createdAt descending', async () => {
    const movieId = '69002c492df6874aea86dc46';
    
    const comments = await Comment.find({ movieId })
      .sort({ createdAt: -1 });
    
    expect(comments.length).toBeGreaterThan(0);
    
    // Verify sorting
    for (let i = 1; i < comments.length; i++) {
      const prevDate = new Date(comments[i - 1].createdAt).getTime();
      const currentDate = new Date(comments[i].createdAt).getTime();
      expect(prevDate).toBeGreaterThanOrEqual(currentDate);
    }
  });
});
