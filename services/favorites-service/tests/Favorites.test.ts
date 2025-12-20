import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Favorite from '../src/models/Favorites';

describe('Favorites Model Tests', () => {
  let mongoServer: MongoMemoryServer;

  // Silenciar console.error durante los tests
  beforeAll(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    jest.restoreAllMocks();
  });

  afterEach(async () => {
    await Favorite.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create a favorite with valid data', async () => {
      const favorite = await Favorite.create({
        userId: new Types.ObjectId(),
        movieId: new Types.ObjectId(),
        note: 'Great movie!'
      });

      expect(favorite).toBeDefined();
      expect(favorite.userId).toBeInstanceOf(Types.ObjectId);
      expect(favorite.movieId).toBeInstanceOf(Types.ObjectId);
      expect(favorite.note).toBe('Great movie!');
      expect(favorite.createdAt).toBeInstanceOf(Date);
      expect(favorite.updatedAt).toBeInstanceOf(Date);
    });

    it('should create a favorite without note (default empty string)', async () => {
      const favorite = await Favorite.create({
        userId: new Types.ObjectId(),
        movieId: new Types.ObjectId()
      });

      expect(favorite.note).toBe('');
    });

    it('should fail validation when userId is missing', async () => {
      await expect(
        Favorite.create({
          movieId: new Types.ObjectId(),
          note: 'Test'
        })
      ).rejects.toThrow();
    });

    it('should fail validation when movieId is missing', async () => {
      await expect(
        Favorite.create({
          userId: new Types.ObjectId(),
          note: 'Test'
        })
      ).rejects.toThrow();
    });

    it('should trim whitespace from note', async () => {
      const favorite = await Favorite.create({
        userId: new Types.ObjectId(),
        movieId: new Types.ObjectId(),
        note: '  Great movie!  '
      });

      expect(favorite.note).toBe('Great movie!');
    });

    it('should fail validation when note exceeds 500 characters', async () => {
      const longNote = 'a'.repeat(501);

      await expect(
        Favorite.create({
          userId: new Types.ObjectId(),
          movieId: new Types.ObjectId(),
          note: longNote
        })
      ).rejects.toThrow();
    });

    it('should allow note with exactly 500 characters', async () => {
      const maxNote = 'a'.repeat(500);
      const favorite = await Favorite.create({
        userId: new Types.ObjectId(),
        movieId: new Types.ObjectId(),
        note: maxNote
      });

      expect(favorite.note).toHaveLength(500);
    });

    it('should not allow duplicate userId and movieId combination', async () => {
      const userId = new Types.ObjectId();
      const movieId = new Types.ObjectId();

      await Favorite.create({ userId, movieId });

      await expect(
        Favorite.create({ userId, movieId })
      ).rejects.toThrow();
    });

    it('should allow same user to favorite different movies', async () => {
      const userId = new Types.ObjectId();
      const movieId1 = new Types.ObjectId();
      const movieId2 = new Types.ObjectId();

      const fav1 = await Favorite.create({ userId, movieId: movieId1 });
      const fav2 = await Favorite.create({ userId, movieId: movieId2 });

      expect(fav1).toBeDefined();
      expect(fav2).toBeDefined();
    });

    it('should allow different users to favorite same movie', async () => {
      const userId1 = new Types.ObjectId();
      const userId2 = new Types.ObjectId();
      const movieId = new Types.ObjectId();

      const fav1 = await Favorite.create({ userId: userId1, movieId });
      const fav2 = await Favorite.create({ userId: userId2, movieId });

      expect(fav1).toBeDefined();
      expect(fav2).toBeDefined();
    });
  });

  describe('Instance Methods', () => {
    describe('toJSON', () => {
      it('should convert _id to id and remove _id', async () => {
        const favorite = await Favorite.create({
          userId: new Types.ObjectId(),
          movieId: new Types.ObjectId(),
          note: 'Test note'
        });

        const json = favorite.toJSON();

        expect(json.id).toBeDefined();
        expect(json._id).toBeUndefined();
        expect(json.userId).toBeDefined();
        expect(json.movieId).toBeDefined();
        expect(json.note).toBe('Test note');
      });

      it('should include timestamps in JSON', async () => {
        const favorite = await Favorite.create({
          userId: new Types.ObjectId(),
          movieId: new Types.ObjectId()
        });

        const json = favorite.toJSON();

        expect(json.createdAt).toBeDefined();
        expect(json.updatedAt).toBeDefined();
      });
    });
  });

  describe('Static Methods', () => {
    describe('checkExists', () => {
      it('should return true if favorite exists', async () => {
        const userId = new Types.ObjectId();
        const movieId = new Types.ObjectId();

        await Favorite.create({ userId, movieId });

        const exists = await Favorite.checkExists(userId, movieId);
        expect(exists).toBe(true);
      });

      it('should return false if favorite does not exist', async () => {
        const userId = new Types.ObjectId();
        const movieId = new Types.ObjectId();

        const exists = await Favorite.checkExists(userId, movieId);
        expect(exists).toBe(false);
      });

      it('should work with string IDs', async () => {
        const userId = new Types.ObjectId();
        const movieId = new Types.ObjectId();

        await Favorite.create({ userId, movieId });

        const exists = await Favorite.checkExists(
          userId.toString(),
          movieId.toString()
        );
        expect(exists).toBe(true);
      });

      it('should return false for non-existent combination', async () => {
        const userId1 = new Types.ObjectId();
        const userId2 = new Types.ObjectId();
        const movieId = new Types.ObjectId();

        await Favorite.create({ userId: userId1, movieId });

        const exists = await Favorite.checkExists(userId2, movieId);
        expect(exists).toBe(false);
      });
    });

    describe('findByUser', () => {
      it('should find all favorites for a user with default pagination', async () => {
        const userId = new Types.ObjectId();
        const movieId1 = new Types.ObjectId();
        const movieId2 = new Types.ObjectId();

        await Favorite.create({ userId, movieId: movieId1 });
        await Favorite.create({ userId, movieId: movieId2 });

        const result = await Favorite.findByUser(userId);

        expect(result.favorites).toHaveLength(2);
        expect(result.total).toBe(2);
        expect(result.page).toBe(1);
        expect(result.limit).toBe(20);
        expect(result.totalPages).toBe(1);
        expect(result.hasMore).toBe(false);
      });

      it('should work with string userId', async () => {
        const userId = new Types.ObjectId();
        await Favorite.create({ 
          userId, 
          movieId: new Types.ObjectId() 
        });

        const result = await Favorite.findByUser(userId.toString());

        expect(result.favorites).toHaveLength(1);
      });

      it('should paginate results correctly', async () => {
        const userId = new Types.ObjectId();

        // Create 25 favorites
        for (let i = 0; i < 25; i++) {
          await Favorite.create({ 
            userId, 
            movieId: new Types.ObjectId() 
          });
        }

        const page1 = await Favorite.findByUser(userId, { page: 1, limit: 10 });
        expect(page1.favorites).toHaveLength(10);
        expect(page1.total).toBe(25);
        expect(page1.totalPages).toBe(3);
        expect(page1.hasMore).toBe(true);

        const page2 = await Favorite.findByUser(userId, { page: 2, limit: 10 });
        expect(page2.favorites).toHaveLength(10);
        expect(page2.hasMore).toBe(true);

        const page3 = await Favorite.findByUser(userId, { page: 3, limit: 10 });
        expect(page3.favorites).toHaveLength(5);
        expect(page3.hasMore).toBe(false);
      });

      it('should sort by createdAt descending by default', async () => {
        const userId = new Types.ObjectId();
        
        const fav1 = await Favorite.create({ 
          userId, 
          movieId: new Types.ObjectId() 
        });
        
        await new Promise(resolve => setTimeout(resolve, 10));
        
        const fav2 = await Favorite.create({ 
          userId, 
          movieId: new Types.ObjectId() 
        });

        const result = await Favorite.findByUser(userId);

        expect(result.favorites[0]._id.toString()).toBe(fav2._id.toString());
        expect(result.favorites[1]._id.toString()).toBe(fav1._id.toString());
      });

      it('should sort by createdAt ascending when specified', async () => {
        const userId = new Types.ObjectId();
        
        const fav1 = await Favorite.create({ 
          userId, 
          movieId: new Types.ObjectId() 
        });
        
        await new Promise(resolve => setTimeout(resolve, 10));
        
        const fav2 = await Favorite.create({ 
          userId, 
          movieId: new Types.ObjectId() 
        });

        const result = await Favorite.findByUser(userId, { 
          sortOrder: 'asc' 
        });

        expect(result.favorites[0]._id.toString()).toBe(fav1._id.toString());
        expect(result.favorites[1]._id.toString()).toBe(fav2._id.toString());
      });

      it('should return empty array for user with no favorites', async () => {
        const userId = new Types.ObjectId();

        const result = await Favorite.findByUser(userId);

        expect(result.favorites).toHaveLength(0);
        expect(result.total).toBe(0);
        expect(result.totalPages).toBe(0);
        expect(result.hasMore).toBe(false);
      });

      it('should handle custom limit', async () => {
        const userId = new Types.ObjectId();

        for (let i = 0; i < 10; i++) {
          await Favorite.create({ 
            userId, 
            movieId: new Types.ObjectId() 
          });
        }

        const result = await Favorite.findByUser(userId, { limit: 5 });

        expect(result.favorites).toHaveLength(5);
        expect(result.limit).toBe(5);
        expect(result.totalPages).toBe(2);
      });

      it('should handle custom sortBy field', async () => {
        const userId = new Types.ObjectId();

        await Favorite.create({ 
          userId, 
          movieId: new Types.ObjectId(),
          note: 'Zebra'
        });
        
        await Favorite.create({ 
          userId, 
          movieId: new Types.ObjectId(),
          note: 'Alpha'
        });

        const result = await Favorite.findByUser(userId, { 
          sortBy: 'note',
          sortOrder: 'asc'
        });

        expect(result.favorites[0].note).toBe('Alpha');
        expect(result.favorites[1].note).toBe('Zebra');
      });
    });

    describe('findByMovie', () => {
      it('should find all favorites for a specific movie', async () => {
        const movieId = new Types.ObjectId();
        const userId1 = new Types.ObjectId();
        const userId2 = new Types.ObjectId();

        await Favorite.create({ userId: userId1, movieId });
        await Favorite.create({ userId: userId2, movieId });

        const favorites = await Favorite.findByMovie(movieId);

        expect(favorites).toHaveLength(2);
      });

      it('should work with string movieId', async () => {
        const movieId = new Types.ObjectId();
        await Favorite.create({ 
          userId: new Types.ObjectId(), 
          movieId 
        });

        const favorites = await Favorite.findByMovie(movieId.toString());

        expect(favorites).toHaveLength(1);
      });

      it('should return empty array for movie with no favorites', async () => {
        const movieId = new Types.ObjectId();

        const favorites = await Favorite.findByMovie(movieId);

        expect(favorites).toHaveLength(0);
      });

      it('should only return favorites for specified movie', async () => {
        const movieId1 = new Types.ObjectId();
        const movieId2 = new Types.ObjectId();
        const userId = new Types.ObjectId();

        await Favorite.create({ userId, movieId: movieId1 });
        await Favorite.create({ userId, movieId: movieId2 });

        const favorites = await Favorite.findByMovie(movieId1);

        expect(favorites).toHaveLength(1);
        expect(favorites[0].movieId.toString()).toBe(movieId1.toString());
      });
    });

    describe('deleteByUser', () => {
      it('should delete all favorites for a user', async () => {
        const userId = new Types.ObjectId();

        await Favorite.create({ userId, movieId: new Types.ObjectId() });
        await Favorite.create({ userId, movieId: new Types.ObjectId() });

        const deletedCount = await Favorite.deleteByUser(userId);

        expect(deletedCount).toBe(2);

        const remaining = await Favorite.find({ userId });
        expect(remaining).toHaveLength(0);
      });

      it('should work with string userId', async () => {
        const userId = new Types.ObjectId();

        await Favorite.create({ userId, movieId: new Types.ObjectId() });

        const deletedCount = await Favorite.deleteByUser(userId.toString());

        expect(deletedCount).toBe(1);
      });

      it('should return 0 when user has no favorites', async () => {
        const userId = new Types.ObjectId();

        const deletedCount = await Favorite.deleteByUser(userId);

        expect(deletedCount).toBe(0);
      });

      it('should only delete favorites for specified user', async () => {
        const userId1 = new Types.ObjectId();
        const userId2 = new Types.ObjectId();
        const movieId = new Types.ObjectId();

        await Favorite.create({ userId: userId1, movieId });
        await Favorite.create({ userId: userId2, movieId });

        const deletedCount = await Favorite.deleteByUser(userId1);

        expect(deletedCount).toBe(1);

        const remaining = await Favorite.find({ userId: userId2 });
        expect(remaining).toHaveLength(1);
      });
    });

    describe('deleteByMovie', () => {
      it('should delete all favorites for a movie', async () => {
        const movieId = new Types.ObjectId();

        await Favorite.create({ 
          userId: new Types.ObjectId(), 
          movieId 
        });
        await Favorite.create({ 
          userId: new Types.ObjectId(), 
          movieId 
        });

        const deletedCount = await Favorite.deleteByMovie(movieId);

        expect(deletedCount).toBe(2);

        const remaining = await Favorite.find({ movieId });
        expect(remaining).toHaveLength(0);
      });

      it('should work with string movieId', async () => {
        const movieId = new Types.ObjectId();

        await Favorite.create({ 
          userId: new Types.ObjectId(), 
          movieId 
        });

        const deletedCount = await Favorite.deleteByMovie(movieId.toString());

        expect(deletedCount).toBe(1);
      });

      it('should return 0 when movie has no favorites', async () => {
        const movieId = new Types.ObjectId();

        const deletedCount = await Favorite.deleteByMovie(movieId);

        expect(deletedCount).toBe(0);
      });

      it('should only delete favorites for specified movie', async () => {
        const movieId1 = new Types.ObjectId();
        const movieId2 = new Types.ObjectId();
        const userId = new Types.ObjectId();

        await Favorite.create({ userId, movieId: movieId1 });
        await Favorite.create({ userId, movieId: movieId2 });

        const deletedCount = await Favorite.deleteByMovie(movieId1);

        expect(deletedCount).toBe(1);

        const remaining = await Favorite.find({ movieId: movieId2 });
        expect(remaining).toHaveLength(1);
      });
    });
  });

  describe('Timestamps', () => {
    it('should automatically set createdAt and updatedAt on creation', async () => {
      const favorite = await Favorite.create({
        userId: new Types.ObjectId(),
        movieId: new Types.ObjectId()
      });

      expect(favorite.createdAt).toBeInstanceOf(Date);
      expect(favorite.updatedAt).toBeInstanceOf(Date);
      expect(favorite.createdAt.getTime()).toBeLessThanOrEqual(
        favorite.updatedAt.getTime()
      );
    });

    it('should update updatedAt on modification', async () => {
      const favorite = await Favorite.create({
        userId: new Types.ObjectId(),
        movieId: new Types.ObjectId(),
        note: 'Original note'
      });

      const originalUpdatedAt = favorite.updatedAt;

      await new Promise(resolve => setTimeout(resolve, 10));

      favorite.note = 'Updated note';
      await favorite.save();

      expect(favorite.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime()
      );
    });

    it('should not change createdAt on modification', async () => {
      const favorite = await Favorite.create({
        userId: new Types.ObjectId(),
        movieId: new Types.ObjectId(),
        note: 'Original note'
      });

      const originalCreatedAt = favorite.createdAt;

      await new Promise(resolve => setTimeout(resolve, 10));

      favorite.note = 'Updated note';
      await favorite.save();

      expect(favorite.createdAt.getTime()).toBe(originalCreatedAt.getTime());
    });
  });

  describe('Collection and Schema Configuration', () => {
    it('should use "favorites" as collection name', () => {
      expect(Favorite.collection.name).toBe('favorites');
    });

    it('should not include __v field', async () => {
      const favorite = await Favorite.create({
        userId: new Types.ObjectId(),
        movieId: new Types.ObjectId()
      });

      const obj = favorite.toObject();
      expect(obj.__v).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle ObjectId with 12-byte string', async () => {
      const userId = new Types.ObjectId();
      const movieId = new Types.ObjectId();

      const favorite = await Favorite.create({ userId, movieId });

      expect(favorite.userId.toString()).toHaveLength(24);
      expect(favorite.movieId.toString()).toHaveLength(24);
    });

    it('should handle empty note string', async () => {
      const favorite = await Favorite.create({
        userId: new Types.ObjectId(),
        movieId: new Types.ObjectId(),
        note: ''
      });

      expect(favorite.note).toBe('');
    });

    it('should handle note with special characters', async () => {
      const specialNote = 'Test with émojis 🎬 and spëcial çharacters!';
      const favorite = await Favorite.create({
        userId: new Types.ObjectId(),
        movieId: new Types.ObjectId(),
        note: specialNote
      });

      expect(favorite.note).toBe(specialNote);
    });

    it('should handle very large number of favorites for pagination', async () => {
      const userId = new Types.ObjectId();

      for (let i = 0; i < 100; i++) {
        await Favorite.create({ 
          userId, 
          movieId: new Types.ObjectId() 
        });
      }

      const result = await Favorite.findByUser(userId, { 
        page: 10, 
        limit: 10 
      });

      expect(result.favorites).toHaveLength(10);
      expect(result.page).toBe(10);
      expect(result.hasMore).toBe(false);
    });
  });
});
