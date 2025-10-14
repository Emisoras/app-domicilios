import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI || MONGODB_URI.includes('<usuario>') || MONGODB_URI.includes('<contraseña>')) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env with your actual username and password.\n' +
    'Por favor, define la variable de entorno MONGODB_URI en el archivo .env con tu usuario y contraseña reales.\n\n' +
    'Necesitarás obtener esta cadena de conexión desde tu cuenta de MongoDB Atlas.'
  );
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections from growing exponentially
 * during API Route usage.
 */
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      console.log('MongoDB connected successfully.');
      return mongoose;
    }).catch(err => {
      console.error('MongoDB connection error:', err.message);
      // Reset promise on error to allow retry
      cached.promise = null; 
      throw err;
    });
  }
  
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }
  
  return cached.conn;
}

export default connectDB;
