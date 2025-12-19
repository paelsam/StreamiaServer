import mongoose, { Document, Schema, Types } from "mongoose";

export interface IFavorite extends Document {
  userId: Types.ObjectId;
  movieId: Types.ObjectId;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const favoriteSchema = new Schema<IFavorite>(
  {
    userId: { 
      type: Schema.Types.ObjectId, 
      required: [true, 'User ID is required'],
      index: true,
      ref: 'User'
    },
    movieId: { 
      type: Schema.Types.ObjectId, 
      required: [true, 'Movie ID is required'],
      index: true,
      ref: 'Movie'
    },
    note: { 
      type: String, 
      default: "",
      maxlength: [500, 'Note cannot exceed 500 characters'],
      trim: true
    }
  },
  { 
    timestamps: true,
    versionKey: false,
    collection: 'favorites'
  }
);

// Índice compuesto único para evitar duplicados
favoriteSchema.index({ userId: 1, movieId: 1 }, { 
  unique: true,
  name: 'user_movie_unique_idx'
});

// Índice para búsquedas por usuario con paginación ordenada
favoriteSchema.index({ userId: 1, createdAt: -1 }, {
  name: 'user_created_desc_idx'
});

// Índice para limpieza cuando se elimina una película
favoriteSchema.index({ movieId: 1 }, {
  name: 'movie_idx'
});

// Método de instancia: Convertir a JSON limpio
favoriteSchema.methods.toJSON = function() {
  const obj = this.toObject();
  obj.id = obj._id;
  delete obj._id;
  return obj;
};

// Métodos estáticos
favoriteSchema.statics.checkExists = async function(
  userId: string | Types.ObjectId, 
  movieId: string | Types.ObjectId
): Promise<boolean> {
  const count = await this.countDocuments({ 
    userId: new Types.ObjectId(userId), 
    movieId: new Types.ObjectId(movieId) 
  });
  return count > 0;
};

favoriteSchema.statics.findByUser = async function(
  userId: string | Types.ObjectId, 
  options: { 
    page?: number; 
    limit?: number; 
    sortBy?: string; 
    sortOrder?: 'asc' | 'desc';
  } = {}
) {
  const { 
    page = 1, 
    limit = 20, 
    sortBy = 'createdAt', 
    sortOrder = 'desc' 
  } = options;
  
  const skip = (page - 1) * limit;
  const userObjectId = new Types.ObjectId(userId);
  
  const [favorites, total] = await Promise.all([
    this.find({ userId: userObjectId })
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments({ userId: userObjectId })
  ]);
  
  return { 
    favorites, 
    total, 
    page, 
    limit, 
    totalPages: Math.ceil(total / limit),
    hasMore: page * limit < total
  };
};

favoriteSchema.statics.findByMovie = async function(
  movieId: string | Types.ObjectId
) {
  return this.find({ movieId: new Types.ObjectId(movieId) });
};

favoriteSchema.statics.deleteByUser = async function(
  userId: string | Types.ObjectId
): Promise<number> {
  const result = await this.deleteMany({ userId: new Types.ObjectId(userId) });
  return result.deletedCount || 0;
};

favoriteSchema.statics.deleteByMovie = async function(
  movieId: string | Types.ObjectId
): Promise<number> {
  const result = await this.deleteMany({ movieId: new Types.ObjectId(movieId) });
  return result.deletedCount || 0;
};

// Interface para métodos estáticos
interface FavoriteModel extends mongoose.Model<IFavorite> {
  checkExists(userId: string | Types.ObjectId, movieId: string | Types.ObjectId): Promise<boolean>;
  findByUser(
    userId: string | Types.ObjectId, 
    options?: { 
      page?: number; 
      limit?: number; 
      sortBy?: string; 
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{ 
    favorites: IFavorite[]; 
    total: number; 
    page: number; 
    limit: number; 
    totalPages: number;
    hasMore: boolean;
  }>;
  findByMovie(movieId: string | Types.ObjectId): Promise<IFavorite[]>;
  deleteByUser(userId: string | Types.ObjectId): Promise<number>;
  deleteByMovie(movieId: string | Types.ObjectId): Promise<number>;
}

const Favorite = mongoose.model<IFavorite, FavoriteModel>("Favorite", favoriteSchema);
export default Favorite;